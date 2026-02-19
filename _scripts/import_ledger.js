const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const csv = require('csv-parse/sync');

const DB_PATH = path.join(__dirname, '../data/finance.db');
const CSV_PATH = path.join(__dirname, '../data/Ledger.csv');

async function importLedger() {
    const db = await open({ filename: DB_PATH, driver: sqlite3.Database });

    try {
        const fileContent = fs.readFileSync(CSV_PATH, 'utf8');
        const lines = fileContent.split('\n');

        let dataStartIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('Month/Year')) {
                dataStartIndex = i + 1;
                break;
            }
        }

        if (dataStartIndex === -1) {
            console.error('Could not find data start in CSV');
            return;
        }

        const stmt = await db.prepare(`
            INSERT OR REPLACE INTO monthly_ledger 
            (month, salary_savings, fixed_income, equity, real_estate, crypto, debt, pension, total_income, total_investments)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let count = 0;
        for (let i = dataStartIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Regex split to handle quotes
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, '').trim());

            const dateStr = cols[1];
            if (!dateStr || !dateStr.includes('/')) continue;

            const [mmm, yyyy] = dateStr.split('/');
            const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
            const mm = months[mmm] || '01';
            const isoMonth = `${yyyy}-${mm}`;

            const parseVal = (v) => {
                if (!v) return 0;
                const clean = v.replace(/[£,\s]/g, '');
                return parseFloat(clean) || 0;
            };

            const salary = parseVal(cols[2]); // Salary Savings (Income)
            const totalInc = parseVal(cols[6]); // Total Income

            // Investments Breakdown
            // 9: FI, 10: Eq, 11: RE, 12: Pension, 13: Crypto, 14: Debt, 15: TotalInv
            const fiInv = parseVal(cols[9]);
            const eqInv = parseVal(cols[10]);
            const reInv = parseVal(cols[11]);
            const pensionInv = parseVal(cols[12]);
            const cryptoInv = parseVal(cols[13]);
            const debtInv = parseVal(cols[14]);
            const totalInv = parseVal(cols[15]);

            await stmt.run(
                isoMonth,
                salary,
                fiInv,
                eqInv,
                reInv,
                cryptoInv,
                debtInv,
                pensionInv,
                totalInc,
                totalInv
            );
            count++;
        }

        console.log(`Imported ${count} rows to monthly_ledger.`);
        await stmt.finalize();

    } catch (e) {
        console.error('Import failed:', e);
    } finally {
        await db.close();
    }
}

importLedger();
