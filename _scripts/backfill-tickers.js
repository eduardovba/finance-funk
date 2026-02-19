#!/usr/bin/env node
/**
 * One-time migration: backfill `ticker` field on every equity transaction
 * using the ASSET_TICKER_MAP from EquityTab.js
 */
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../src/data/equity_transactions.json');
const transactions = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));

const ASSET_TICKER_MAP = {
    'Equity': null, 'Cash': null,
    'T2I': 'TTWO', 'Microstrategy': 'MSTR', 'MicroStrategy': 'MSTR',
    'COPG': 'COPG.L', 'GS': 'GILD', 'Amazon': 'AMZN',
    'TWLO': 'TWLO', 'AEM': 'AEM', 'GE': 'GE',
    'SCHW': 'SCHW', 'RDDT': 'RDDT', 'Fiserv': 'FISV',
    'Entergy': 'ETR', 'Alphabet': 'GOOG', 'Arista Networks': 'ANET',
    'Tesla': 'TSLA', 'WPM': 'WPM', 'Talen Energy': 'TLN',
    'Sony': 'SONY', 'AFRM': 'AFRM', 'WIX': 'WIX',
    'GEV': 'GEV', 'HES': 'HES', 'NGVC': 'NGVC',
    'iShares BioTech': 'IBB', 'Lemonade': 'LMND', 'TPB': 'TPB',
    'HM': 'HBM', 'Natera': 'NTRA', 'JD': 'JD',
    'DoorDash': 'DASH', 'ADMA': 'ADMA', 'MWP': 'MWA',
    'USA': 'UAMY', 'SFM': 'SFM', 'CostCo': 'COST',
    'NRG': 'NRG', 'Spotify': 'SPOT', 'PR': 'PPTA',
    'ABL': 'ABT', 'IHS': 'IHS', 'Corteva': 'CTVA',
    'Xpeng': 'XPEV', 'IBM': 'IBM', 'Coco': 'COCO',
    'LBC': 'LB', 'JF': 'JXN', 'RMBS': 'RMBS',
    'Uber': 'UBER', 'PHM': 'PHM', 'ORLA': 'ORLA',
    'SGLN': 'SGLN', 'CC': 'COKE', 'ACM': 'ACMR',
    'ASML': 'ASML', 'ZS': 'ZS', 'NVIDIA': 'NVDA',
    'EMCOR': 'EME', 'SMC': 'SMCI', 'NYT': 'NYT',
    'Roku': 'ROKU',
    'Shares': 'AMZN',
    'BOVA11': 'BOVA11.SA', 'GGBR4': 'GGBR4.SA', 'VALE3': 'VALE3.SA',
    'BBAS3': 'BBAS3.SA', 'AURE3': 'AURE3.SA', 'EGIE3': 'EGIE3.SA',
    'CMIG4': 'CMIG4.SA', 'Real Investor': null, 'Top Dividendos': null,
    'Fidelity Index US Fund P-Acc': null, 'Fidelity Index Europe ex UK Fund P-Accumulation': null,
    'Fidelity Funds - Global Technology': null, 'Ishares Physical Silver ETC': 'SSLN',
    'MSCI Turkey': null,
};

let backfilled = 0;
let skipped = 0;

transactions.forEach(tr => {
    if (tr.ticker) return; // already has ticker
    const ticker = ASSET_TICKER_MAP[tr.asset];
    if (ticker) {
        tr.ticker = ticker;
        backfilled++;
    } else if (ASSET_TICKER_MAP.hasOwnProperty(tr.asset)) {
        // Explicitly mapped to null (non-tradeable like "Equity", "Cash", funds)
        tr.ticker = null;
        skipped++;
    } else {
        console.warn(`No mapping for asset: "${tr.asset}"`);
        tr.ticker = null;
        skipped++;
    }
});

fs.writeFileSync(dataFile, JSON.stringify(transactions, null, 2));
console.log(`Migration complete: ${backfilled} backfilled, ${skipped} skipped (no ticker).`);
console.log(`Total transactions: ${transactions.length}`);
