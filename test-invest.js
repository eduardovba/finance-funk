import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { calculateMonthlyInvestments, normalizeTransactions } from './src/lib/ledgerUtils.js';

async function test() {
    const db = await open({ filename: './data/finance.db', driver: sqlite3.Database });
    
    // Fetch some basic data to see what normalizeTransactions produces
    const eqRows = await db.all("SELECT id, date, type, amount as investment, currency, asset_id as broker FROM ledger WHERE date LIKE '2026-02%' AND asset_id IN (SELECT id FROM assets WHERE asset_class = 'Equity')");
    
    const allLive = normalizeTransactions({ equity: eqRows });
    console.log("Normalized Equity:", allLive);

    const investments = calculateMonthlyInvestments(allLive, []);
    console.log("Calculated Investments:", investments);
}
test();
