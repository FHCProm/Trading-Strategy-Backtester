"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Api_Manager = void 0;
const moment_1 = __importDefault(require("moment"));
const crypto_js_1 = __importDefault(require("crypto-js"));
const axios_1 = __importDefault(require("axios"));
const fs = require('fs');
class Api_Manager {
    constructor() {
        this.instance = axios_1.default.create({
            baseURL: "https://api.phemex.com",
            timeout: 5000,
        });
    }
    async getKline(klineDetails) {
        let api_response;
        const path = "/exchange/public/md/kline";
        const query = `symbol=${klineDetails.symbol}&to=${klineDetails.to}&from=${klineDetails.from}&resolution=${klineDetails.resolution}`;
        const body = "";
        const expiry = (0, moment_1.default)().add(1, "m").format("X");
        let message = `${path}${query}${expiry}${body}`;
        const signature = crypto_js_1.default.HmacSHA256(message, process.env.API_SECRET);
        const base64Signature = crypto_js_1.default.enc.Base64.stringify(signature);
        try {
            const response = await this.instance.get(path, {
                params: {
                    symbol: klineDetails.symbol,
                    to: klineDetails.to,
                    from: klineDetails.from,
                    resolution: klineDetails.resolution
                },
                headers: {
                    "x-phemex-access-token": process.env.api_ID,
                    "x-phemex-request-expiry": expiry,
                    "x-phemex-request-signature": base64Signature,
                }
            });
            api_response = {
                status: response.status,
                data: response.data.data.rows,
                "x-ratelimit-remaining-other": response.headers["x-ratelimit-remaining-other"]
            };
        }
        catch (e) {
            if (e.response) {
                // The request was made and the server responded with a status code
                api_response = {
                    status: e.response.status,
                    data: e.response.data,
                    error: e.response.statusText,
                    "x-ratelimit-remaining-other": e.response.headers["x-ratelimit-remaining-other"]
                };
            }
            else if (e.request) {
                // The request was made but no response was received
                // `e.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                console.log(e.request);
                api_response = {
                    status: e.request,
                    error: e.request
                };
            }
            else {
                // Something happened in setting up the request that triggered an e
                console.log('e', e.message);
                api_response = {
                    status: "no response",
                    error: e.message
                };
            }
        }
        return api_response;
    }
    async verifyRemainingRateLimit(phemexRequestVariable) {
        if (phemexRequestVariable < 10) {
            let waitTime = 60000;
            // let currentSecond = moment().diff(moment().startOf("minute"));
            // let waitTime = (61 - parseInt(moment(currentSecond).format("s"))) * 1000;
            console.log(`sleeping for ${waitTime / 1000}s`);
            await this.sleep(waitTime);
            return true;
        }
        return false;
    }
    ;
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.Api_Manager = Api_Manager;
