const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/database.sqlite', (err) => {
    if (err) console.error(err.message);
});

db.serialize(() => {
    // 1. Check for 2017 and 2019 in monthly_ledger
    db.all("SELECT * FROM monthly_ledger WHERE month LIKE '2017%' OR month LIKE '2019%'", (err, rows) => {
        if (err) console.error(err);
        else console.log("2017/2019 Ledger Rows:", rows);
    });

    // 2. Check Zara / Airbnb ledger for Feb 2026
    db.all(`
        SELECT strftime('%Y-%m', l.date) as monthKey, l.date, l.type, l.amount
        FROM ledger l
        JOIN assets a ON l.asset_id = a.id
        WHERE a.name LIKE '%Zara%' AND l.type IN ('Income', 'Expense')
        ORDER BY l.date ASC
    `, (err, rows) => {
        if (err) console.error(err);
        else {
            const feb26 = rows.filter(r => r.monthKey === '2026-02');
            console.log("Airbnb Feb 2026 rows:", feb26);
        }
    });
});
db.close();
