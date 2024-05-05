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
    constructor() { }
    constructKlineRequest(symbol, endingTime, startingTime, resolution) {
        //elements of the axios request
        const path = "/exchange/public/md/kline";
        const query = `symbol=${symbol}&to=${endingTime}&from=${startingTime}&resolution=${resolution}`;
        const body = "";
        const expiry = (0, moment_1.default)().add(1, "m").format("X");
        let message = `${path}${query}${expiry}${body}`;
        const signature = crypto_js_1.default.HmacSHA256(message, process.env.API_SECRET);
        const base64Signature = crypto_js_1.default.enc.Base64.stringify(signature);
        const promise = axios_1.default.create({
            method: "get",
            url: `${path}?${query}`,
            baseURL: "https://api.phemex.com",
            timeout: 5000,
            headers: {
                "x-phemex-access-token": process.env.api_ID,
                "x-phemex-request-expiry": expiry,
                "x-phemex-request-signature": base64Signature,
            },
        });
        return promise;
    }
    async sendMultipleAxiosRequest(promiseList) {
        let concurrentRequestOutcome = {
            indexesThatSucceeded: [],
            serverDataList: [],
            rateLimitLeft: 100,
        };
        try {
            let promisesResult = await Promise.allSettled(promiseList);
            promisesResult.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.log(result.reason);
                    concurrentRequestOutcome.rateLimitLeft = 0;
                }
                else {
                    concurrentRequestOutcome.indexesThatSucceeded.push(index);
                    concurrentRequestOutcome.serverDataList.push(result.value.data);
                    if (result.value.headers["x-ratelimit-remaining-other"] < concurrentRequestOutcome.rateLimitLeft) {
                        concurrentRequestOutcome.rateLimitLeft = result.value.headers["x-ratelimit-remaining-other"];
                    }
                }
            });
        }
        catch (err) {
            fs.writeFile('error.log', err, (errWrite) => {
                if (errWrite) {
                    console.error('Error writing to file:', errWrite);
                }
                else {
                    console.log('Error written to file: error.log');
                }
            });
        }
        console.log("next 5 lines");
        return concurrentRequestOutcome;
    }
}
exports.Api_Manager = Api_Manager;
