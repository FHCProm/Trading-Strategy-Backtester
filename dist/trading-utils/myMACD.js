"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.myMACD = void 0;
const technicalindicators_1 = require("technicalindicators");
const myEMA_1 = require("./myEMA");
class myMACD {
    //common value is (12,26,9) for fast,slow and signal
    constructor(klines, fastLine, slowLine, signal) {
        this.klines = klines;
        this.fastLine = fastLine;
        this.slowLine = slowLine;
        this.signal = signal;
        this.separateSpecificPriceFromKlines = (klines) => {
            let specificPriceArray = [];
            for (let x = 0; x < klines.length; x++) {
                let correctedNumbers = this.roundUp(klines[x].closeEp);
                specificPriceArray.push(correctedNumbers);
            }
            return specificPriceArray;
        };
        this.roundUp = (number) => Math.round(number / 1000) / 10;
    }
    addMACD() {
        let closedPrices = this.separateSpecificPriceFromKlines(this.klines);
        let macdInput = {
            values: closedPrices,
            fastPeriod: this.fastLine,
            slowPeriod: this.slowLine,
            signalPeriod: this.signal,
            SimpleMAOscillator: false,
            SimpleMASignal: false,
        };
        let MACDs = technicalindicators_1.MACD.calculate(macdInput);
        let y = 0;
        for (let x = 0; x < this.klines.length; x++) {
            if (x >= this.slowLine - 1) {
                this.klines[x].MACD = {
                    signal: MACDs[y].signal,
                    histogram: MACDs[y].histogram,
                    MACD: MACDs[y].MACD
                };
                y++;
            }
        }
    }
    getMACDTradePoints() {
        new myEMA_1.myEMA(this.klines, 200).addEMA();
        this.addMACD();
        let crossoverPointTimestamp = [];
        let EMATrend;
        let MACDTrend;
        for (let x = 0; x < this.klines.length; x++) {
            let MACD_line = this.klines[x].MACD?.MACD;
            let signal = this.klines[x].MACD?.signal;
            if (this.klines[x].EMA200) {
                //identify EMA current trend
                if (this.klines[x].closeEp > this.klines[x].EMA200) {
                    EMATrend = "uptrend";
                }
                if (this.klines[x].closeEp < this.klines[x].EMA200) {
                    EMATrend = "downtrend";
                }
                //identify MACD current trend
                if (MACD_line > signal) {
                    //identify MACD crossover point
                    if (MACDTrend === "downtrend" && EMATrend === "uptrend" && signal < 0) {
                        crossoverPointTimestamp.push(this.klines[x].timestamp);
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
    }
}
exports.myMACD = myMACD;
