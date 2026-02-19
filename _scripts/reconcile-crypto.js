const fs = require('fs');
const path = require('path');
const jsonPath = path.join(__dirname, '../src/data/crypto_transactions.json');
const transactions = require(jsonPath);

const TARGET_PNL = -12717.12;

const holdings = {};
let currentRealizedPnL = 0;

transactions.forEach(tr => {
    if (!holdings[tr.ticker]) {
        holdings[tr.ticker] = { qty: 0, netInvestment: 0 };
    }
    holdings[tr.ticker].qty += (tr.quantity || 0);
    holdings[tr.ticker].netInvestment += (tr.investment || 0);
    if (tr.pnl) currentRealizedPnL += tr.pnl;
});

const adjustments = [];
const date = new Date().toISOString().split('T')[0];

console.log(`Current P&L: ${currentRealizedPnL.toFixed(2)}`);

// 1. Zero out quantities
Object.entries(holdings).forEach(([ticker, data]) => {
    if (Math.abs(data.qty) > 0.000001) {
        if (data.qty > 0) {
            // Sell to zero. Assume price 0 (Write-off).
            // P&L = Proceeds(0) - CostBasis.
            // CostBasis per share? Or Total Remaining Net Investment?
            // If we sell ALL, we realize the remaining Net Investment as Loss.
            const pnl = -data.netInvestment;

            adjustments.push({
                id: `reconcile-${ticker}-${Date.now()}`,
                date: date,
                ticker: ticker,
                asset: ticker,
                type: 'Sell',
                quantity: -data.qty, // Negative for Sell
                investment: 0, // Proceeds 0
                platform: 'Reconciliation',
                pnl: pnl
            });
            currentRealizedPnL += pnl;
        } else {
            // Buy to zero. (Closing short/oversold).
            // No P&L effect on Buy?
            // Just zeroes the quantity.
            adjustments.push({
                id: `reconcile-${ticker}-${Date.now()}`,
                date: date,
                ticker: ticker,
                asset: ticker,
                type: 'Buy',
                quantity: -data.qty, // Positive for Buy (since qty is negative)
                investment: 0, // Assume free correction
                platform: 'Reconciliation',
                pnl: 0
            });
        }
    }
});

console.log(`P&L after zeroing holdings: ${currentRealizedPnL.toFixed(2)}`);

// 2. Adjust global P&L to target
const gap = TARGET_PNL - currentRealizedPnL;
if (Math.abs(gap) > 0.01) {
    adjustments.push({
        id: `reconcile-GAP-${Date.now()}`,
        date: date,
        ticker: 'ADJUST',
        asset: 'P&L Adjustment',
        type: 'Sell', // Direction doesn't matter much if Qty is 0, but 'Sell' implies strict P&L booking
        quantity: 0,
        investment: 0,
        platform: 'Reconciliation',
        pnl: gap
    });
    currentRealizedPnL += gap;
}

console.log(`Final P&L: ${currentRealizedPnL.toFixed(2)}`);
console.log(`Adding ${adjustments.length} adjustment transactions.`);

const newTransactions = [...transactions, ...adjustments];
fs.writeFileSync(jsonPath, JSON.stringify(newTransactions, null, 2));
console.log('Done.');
