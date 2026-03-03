const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'finance.db');
const db = new sqlite3.Database(dbPath);

const sql = `
    SELECT l.id, l.date, l.type, a.name, l.quantity, l.price, l.amount, l.realized_pnl, l.realized_roi_percent 
    FROM ledger l 
    JOIN assets a ON l.asset_id = a.id 
    WHERE a.name LIKE '%Fidelity%' AND l.date LIKE '2026-01%';
`;

db.all(sql, [], (err, rows) => {
    if (err) {
        console.error(err.message);
        return;
    }
    console.log(JSON.stringify(rows, null, 2));
    db.close();
});
