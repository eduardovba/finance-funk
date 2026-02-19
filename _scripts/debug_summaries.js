const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

// We need to shim the browser environment or just copy the logic?
// Copying logic is safer to avoid module issues with 'import'.
// I will paste the relevant logic from portfolioUtils.js here for testing.

const DB_PATH = path.join(__dirname, '../data/finance.db');

// Mock Data
const rates = { GBP: 1, BRL: 7.10, USD: 1.28 };
const marketData = {};

async function runDebug() {
    const db = await open({ filename: DB_PATH, driver: sqlite3.Database });

    // 1. PENSIONS
    console.log('--- DEBUG PENSIONS ---');
    const pensionRows = await db.all(`
        SELECT l.id, l.date, l.type, a.name as asset, a.broker, a.allocation_bucket, l.quantity, l.amount
        FROM ledger l JOIN assets a ON l.asset_id = a.id WHERE a.asset_class = 'Pension'
    `);

    // Mimic API transformation
    const pensionTr = pensionRows.map(r => ({
        asset: r.asset,
        broker: r.broker,
        allocationClass: r.allocation_bucket,
        quantity: r.quantity,
        value: Math.abs(r.amount),
        type: r.type === 'Investment' ? 'Buy' : (r.type === 'Divestment' ? 'Sell' : r.type)
    }));

    console.log(`Fetched ${pensionTr.length} pension transactions.`);
    if (pensionTr.length > 0) console.log('Sample:', pensionTr[0]);

    // Summary Logic (simplified from utils)
    const pensionHoldings = {};
    pensionTr.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(tr => {
        const key = `${tr.asset}|${tr.broker}`;
        if (!pensionHoldings[key]) pensionHoldings[key] = { qty: 0, cost: 0 };
        if (tr.type === 'Buy') {
            pensionHoldings[key].qty += parseFloat(tr.quantity);
            pensionHoldings[key].cost += parseFloat(tr.value);
        }
    });

    console.log('Holdings:', pensionHoldings);


    // 2. FIXED INCOME
    console.log('\n--- DEBUG FIXED INCOME ---');
    const fiRows = await db.all(`
        SELECT l.id, l.date, l.type, a.name as account, a.currency, l.amount, l.interest
        FROM ledger l JOIN assets a ON l.asset_id = a.id WHERE a.asset_class = 'Fixed Income'
    `);

    // Mimic API
    const fiTr = fiRows.map(r => ({
        account: r.account,
        currency: r.currency,
        investment: r.type === 'Interest' ? 0 : r.amount,
        interest: r.type === 'Interest' ? r.amount : (r.interest || 0)
    }));

    console.log(`Fetched ${fiTr.length} FI transactions.`);
    if (fiTr.length > 0) console.log('Sample:', fiTr[0]);

    // Summary Logic
    const fiMap = {};
    fiTr.forEach(tr => {
        const name = tr.account;
        if (!fiMap[name]) fiMap[name] = { gbp: 0 };
        // Value = Inv + Int
        const val = tr.investment + tr.interest;
        fiMap[name].gbp += (tr.currency === 'GBP' ? val : val / rates.BRL);
    });
    console.log('FI Map:', fiMap);

    await db.close();
}

runDebug();
