import { Kline } from "../src/models/kline";

export class myEMA{
    constructor(public klines:Kline[],public EMALength:number){}

    public addEMA(){
        let sum = this.sumOfClosedPrice(this.klines, this.EMALength);
        let sma = sum / this.EMALength;
        //first 200 klines are without ema
        //kline 201(at index 200) only has a SMA,
        //only then EMA can be calculated for next klines
        this.klines[this.EMALength - 1].EMA200=sma;

      
      
        for (let x = this.EMALength; x < this.klines.length; x++) {
          let price = this.currentPriceSmoothing(this.klines[x].closeEp, 2, this.EMALength);
      
          let previousEMA = this.previousEMASmoothing(
            this.klines[x - 1].EMA200,
            2,
            this.EMALength
          );
          let total = price + previousEMA;
         
        
          
      
          this.klines[x].EMA200=Math.round(total);
        }
      
    }


    private sumOfClosedPrice = (array:Kline[], length:number):number => {
        let sum = 0;
        for (let y = 0; y < length; y++) {
          sum = sum + array[y].closeEp;
        }
        return sum;
      };

    private currentPriceSmoothing = (price:number, smoothing:number, days:number) =>
        price * (smoothing / (days + 1));
      

    private previousEMASmoothing = (EMAYesterday:number, smoothing:number, days:number) =>
        EMAYesterday * (1 - smoothing / (days + 1));
      


}