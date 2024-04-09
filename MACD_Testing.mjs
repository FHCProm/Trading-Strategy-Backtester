import moment from "moment";
import cryptoJs from "crypto-js";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const api_secret = process.env.API_SECRET;
const api_ID = process.env.API_ID;

let otherRateLimit = 100;
let testerKlines = [];

async function fetchListOfKlines({ symbol, resolution, totalBarToFetch }) {
  //   /exchange/public/md/kline?symbol=BTCUSD&to=<to>&from=<from>&resolution=<resolution>

  //const symbol = "BTCUSD";

  //resolution determines if u want 5 min char, 10 min chart, or more
  //const resolution = 300;

  //const totalBarToFetch = 100000;
  //1 bar = 5min

  //assumption : phemex can fetch 1200 record per time
  // 1 record = 5 min
  // 1200 record = 6000min

  const phemexDataRequestLimitPerCall = 1200;

  const startingTime = moment()
    .subtract(totalBarToFetch * resolution, "seconds")
    .format("X");
  const currentTime = moment().format("X");

  let sequence = 0;
  let toBeConvertedToAxios = [];

  for (let x = startingTime; x < currentTime; ) {
    let from = x;
    let to = moment(x, "X")
      .add(phemexDataRequestLimitPerCall * resolution, "seconds")
      .format("X");
    if (to >= currentTime) {
      to = currentTime;
    }

    const path = "/exchange/public/md/kline";
    const query = `symbol=${symbol}&to=${to}&from=${from}&resolution=${resolution}`;
    const body = "";

    toBeConvertedToAxios.push({
      path: path,
      query: query,
      body: "",
      phemexRequestType: "Others",
      sequence: sequence,
    });
    sequence++;
    x = to;
  }

  let unsortedKlines = await multipleAxiosRequest(toBeConvertedToAxios);

  let sortedKlines = SortingKlinesAndCalculateEMA(unsortedKlines);
  return sortedKlines;
}

async function modifyAxiosInstance({ path, query, body }) {
  // let axiosHttpPreset = axios.create({
  //     baseURL: "https://api.phemex.com",
  //     timeout: 5000,
  //     headers: {
  //         "x-phemex-access-token": api_ID,
  //     },
  // });

  const expiry = moment().add(1, "m").format("X");
  let message = `${path}${query}${expiry}${body}`;
  const signature = cryptoJs.HmacSHA256(message, api_secret);
  const base64Signature = cryptoJs.enc.Base64.stringify(signature);

  // axiosHttpPreset.defaults.headers["x-phemex-request-expiry"] = expiry;
  // axiosHttpPreset.defaults.headers["x-phemex-request-signature"] =
  //     base64Signature;

  const promise = axios({
    method: "get",
    url: `${path}?${query}`,
    baseURL: "https://api.phemex.com",
    timeout: 5000,
    headers: {
      "x-phemex-access-token": api_ID,
      "x-phemex-request-expiry": expiry,
      "x-phemex-request-signature": base64Signature,
    },
  });

  return promise;
}

async function multipleAxiosRequest(requestArray) {
  //after separated 5 arrays

  let array3 = [];
  let retryList = [];
  let unsortedKlines = [];
  for (let x = 0; x < requestArray.length; x++) {
    if (await verifyRemainingRateLimit(otherRateLimit)) {
      otherRateLimit = 100;
    }
    array3.push(requestArray[x]);
    if (array3.length == 5 || x == requestArray.length - 1) {
      let promiseList = [];
      promiseList = array3.map((x) => {
        return modifyAxiosInstance({
          path: x.path,
          query: x.query,
          body: x.body,
        });
      });

      let smallestRateLimit = 100;
      const promiseAllResult = await Promise.allSettled(promiseList);
      promiseAllResult.forEach((result, index) => {
        if (result.status == "rejected") {
          otherRateLimit--;
          console.log(result.reason.code);
          retryList.push(array3[index]);
        } else {
          unsortedKlines.push([
            array3[index].sequence,
            result.value.data.data.rows,
          ]);
          if (
            smallestRateLimit > result.value.headers["x-ratelimit-remaining"]
          ) {
            smallestRateLimit = result.value.headers["x-ratelimit-remaining"];
          }
          otherRateLimit = smallestRateLimit;
        }
      });

      //let retryListClone = Object.values(retryList);
      while (retryList.length != 0) {
        console.log(retryList);
        if (await verifyRemainingRateLimit(otherRateLimit)) {
          otherRateLimit = 100;
        }
        let promiseList = [];
        promiseList = retryList.map((x) => {
          return modifyAxiosInstance({
            path: x.path,
            query: x.query,
            body: x.body,
          });
        });

        let smallestRateLimit = 100;
        const promiseAllResult = await Promise.allSettled(promiseList);
        let removedIndex = [];
        promiseAllResult.forEach((result, index) => {
          if (result.status == "rejected") {
            otherRateLimit--;
            console.log(result.reason.code);
          } else {
            unsortedKlines.push([
              retryList[index].sequence,
              result.value.data.data.rows,
            ]);
            if (
              smallestRateLimit > result.value.headers["x-ratelimit-remaining"]
            ) {
              smallestRateLimit = result.value.headers["x-ratelimit-remaining"];
            }
            otherRateLimit = smallestRateLimit;
            removedIndex.push(index);
          }
        });
        let retryListClone = [...retryList];
        retryList = [];
        for (let x = 0; x < retryListClone.length; x++) {
          let numberThatShouldBeRemoved = false;
          removedIndex.forEach((y) => {
            if (y == x) {
              numberThatShouldBeRemoved = true;
            }
          });
          if (!numberThatShouldBeRemoved) {
            retryList.push(retryListClone[x]);
          }
        }
      }
      array3 = [];
    }
  }

  return unsortedKlines;
}

export const verifyRemainingRateLimit = async (phemexRequestVariable) => {
  if (phemexRequestVariable < 10) {
    let currentSecond = moment() - moment().startOf("minute");
    let waitTime = (61 - moment(currentSecond).format("s")) * 1000;
    console.log(`sleeping for ${waitTime}`);
    await sleep(waitTime);
    return true;
  }
  return false;
};

async function SortingKlinesAndCalculateEMA(unsortedKlines) {
  let sortedKlines = [];

  unsortedKlines.sort(function (a, b) {
    return a[0] - b[0];
  });
  for (let x = 0; x < unsortedKlines.length; x++) {
    sortedKlines = [...sortedKlines, ...unsortedKlines[x][1]];
  }

  for (let y = 0; y < sortedKlines.length; y++) {
    let bigger_number = 0;
    bigger_number = y + 1;
    if (y != sortedKlines.length - 1) {
      if (sortedKlines[y][0] > sortedKlines[bigger_number][0]) {
        throw new Error(
          "your data is not arranged according to the right date sequence"
        );
      }
      if (sortedKlines[y][0] == sortedKlines[bigger_number][0]) {
        throw new Error("your timestamp is duplicated");
      }
    }
  }

  return sortedKlines;
}

let sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function backtester() {
  let total1Min = 100;
  let symbol = "BTCUSD";

  testerKlines = await fetchListOfKlines({
    symbol: symbol,
    resolution: 300,
    totalBarToFetch: total1Min,
  });

  console.log(testerKlines);
}

backtester();
