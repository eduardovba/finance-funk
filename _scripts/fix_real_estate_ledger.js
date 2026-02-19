const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const DB_PATH = path.join(__dirname, '../data/finance.db');
const JSON_PATH = path.join(__dirname, '../legacy_csv_archive/realEstate.json');

async function fixRealEstateLedger() {
    console.log('Opening DB...');
    const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
    console.log('DB Opened.');

    try {
        const rawData = fs.readFileSync(JSON_PATH, 'utf8');
        const jsonData = JSON.parse(rawData);

        // 1. Fix Ink Court
        console.log('Fixing Ink Court...');
        const monthMap = { "May": "05", "Jun": "06", "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12", "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04" };

        const inkCourtAsset = await db.get("SELECT id FROM assets WHERE name = 'Ink Court'");
        if (!inkCourtAsset) {
            console.error('Ink Court asset not found!');
            return;
        }

        for (const item of jsonData.inkCourt.ledger) {
            // Mapping:
            // JSON source -> DB type or notes?
            // DB has id, date, type, amount, notes...
            // Previous check showed 'L&G Home Survey' in 'type' column? Or 'notes'?
            // Let's assume 'notes' holds the source/description based on previous `import_ledger`.
            // User query output: 550|...|L&G Home Survey|...
            // Schemas usually: id|date|type|asset|...
            // If 3rd col is type, then 'L&G Home Survey' is type. 
            // We want to update Amount.
            // item.costs is the amount (expense).

            // Let's try to match by date and "type" (which seems to be holding the source string)
            // JSON Date: "May-25" -> need to convert to YYYY-MM-DD (approx 2025-05-01)

            const dateParts = item.month.split('-'); // ["May", "25"]
            const monthMap = { "May": "05", "Jun": "06", "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12", "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04" };
            const month = monthMap[dateParts[0]];
            const year = "20" + dateParts[1];
            const dateStr = `${year}-${month}-01`;

            const amount = item.costs || 0; // Negative? Logic usually treats costs as negative in DB, but JSON had positive.
            // Previous fix_ink_court might have set 0.
            // We'll set negative for costs.
            // Wait, import_ledger usually sets negative for expenses.
            // Let's set it to -amount.

            const result = await db.run(`
                UPDATE ledger 
                SET amount = ?
                WHERE asset_id = ? 
                AND date LIKE ? 
                AND (type = ? OR notes = ?)
            `, [-amount, inkCourtAsset.id, `${year}-${month}%`, item.source, item.source]);

            if (result.changes > 0) {
                console.log(`Updated Ink Court: ${item.source} (${dateStr}) -> ${-amount}`);
            } else {
                console.log(`Row not found for Ink Court: ${item.source} (${dateStr}). Inserting...`);
                // match columns: date, type, asset_id, amount, currency, notes
                await db.run(`
                    INSERT INTO ledger (date, type, asset_id, amount, currency, notes)
                    VALUES (?, ?, ?, ?, ?, ?)
                 `, [dateStr, item.source, inkCourtAsset.id, -amount, 'GBP', item.source]);
            }
        }

        // 2. Fix/Import Airbnb (Zara)
        console.log('Fixing Airbnb (Zara)...');
        let zaraAsset = await db.get("SELECT id FROM assets WHERE name = 'Edifício Zara'");

        // Ensure Zara asset exists
        if (!zaraAsset) {
            console.log('Zara asset not found, checking by alias...');
            zaraAsset = await db.get("SELECT id FROM assets WHERE name LIKE '%Zara%'");
        }

        if (!zaraAsset) {
            console.error("Zara asset totally missing!");
            // Optionally insert asset?
            // Assuming it exists from previous `investigating` step (id 548).
        } else {
            // Delete existing ledger for Zara to avoid dupes (except Valuation?)
            // Valuation usually has type 'Valuation'.
            await db.run("DELETE FROM ledger WHERE asset_id = ? AND type != 'Valuation'", [zaraAsset.id]);

            for (const item of jsonData.airbnb.ledger) {
                // date: "Aug-23"
                const dateParts = item.month.split('-');
                const month = monthMap[dateParts[0]];
                const year = "20" + dateParts[1];
                const dateStr = `${year}-${month}-01`;

                // Revenue (Income)
                if (item.revenue > 0) {
                    await db.run(`
                        INSERT INTO ledger (date, type, asset_id, amount, currency, notes)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [dateStr, 'Income', zaraAsset.id, item.revenue, 'BRL', 'Airbnb Revenue']);
                }

                // Costs (Expense)
                if (item.costs > 0) {
                    await db.run(`
                        INSERT INTO ledger (date, type, asset_id, amount, currency, notes)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [dateStr, 'Expense', zaraAsset.id, -item.costs, 'BRL', 'Airbnb Costs']);
                }
            }
            console.log(`Imported ${jsonData.airbnb.ledger.length} months of Airbnb data.`);
        }

    } catch (e) {
        console.error('Error fixing ledger:', e);
    } finally {
        await db.close();
    }
}

fixRealEstateLedger();
