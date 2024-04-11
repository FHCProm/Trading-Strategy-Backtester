import { MACD } from "technicalindicators";
import moment from "moment";

export const MACD_backtest = (kline) => {
  addingEMA(kline, 200, 6);
  addingMACD(kline, 12, 26, 9);
  getPossibleTradePoints(kline);
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
        if (MACDTrend === "downtrend" && EMATrend === "uptrend") {
          crossoverPointTimestamp.push(kline[x][0]);
        }
        MACDTrend = "uptrend";
      }
      if (MACD_line < signal) {
        MACDTrend = "downtrend";
      }
      console.log(
        moment.unix(kline[x][0]).format("MMMM Do YYYY, h:mm:ss A"),
        EMATrend,
        MACDTrend
      );
    }
  }

  console.log(crossoverPointTimestamp);
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
