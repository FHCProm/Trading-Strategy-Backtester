export interface Api_Response {
    status: string;
    data?: any;
    error?:string
    "x-ratelimit-remaining-other"?:number
}

export interface klineRequestDetails{
    symbol:string;
    to:string;
    from:string;
    resolution:string;
}
export interface tradeSetup{
    timestamp: number,
    openPosition: number,
    takeProfit: number,
    stopLoss: number,
}

export interface tradeResult{
    winNumber: number,
    loseNumber: number,
    highestWinStreak: number,
    highestLoseStreak: number,
    winrate: number,
}