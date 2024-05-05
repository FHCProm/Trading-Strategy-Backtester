

import moment from "moment";

import { Api_Manager } from "./src/models/api_manager";
import { Kline } from "./src/models/kline";
import dotenv from "dotenv";
import { Api_Response, klineRequestDetails } from "./src/interfaces/MACDInterfaces";
import { myMACD } from "./trading-utils/myMACD";
import { myTradeSetup } from "./trading-utils/myTradeSetup";
import { tradeBacktest } from "./trading-utils/myWinORLose";


dotenv.config();


async function fetchListOfKlines({ symbol, resolution, totalBarToFetch }) {
    ///exchange/public/md/kline?symbol=BTCUSD&to=<to>&from=<from>&resolution=<resolution>
  
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
  
    let requestDetails:klineRequestDetails[]=[];
  
    //identify the time range that need to be fetched

    for (let x = startingTime; x < currentTime; ) {
      let from = x;
      let to = moment(x, "X")
        .add(phemexDataRequestLimitPerCall * resolution, "seconds")
        .format("X");

      if (to >= currentTime) {
        to = currentTime;
      }
  
      requestDetails.push({symbol,to,from,resolution});
   
      x = to;
    }
  
    let unsortedKlines = await getKlines(requestDetails);
   
    return unsortedKlines;
  }

  
async function getKlines(klineDetails:klineRequestDetails[]):Promise<Kline[]> {
  const api_manager=new Api_Manager();
  let unsortedKlines:Kline[] = [];
  let response:Api_Response;
  let i=0;
    while(i<klineDetails.length){
      response=await api_manager.getKline(klineDetails[i]);
      if(response.status=="200"){
        response.data.forEach(data=>{
          unsortedKlines.push(new Kline
            (data[0],
                data[1],
                data[2],
                data[3],
                data[4],
                data[5],
                data[6],
                data[7],
                data[8]));
          });
          i++;
      }else{
        console.log(response);
      }
      await api_manager.verifyRemainingRateLimit(response["x-ratelimit-remaining-other"]);
    
    }

     return unsortedKlines;
}


function sortKlines(klines:Kline[]):Kline[]{
  let sortedKlines = klines.sort((a,b) => {
    return a.timestamp - b.timestamp;
  });
  //check if there is duplication and if sorted correctly
  for(let x=0;x<klines.length-1;x++){
    if(klines[x].timestamp==klines[x+1].timestamp){
      throw new Error("your timestamp is duplicated");
    }
    if(klines[x].timestamp>klines[x+1].timestamp){
      throw new Error(
        "your data is not arranged according to the right date sequence"
      );
    }
  }

  return sortedKlines;
}


async function backtester() {
  let totalBars = 50000;
  let symbol = "BTCUSD";

  const unsortedKlines = await fetchListOfKlines({
    symbol: symbol,
    resolution: 900,
    totalBarToFetch: totalBars,
  });

  let sortedKlines=sortKlines(unsortedKlines);
  let tradePoints=new myMACD(sortedKlines,12,26,9).getMACDTradePoints();
  let tradeSetups=new myTradeSetup(sortedKlines,tradePoints,1.5).listTradesPrices();
  new tradeBacktest(sortedKlines,tradeSetups).determineResult();

 
  //MACD_backtest(testerKlines);
  // console.table(testerKlines);
  // console.log(testerKlines[495][10]);
}

backtester();
