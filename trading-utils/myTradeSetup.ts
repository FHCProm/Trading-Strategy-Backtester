import { tradeSetup } from "../src/interfaces/MACDInterfaces";
import { Kline } from "../src/models/kline";

export class myTradeSetup{
    constructor(public klines:Kline[],public tradeTimestamps:number[],public rewardToRiskRatio){}

    public listTradesPrices = ():tradeSetup[] => {
        let tradeSetups = [];
        for (let x = 0; x < this.klines.length; x++) {
          for (let y = 0; y < this.tradeTimestamps.length; y++) {
            if (this.tradeTimestamps[y] == this.klines[x].timestamp) {
              //need to get the lowest price among 20 candles before this point
              let openPositionPrice = this.klines[x + 1].openEp;
              let stoplossPrice = this.klines[x].lowEp;
              let takeProfitPrice;
      
              for (let z = 20; z > 0; z--) {
                if (this.klines[x - z].lowEp < stoplossPrice) {
                  stoplossPrice = this.klines[x - z].lowEp;
                }
              }
      
              //based on the stoplossPrice, we calculate the takeProfit price with a ratio of 1.5 to 1
              takeProfitPrice =
                openPositionPrice + (openPositionPrice - stoplossPrice) * this.rewardToRiskRatio;
      
              let tradeSetup = {
                timestamp: this.klines[x].timestamp,
                openPosition: openPositionPrice,
                takeProfit: takeProfitPrice,
                stopLoss: stoplossPrice,
              };
              tradeSetups.push(tradeSetup);
            }
          }
        }
      
        return tradeSetups;
      };


}