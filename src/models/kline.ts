export class Kline{

    public EMA200:number;
    public MACD:{MACD:number,signal:number,histogram:number};

    constructor(
        public timestamp:number,
        public interval:number,
        public lastCloseEp:number,
        public openEp:number,
        public highEp:number,
        public lowEp:number,
        public closeEp:number,
        public volume:number,
        public turnoverEv:number){
    }

   

    
}


