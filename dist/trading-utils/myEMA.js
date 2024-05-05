"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.myEMA = void 0;
class myEMA {
    constructor(klines, EMALength) {
        this.klines = klines;
        this.EMALength = EMALength;
        this.sumOfClosedPrice = (array, length) => {
            let sum = 0;
            for (let y = 0; y < length; y++) {
                sum = sum + array[y].closeEp;
            }
            return sum;
        };
        this.currentPriceSmoothing = (price, smoothing, days) => price * (smoothing / (days + 1));
        this.previousEMASmoothing = (EMAYesterday, smoothing, days) => EMAYesterday * (1 - smoothing / (days + 1));
    }
    addEMA() {
        let sum = this.sumOfClosedPrice(this.klines, this.EMALength);
        let sma = sum / this.EMALength;
        //first 200 klines are without ema
        //kline 201(at index 200) only has a SMA,
        //only then EMA can be calculated for next klines
        this.klines[this.EMALength - 1].EMA200 = sma;
        for (let x = this.EMALength; x < this.klines.length; x++) {
            let price = this.currentPriceSmoothing(this.klines[x].closeEp, 2, this.EMALength);
            let previousEMA = this.previousEMASmoothing(this.klines[x - 1].EMA200, 2, this.EMALength);
            let total = price + previousEMA;
            this.klines[x].EMA200 = Math.round(total);
        }
    }
}
exports.myEMA = myEMA;
