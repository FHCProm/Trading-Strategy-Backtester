import moment from "moment";
import cryptoJs from "crypto-js";
import axios from "axios";
import { AxiosResponse } from "axios";
import { Api_Response, klineRequestDetails } from "../interfaces/MACDInterfaces";

const fs = require('fs');
export class Api_Manager{
    private instance;
    constructor(){
        this.instance=axios.create({
            baseURL: "https://api.phemex.com",
            timeout: 5000,
        })
    }

    public async getKline(klineDetails:klineRequestDetails):Promise<Api_Response>{
        let api_response:Api_Response;

        const path = "/exchange/public/md/kline";
        const query = `symbol=${klineDetails.symbol}&to=${klineDetails.to}&from=${klineDetails.from}&resolution=${klineDetails.resolution}`;
        const body = "";
        
        const expiry = moment().add(1, "m").format("X");
        let message = `${path}${query}${expiry}${body}`;
        const signature = cryptoJs.HmacSHA256(message, process.env.API_SECRET);
        const base64Signature = cryptoJs.enc.Base64.stringify(signature);

     
        try{
            const response= await this.instance.get(path,{
                params:{
                    symbol:klineDetails.symbol,
                    to:klineDetails.to,
                    from:klineDetails.from,
                    resolution:klineDetails.resolution
                },
                headers:{
                    "x-phemex-access-token":process.env.api_ID,
                    "x-phemex-request-expiry":expiry,
                    "x-phemex-request-signature": base64Signature,
                }
            })
      
            api_response={
                status:response.status,
                data:response.data.data.rows,
                "x-ratelimit-remaining-other":response.headers["x-ratelimit-remaining-other"]
            }
        
        }catch(e){
            if (e.response) {
                // The request was made and the server responded with a status code
               
               api_response={
                status:e.response.status,
                data:e.response.data,
                error:e.response.statusText,
                "x-ratelimit-remaining-other":e.response.headers["x-ratelimit-remaining-other"]
               }

              } else if (e.request) {
                // The request was made but no response was received
                // `e.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                console.log(e.request);
                api_response={
                    status:e.request,
                    error:e.request
                }
              } else {
                // Something happened in setting up the request that triggered an e
                console.log('e', e.message);
                api_response={
                    status:"no response",
                    error:e.message
                }
              }
        }

        return api_response;
    }

    
    public async verifyRemainingRateLimit(phemexRequestVariable:number):Promise<Boolean>{
        if (phemexRequestVariable < 10) {
            let waitTime = 60000;
            // let currentSecond = moment().diff(moment().startOf("minute"));
            // let waitTime = (61 - parseInt(moment(currentSecond).format("s"))) * 1000;
            console.log(`sleeping for ${waitTime/1000}s`);
            await this.sleep(waitTime);
            return true;
        }
        return false;
    };

    private sleep(ms){
        return new Promise((resolve) => setTimeout(resolve, ms));
    }



}
