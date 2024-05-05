"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tradeBacktest = void 0;
const moment_1 = __importDefault(require("moment"));
class tradeBacktest {
    constructor(klines, tradeSetups) {
        this.klines = klines;
        this.tradeSetups = tradeSetups;
        this.winNumber = 0;
        this.loseNumber = 0;
        this.winstreak = 0;
        this.losestreak = 0;
        this.highestWinStreak = 0;
        this.highestLoseStreak = 0;
        this.recordResult = (result, previousResult) => {
            if (result == "win") {
                this.winNumber++;
            }
            if (result == "lose") {
                this.loseNumber++;
            }
            if (result !== previousResult) {
                this.winstreak = 0;
                this.losestreak = 0;
            }
            if (result == previousResult && previousResult == "win") {
                this.winstreak++;
            }
            if (result == previousResult && previousResult == "lose") {
                this.losestreak++;
            }
            if (this.winstreak > this.highestWinStreak) {
                this.highestWinStreak = this.winstreak;
            }
            if (this.losestreak > this.highestLoseStreak) {
                this.highestLoseStreak = this.losestreak;
            }
            this.winrate = ((this.winNumber / (this.winNumber + this.loseNumber)) * 100).toFixed(2);
            return {
                winNumber: this.winNumber,
                loseNumber: this.loseNumber,
                highestWinStreak: this.highestWinStreak,
                highestLoseStreak: this.highestLoseStreak,
                winrate: this.winrate,
            };
        };
    }
    determineResult() {
        let tradeSetupIndex = 0;
        let inPosition = false;
        let currentTradePoints;
        let previousResult;
        let accumulatedResult;
        let initialInvestmentValue = 10000;
        let finalInvestmentValue = initialInvestmentValue;
        for (let x = 0; x < this.klines.length && tradeSetupIndex < this.tradeSetups.length; x++) {
            //check if tradeSetup is valid depening on the time of current this.klines
            while (this.tradeSetups[tradeSetupIndex].timestamp < this.klines[x].timestamp) {
                if (tradeSetupIndex >= this.tradeSetups.length - 1) {
                    break;
                }
                tradeSetupIndex++;
            }
            //if timestamp of tradesetup equals to the timestamp of this.klines
            if (this.tradeSetups[tradeSetupIndex].timestamp == this.klines[x].timestamp &&
                inPosition == false) {
                //opening a position
                currentTradePoints = this.tradeSetups[tradeSetupIndex];
                inPosition = true;
                console.log(`------------------------------------------------------------------------------
        
                opened a BTC position at ${moment_1.default
                    .unix(currentTradePoints.timestamp)
                    .format("MMMM Do YYYY, h:mm:ss A")}
                      
                position=${currentTradePoints.openPosition / 10000},takeProfit=${currentTradePoints.takeProfit / 10000},stopLoss=${currentTradePoints.stopLoss / 10000} 
                
                `);
            }
            //wait until the trade hits the profit or stoploss
            //we will only run through the this.kliness once
            if (inPosition == true) {
                if (currentTradePoints.takeProfit <= this.klines[x].highEp) {
                    //here we will announce the win result
                    console.log(`     #took profit at ${moment_1.default
                        .unix(this.klines[x].timestamp)
                        .format("dddd, MMMM Do YYYY, h:mm:ss a")}`);
                    let profitPercentage = (currentTradePoints.takeProfit -
                        currentTradePoints.openPosition) /
                        currentTradePoints.openPosition;
                    finalInvestmentValue =
                        finalInvestmentValue +
                            (finalInvestmentValue * profitPercentage) / 100;
                    accumulatedResult = this.recordResult("win", previousResult);
                    previousResult = "win";
                    tradeSetupIndex++;
                    inPosition = false;
                }
                if (currentTradePoints.stopLoss >= this.klines[x].lowEp) {
                    //here we will announce the loss result
                    console.log(`     #stopped loss at ${moment_1.default
                        .unix(this.klines[x].timestamp)
                        .format("dddd, MMMM Do YYYY, h:mm:ss a")}`);
                    let lossPercentage = (currentTradePoints.openPosition -
                        currentTradePoints.stopLoss) /
                        currentTradePoints.openPosition;
                    finalInvestmentValue =
                        finalInvestmentValue - (finalInvestmentValue * lossPercentage) / 100;
                    accumulatedResult = this.recordResult("lose", previousResult);
                    previousResult = "lose";
                    tradeSetupIndex++;
                    inPosition = false;
                }
            }
        }
        console.log(`Total win :${accumulatedResult?.winNumber}|||Total lose:${accumulatedResult?.loseNumber}|||WinStreak:${accumulatedResult?.highestWinStreak}|||LoseStreak:${accumulatedResult?.highestLoseStreak}|||winrate:${accumulatedResult?.winrate}%
            Initial Investment Value=${10000}|||Final Investment Value=${Math.round(finalInvestmentValue)}`);
    }
}
exports.tradeBacktest = tradeBacktest;
