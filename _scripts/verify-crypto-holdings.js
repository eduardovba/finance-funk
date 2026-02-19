const fs = require('fs');
const path = require('path');
const transactions = require('../src/data/crypto_transactions.json');

const holdings = {};
let totalRealizedPnL = 0;

transactions.forEach(tr => {
    if (!holdings[tr.ticker]) {
        holdings[tr.ticker] = { qty: 0, netInvestment: 0 };
    }

    // Quantity Check
    holdings[tr.ticker].qty += (tr.quantity || 0);

    // Investment Check (Cost Basis)
    holdings[tr.ticker].netInvestment += (tr.investment || 0);

    // P&L Check
    if (tr.pnl) {
        totalRealizedPnL += tr.pnl;
    }
});

console.log('--- Holdings (should be close to 0) ---');
Object.entries(holdings).forEach(([ticker, data]) => {
    if (Math.abs(data.qty) > 0.0001) {
        console.log(`${ticker}: ${data.qty.toFixed(8)} | Net Inv: ${data.netInvestment.toFixed(2)}`);
    }
});

console.log('\n--- Total Realized P&L (from CSV) ---');
console.log(`Verified P&L: ${totalRealizedPnL.toFixed(2)}`);

let liquidationPnL = totalRealizedPnL;
let remainingCostBasis = 0;

Object.entries(holdings).forEach(([ticker, data]) => {
    if (Math.abs(data.netInvestment) > 0.01) {
        // Assume write-off (Value 0).
        // P&L adjustment = -NetInvestment
        liquidationPnL -= data.netInvestment;
        remainingCostBasis += data.netInvestment;
    }
});

console.log('\n--- Total Realized P&L (from CSV) ---');
console.log(`Verified P&L: ${totalRealizedPnL.toFixed(2)}`);

let potentialWriteOffLoss = 0;

Object.entries(holdings).forEach(([ticker, data]) => {
    // Only count assets we "hold" (positive quantity)
    if (data.qty > 0.0001 && data.netInvestment > 0) {
        potentialWriteOffLoss += data.netInvestment;
        console.log(`Bag: ${ticker} | Qty: ${data.qty.toFixed(4)} | Cost: ${data.netInvestment.toFixed(2)}`);
    }
});

console.log(`\nSum of Positive Cost Basis (Bag Holdings): ${potentialWriteOffLoss.toFixed(2)}`);

let globalNetInv = 0;
Object.values(holdings).forEach(d => globalNetInv += d.netInvestment);

console.log(`Global Net Investment (Total Buys - Total Sells): ${globalNetInv.toFixed(2)}`);
console.log(`If this is the Loss, then Net Result = -${globalNetInv.toFixed(2)}`);
console.log(`Target: -12717.12`);



