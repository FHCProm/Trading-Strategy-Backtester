"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Kline = void 0;
class Kline {
    constructor(timestamp, interval, lastCloseEp, openEp, highEp, lowEp, closeEp, volume, turnoverEv) {
        this.timestamp = timestamp;
        this.interval = interval;
        this.lastCloseEp = lastCloseEp;
        this.openEp = openEp;
        this.highEp = highEp;
        this.lowEp = lowEp;
        this.closeEp = closeEp;
        this.volume = volume;
        this.turnoverEv = turnoverEv;
    }
}
exports.Kline = Kline;
