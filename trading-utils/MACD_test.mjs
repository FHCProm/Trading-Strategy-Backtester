import { MACD, lowest } from "technicalindicators";
import moment from "moment";

export const MACD_backtest = (kline) => {
  addingEMA(kline, 200, 6);
  addingMACD(kline, 12, 26, 9);
  let tradeTimestamps = getPossibleTradePoints(kline);
  let tradeSetups = listTradesPrices(kline, tradeTimestamps);
  //console.log(tradeSetups);
  backtestTradeSetups(kline, tradeSetups);
};

const addingEMA = (klines, length, indexPosition) => {
  let positionForNewEMAData = klines[0].length;

  let sum = sumOfNumbers(klines, length, indexPosition);
  let sma = sum / length;
  //first 200 klines are without ema
  //kline 201(at index 200) only has a SMA,
  //only then EMA can be calculated for next klines
  klines[length - 1].push(sma);

  for (let x = 0; x < length - 1; x++) {
    klines[x].push("undefined");
  }

  for (let x = length; x < klines.length; x++) {
    let price = currentPriceSmoothing(klines[x][indexPosition], 2, length);

    let previousEMA = previousEMASmoothing(
      klines[x - 1][positionForNewEMAData],
      2,
      length
    );
    let total = price + previousEMA;

    klines[x].push(Math.round(total));
  }
};

const addingMACD = (klines, fast, slow, signal) => {
  let closedPrice = separateSpecificPriceFromKlines(klines, 6);

  var macdInput = {
    values: closedPrice,
    fastPeriod: fast,
    slowPeriod: slow,
    signalPeriod: signal,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  };
  let calculated = MACD.calculate(macdInput);
  let y = 0;
  for (let x = 0; x < klines.length; x++) {
    if (x >= slow - 1) {
      klines[x].push(calculated[y]);
      y++;
    } else {
      klines[x].push("undefined");
    }
  }
};

const getPossibleTradePoints = (kline) => {
  let crossoverPointTimestamp = [];
  let EMATrend;
  let MACDTrend;

  for (let x = 0; x < kline.length; x++) {
    let MACD_line = kline[x][10]["MACD"];
    let signal = kline[x][10]["signal"];

    if (kline[x][9] != "undefined") {
      //identify EMA current trend
      if (kline[x][6] > kline[x][9]) {
        EMATrend = "uptrend";
      }
      if (kline[x][6] < kline[x][9]) {
        EMATrend = "downtrend";
      }

      //identify MACD current trend
      if (MACD_line > signal) {
        //identify MACD crossover point
        if (MACDTrend === "downtrend" && EMATrend === "uptrend" && signal < 0) {
          crossoverPointTimestamp.push(kline[x][0]);
        }
        MACDTrend = "uptrend";
      }
      if (MACD_line < signal) {
        MACDTrend = "downtrend";
      }
      // console.log(
      //   moment.unix(kline[x][0]).format("MMMM Do YYYY, h:mm:ss A"),
      //   EMATrend,
      //   MACDTrend
      // );
    }
  }

  return crossoverPointTimestamp;
};

const listTradesPrices = (kline, tradeTimestamps) => {
  let tradeSetups = [];
  for (let x = 0; x < kline.length; x++) {
    for (let y = 0; y < tradeTimestamps.length; y++) {
      if (tradeTimestamps[y] == kline[x][0]) {
        //need to get the lowest price among 20 candles before this point
        let openPositionPrice = kline[x + 1][3];
        let stoplossPrice = kline[x][5];
        let takeProfitPrice;

        for (let z = 20; z > 0; z--) {
          if (kline[x - z][5] < stoplossPrice) {
            stoplossPrice = kline[x - z][5];
          }
        }

        //based on the stoplossPrice, we calculate the takeProfit price with a ratio of 1.5 to 1
        takeProfitPrice =
          openPositionPrice + (openPositionPrice - stoplossPrice) * 1.5;

        let tradeSetup = {
          timestamp: kline[x][0],
          openPosition: kline[x + 1][3],
          takeProfit: takeProfitPrice,
          stopLoss: stoplossPrice,
        };
        tradeSetups.push(tradeSetup);
      }
    }
  }

  return tradeSetups;
};

