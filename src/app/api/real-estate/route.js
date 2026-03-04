import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';

export async function GET(request) {
    try {
        const user = await requireAuth();

        // 1. Fetch Properties (Manual assets)
        const propertiesRows = await query(`
            SELECT a.id, a.name, a.currency, MAX(l.price) as currentValue, SUM(l.amount) as totalInvestment
            FROM assets a
            JOIN ledger l ON l.asset_id = a.id
            WHERE a.asset_class = 'Real Estate' AND a.broker = 'Manual' AND a.sync_status = 'ACTIVE' AND a.user_id = ?
            GROUP BY a.id
        `, [user.id]);

        const allLedgerRows = await query(`
            SELECT l.asset_id, l.date, l.amount, l.type, l.notes
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.asset_class = 'Real Estate' AND a.broker = 'Manual' AND a.sync_status = 'ACTIVE' AND l.user_id = ?
            ORDER BY l.date DESC
        `, [user.id]);

        const properties = propertiesRows.map(r => ({
            id: r.name ? r.name.toLowerCase().replace(/\s+/g, '-').replace(/[í]/g, 'i') : 'property-' + Math.random().toString(36).substr(2, 9),
            name: r.name,
            status: (r.name.includes('Andyara 1') || r.name.includes('Rua Montes Claros')) ? 'Sold' : 'Owned',
            purchaseDate: '2020-01-01',
            purchasePrice: 0,
            currentValue: r.currentValue || 0,
            investment: r.totalInvestment || 0,
            currency: r.currency,
            ledger: allLedgerRows
                .filter(l => l.asset_id === r.id)
                .map(l => ({
                    date: l.date,
                    amount: l.amount,
                    type: l.type || l.notes,
                    notes: l.notes
                }))
        }));

        // 2. Fetch Ink Court Ledger
        const inkCourtRows = await query(`
            SELECT l.id, l.date, l.notes, l.type, l.amount
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.name = 'Ink Court' AND l.user_id = ?
            ORDER BY l.date DESC
        `, [user.id]);

        const mortgageMap = new Map();
        const otherEntries = [];

        const toShortMonth = (yyyy_mm) => {
            if (!yyyy_mm || yyyy_mm.length < 7) return yyyy_mm;
            const [y, m] = yyyy_mm.split('-');
            const date = new Date(parseInt(y), parseInt(m) - 1, 1);
            const mmm = date.toLocaleString('en-GB', { month: 'short' });
            return `${mmm}-${y.slice(2)}`;
        };

        inkCourtRows.forEach(r => {
            const isMortgage = (r.type && r.type.includes('Mortgage')) || (r.notes && r.notes.includes('Mortgage'));
            const rawMonth = r.date.substring(0, 7);

            const amt = Math.abs(r.amount);

            if (isMortgage) {
                if (!mortgageMap.has(rawMonth)) {
                    mortgageMap.set(rawMonth, { month: toShortMonth(rawMonth), rawDate: rawMonth, costs: 0, principal: 0, interest: 0, source: 'Mortgage', ids: [] });
                }
                const entry = mortgageMap.get(rawMonth);
                entry.ids.push(r.id);

                if (amt > entry.costs) {
                    if (entry.costs > 0 && entry.principal === 0) entry.principal = entry.costs;
                    entry.costs = amt;
                } else {
                    entry.principal = amt;
                }
            } else {
                otherEntries.push({
                    id: r.id.toString(),
                    month: toShortMonth(rawMonth),
                    rawDate: rawMonth,
                    costs: amt,
                    principal: 0,
                    interest: 0,
                    source: r.notes || r.type
                });
            }
        });

        mortgageMap.forEach(entry => {
            entry.interest = entry.costs - entry.principal;
            entry.id = entry.ids.join(',');
        });

        const inkCourtLedger = [...otherEntries, ...Array.from(mortgageMap.values())].sort((a, b) => b.rawDate.localeCompare(a.rawDate));

        // 3. Funds
        const fundRows = await query(`
            SELECT 
                l.date, l.id,
                a.name as fund, a.ticker, a.currency,
                l.quantity, l.price, l.amount
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.asset_class = 'Real Estate'
            AND a.ticker IS NOT NULL 
            AND a.ticker != 'INK'
            AND a.sync_status = 'ACTIVE'
            AND l.user_id = ?
        `, [user.id]);

        const fundTransactions = fundRows.map(r => ({
            id: r.id,
            date: r.date,
            fund: r.fund,
            ticker: r.ticker,
            quantity: r.quantity,
            price: r.price,
            costPerShare: r.price,
            investment: -r.amount,
            currency: r.currency
        }));

        // 4. Holdings
        const holdingsRows = await query(`
            SELECT name, ticker, currency 
            FROM assets 
            WHERE asset_class = 'Real Estate' AND ticker IS NOT NULL AND ticker != 'INK' AND sync_status = 'ACTIVE' AND user_id = ?
        `, [user.id]);

        const holdings = holdingsRows.map(r => ({
            ticker: r.ticker,
            name: r.name,
            currency: r.currency,
            quantity: 0,
            purchasePrice: 0,
            currentPrice: 0
        }));

        // 5. Airbnb (Zara) Ledger
        const airbnbRows = await query(`
            SELECT strftime('%Y-%m', l.date) as monthKey, l.date, l.type, l.amount
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.name LIKE '%Zara%' AND l.type IN ('Income', 'Expense') AND l.user_id = ?
            ORDER BY l.date ASC
        `, [user.id]);

        const airbnbMap = new Map();
        for (const r of airbnbRows) {
            const dateStr = r.date;
            const [y, m, d] = dateStr.split('-');
            const dateObj = new Date(Date.UTC(y, m - 1, d));
            const monthStr = dateObj.toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace(' ', '-');

            if (!airbnbMap.has(monthStr)) {
                airbnbMap.set(monthStr, { month: monthStr, revenue: 0, costs: 0, rawDate: r.date });
            }
            const entry = airbnbMap.get(monthStr);
            if (r.type === 'Income') entry.revenue += r.amount;
            else if (r.type === 'Expense') entry.costs += Math.abs(r.amount);
        }
        const airbnbLedger = Array.from(airbnbMap.values());

        // 6. Get Latest Valuation for Ink Court
        const latestLive = await query(`
            SELECT price, date FROM market_data 
            WHERE ticker = 'INK' 
            ORDER BY date DESC LIMIT 1
        `);

        const latestManual = await query(`
            SELECT price FROM market_data 
            WHERE ticker = 'INK_MANUAL' 
            ORDER BY date DESC LIMIT 1
        `);

        const marketValue = latestLive.length ? latestLive[0].price : 622000;
        const propertyValue = latestManual.length ? latestManual[0].price : 620000;
        const lastValuationUpdate = latestLive.length ? latestLive[0].date : "2026-02-19";

        return NextResponse.json({

            properties,
            inkCourt: {
                propertyValue,
                marketValue,
                lastValuationUpdate,
                deposit: 60000,
                mortgageAmount: 541000,
                durationMonths: 408,
                currency: "GBP",
                ledger: inkCourtLedger
            },
            funds: {
                transactions: fundTransactions,
                holdings: holdings
            },
            airbnb: {
                propertyId: "zara",
                ledger: airbnbLedger
            }
        });

    } catch (e) {
        if (e instanceof Response) return e;
        console.error('API Error:', e);
        return NextResponse.json({ error: 'Failed to fetch real estate' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);
        const idParam = searchParams.get('id');
        const section = searchParams.get('section');

        if (section === 'airbnb') {
            const month = searchParams.get('month');
            if (!month) return NextResponse.json({ error: 'Month required' }, { status: 400 });

            const months = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };

            let datePattern;

            if (month.match(/^\d{4}-\d{2}$/)) {
                datePattern = `${month}%`;
            } else if (month.match(/^[A-Z][a-z]{2}-\d{2}$/)) {
                const [mmm, yy] = month.split('-');
                const yyyy = '20' + yy;
                const mm = months[mmm];
                datePattern = `${yyyy}-${mm}%`;
            } else {
                return NextResponse.json({ error: 'Invalid month format. Use MMM-YY or YYYY-MM' }, { status: 400 });
            }

            await run(`
                DELETE FROM ledger 
                WHERE asset_id IN (SELECT id FROM assets WHERE name LIKE '%Zara%' AND user_id = ?) 
                AND date LIKE ?
                AND user_id = ?
             `, [user.id, datePattern, user.id]);

            return NextResponse.json({ success: true });
        }

        if (idParam) {
            const ids = idParam.split(',');
            const placeholders = ids.map(() => '?').join(',');
            await run(`DELETE FROM ledger WHERE id IN (${placeholders}) AND user_id = ?`, [...ids, user.id]);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Missing ID or parameters' }, { status: 400 });
    } catch (e) {
        if (e instanceof Response) return e;
        console.error('Delete Error:', e);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const t = body.transaction || body;

        // Handle Add Mortgage
        if (body.section === 'mortgages') {
            const months = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };
            const [mmm, yy] = (t.month || '').split('-');

            if (!mmm || !yy) return NextResponse.json({ error: 'Invalid month format' }, { status: 400 });

            const dateStr = `20${yy}-${months[mmm]}-01`;

            const assetRow = await query("SELECT id FROM assets WHERE name = 'Ink Court' AND user_id = ?", [user.id]);
            if (!assetRow.length) return NextResponse.json({ error: 'Ink Court asset not found' }, { status: 404 });
            const assetId = assetRow[0].id;

            await run(`INSERT INTO ledger (date, type, asset_id, amount, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [dateStr, 'Mortgage', assetId, -Math.abs(t.costs), 'GBP', t.notes || 'Mortgage Payment', user.id]);

            if (t.principal > 0) {
                await run(`INSERT INTO ledger (date, type, asset_id, amount, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [dateStr, 'Mortgage Principal', assetId, -Math.abs(t.principal), 'GBP', 'Mortgage Principal', user.id]);
            }

            return NextResponse.json({ success: true });
        }

        // Handle Add Funds
        if (body.section === 'funds') {
            const t = body.transaction || body;
            const ticker = (t.fund.split(' - ')[1] || t.fund || '').toUpperCase();

            let assetId;
            const assetRows = await query("SELECT id FROM assets WHERE ticker = ? AND user_id = ?", [ticker, user.id]);

            if (assetRows.length > 0) {
                assetId = assetRows[0].id;
            } else {
                const name = t.fund || `Fund ${ticker}`;
                const result = await run(
                    `INSERT INTO assets (name, ticker, asset_class, broker, currency, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
                    [name, ticker, 'Real Estate', 'XP', 'BRL', user.id]
                );
                assetId = result.lastID;
            }

            const amt = -Math.abs(t.investment || (t.quantity * t.costPerShare));
            await run(
                `INSERT INTO ledger (date, asset_id, amount, quantity, price, currency, type, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [t.date, assetId, amt, t.quantity, t.costPerShare, 'BRL', 'Buy', t.isSalaryContribution ? 'Salary Contribution' : 'Manual Buy', user.id]
            );

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: true });

    } catch (e) {
        if (e instanceof Response) return e;
        console.error('POST Error:', e);
        return NextResponse.json({ error: 'Failed to add' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();

        if (body.action === 'updatePropertyValue') {
            const value = body.value;
            if (value === undefined || value === null) return NextResponse.json({ error: 'Value required' }, { status: 400 });

            const today = new Date().toISOString().split('T')[0];

            const result = await run(`
                UPDATE market_data SET price = ? 
                WHERE ticker = 'INK_MANUAL' AND date = ?
            `, [value, today]);

            if (result.changes === 0) {
                await run(`
                    INSERT INTO market_data (ticker, price, date)
                    VALUES ('INK_MANUAL', ?, ?)
                `, [value, today]);
            }

            return NextResponse.json({ success: true });
        }

        if (body.section === 'inkCourt') {
            const t = body.transaction;

            if (!t.id) return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });

            const ids = t.id.split(',');
            const placeholders = ids.map(() => '?').join(',');
            await run(`DELETE FROM ledger WHERE id IN (${placeholders}) AND user_id = ?`, [...ids, user.id]);

            const months = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };

            let dateStr;
            const tMonth = t.month || '';

            if (tMonth.match(/^\d{4}-\d{2}$/)) {
                dateStr = `${tMonth}-01`;
            } else if (tMonth.match(/^[A-Z][a-z]{2}-\d{2}$/)) {
                const [mmm, yy] = tMonth.split('-');
                dateStr = `20${yy}-${months[mmm]}-01`;
            } else {
                return NextResponse.json({ error: 'Invalid month format. Use MMM-YY or YYYY-MM' }, { status: 400 });
            }

            const assetRow = await query("SELECT id FROM assets WHERE name = 'Ink Court' AND user_id = ?", [user.id]);
            if (!assetRow.length) return NextResponse.json({ error: 'Ink Court asset not found' }, { status: 404 });
            const assetId = assetRow[0].id;

            await run(`INSERT INTO ledger (date, type, asset_id, amount, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [dateStr, t.source || 'Mortgage', assetId, -Math.abs(t.costs), 'GBP', t.notes || 'Mortgage Payment', user.id]);

            if (t.principal > 0) {
                await run(`INSERT INTO ledger (date, type, asset_id, amount, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [dateStr, 'Mortgage Principal', assetId, -Math.abs(t.principal), 'GBP', 'Mortgage Principal', user.id]);
            }

            return NextResponse.json({ success: true });
        }

        // Handle Fund Update
        if (body.section === 'funds') {
            const t = body.transaction;
            if (!t.id) return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });

            await run(
                `UPDATE ledger SET date = ?, amount = ?, quantity = ?, price = ?, notes = ? WHERE id = ? AND user_id = ?`,
                [t.date, -Math.abs(t.investment), t.quantity, t.costPerShare, t.isSalaryContribution ? 'Salary Contribution' : 'Edited Transaction', t.id, user.id]
            );

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        if (e instanceof Response) return e;
        console.error('PUT Error:', e);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}