const backtestTradeSetups = (kline, tradeSetups) => {
  let tradeSetupIndex = 0;
  let inPosition = false;
  let currentTradePoints;
  let previousResult;
  let accumulatedResult;
  for (
    let x = 0;
    x < kline.length && tradeSetupIndex < tradeSetups.length;
    x++
  ) {
    //check if tradeSetup is valid depening on the time of current kline

    while (
      parseInt(tradeSetups[tradeSetupIndex]["timestamp"]) <
      parseInt(kline[x][0])
    ) {
      if (tradeSetupIndex >= tradeSetups.length - 1) {
        break;
      }
      tradeSetupIndex++;
    }

    //if timestamp of tradesetup equals to the timestamp of kline

    if (
      tradeSetups[tradeSetupIndex]["timestamp"] == kline[x][0] &&
      inPosition == false
    ) {
      //opening a position
      currentTradePoints = tradeSetups[tradeSetupIndex];
      inPosition = true;
      console.log(
        `------------------------------------------------------------------------------
          opened a position at ${moment
            .unix(currentTradePoints["timestamp"])
            .format("MMMM Do YYYY, h:mm:ss A")}
              
                position=${
                  currentTradePoints["openPosition"] / 10000
                },takeProfit=${
          currentTradePoints["takeProfit"] / 10000
        },stopLoss=${currentTradePoints["stopLoss"] / 10000}  

          `
      );
    }

    //wait until the trade hits the profit or stoploss
    //we will only run through the klines once
    if (inPosition == true) {
      if (currentTradePoints["takeProfit"] <= kline[x][4]) {
        //here we will announce the win result
        console.log(
          `******************************************************************************
            took profit at ${moment
              .unix(kline[x][0])
              .format("dddd, MMMM Do YYYY, h:mm:ss a")}
          
            `
        );
        accumulatedResult = recordResult("win", previousResult);
        previousResult = "win";
        tradeSetupIndex++;
        inPosition = false;
      }
      if (currentTradePoints["stopLoss"] >= kline[x][5]) {
        //here we will announce the loss result
        console.log(
          `****************************************************************************
            stopped loss at ${moment
              .unix(kline[x][0])
              .format("dddd, MMMM Do YYYY, h:mm:ss a")}
           `
        );
        accumulatedResult = recordResult("lose", previousResult);
        previousResult = "lose";
        tradeSetupIndex++;
        inPosition = false;
      }
    }
  }

  console.log(
    `Total win :${accumulatedResult?.winNumber}|||Total lose:${accumulatedResult?.loseNumber}|||WinStreak:${accumulatedResult?.highestWinStreak}|||LoseStreak:${accumulatedResult?.highestLoseStreak}|||winrate:${accumulatedResult?.winrate}%`
  );
};

let winNumber = 0;
let loseNumber = 0;
let winstreak = 0;
let losestreak = 0;
let highestWinStreak = 0;
let highestLoseStreak = 0;
let winrate;
const recordResult = (result, previousResult) => {
  if (result == "win") {
    winNumber++;
  }
  if (result == "lose") {
    loseNumber++;
  }
  if (result !== previousResult) {
    winstreak = 0;
    losestreak = 0;
  }
  if (result == previousResult && previousResult == "win") {
    winstreak++;
  }
  if (result == previousResult && previousResult == "lose") {
    losestreak++;
  }
  if (winstreak > highestWinStreak) {
    highestWinStreak = winstreak;
  }
  if (losestreak > highestLoseStreak) {
    highestLoseStreak = losestreak;
  }
  winrate = ((winNumber / (winNumber + loseNumber)) * 100).toFixed(2);

  return {
    winNumber: winNumber,
    loseNumber: loseNumber,
    highestWinStreak: highestWinStreak,
    highestLoseStreak: highestLoseStreak,
    winrate: winrate,
  };
};

const sumOfNumbers = (array, length, indexPosition) => {
  let sum = 0;
  for (let y = 0; y < length; y++) {
    sum = sum + array[y][indexPosition];
  }
  return sum;
};

const currentPriceSmoothing = (price, smoothing, days) =>
  price * (smoothing / (days + 1));

const previousEMASmoothing = (EMAYesterday, smoothing, days) =>
  EMAYesterday * (1 - smoothing / (days + 1));

const separateSpecificPriceFromKlines = (klines, indexPosition) => {
  let specificPriceArray = [];
  for (let x = 0; x < klines.length; x++) {
    let correctedNumbers = roundUp(klines[x][indexPosition]);
    specificPriceArray.push(correctedNumbers);
  }
  return specificPriceArray;
};

const roundUp = (number) => Math.round(number / 1000) / 10;
