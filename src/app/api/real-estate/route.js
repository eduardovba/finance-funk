import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';

export async function GET(request) {
    try {
        const user = await requireAuth();

        // ONE-TIME INLINE MIGRATION: Seed sold properties & Ink Court config
        try {
            // Helper to get or create a property asset
            const getOrCreateAsset = async (name, currency) => {
                let rows = await query("SELECT id FROM assets WHERE name = ? AND user_id = ?", [name, user.id]);
                if (!rows.length) {
                    await run("INSERT INTO assets (name, asset_class, broker, currency, sync_status, user_id) VALUES (?, 'Real Estate', 'Manual', ?, 'ACTIVE', ?)", [name, currency, user.id]);
                    rows = await query("SELECT id FROM assets WHERE name = ? AND user_id = ?", [name, user.id]);
                }
                return rows.length ? rows[0].id : null;
            };

            // Helper to check if a ledger entry of a given type exists for an asset
            const hasLedgerEntry = async (assetId, type) => {
                const rows = await query("SELECT id FROM ledger WHERE asset_id = ? AND type = ? AND user_id = ?", [assetId, type, user.id]);
                return rows.length > 0;
            };

            // --- Andyara 1 (Sold) ---
            const a1Id = await getOrCreateAsset('Andyara 1', 'BRL');
            if (a1Id && !(await hasLedgerEntry(a1Id, 'Purchase'))) {
                await run("INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES ('2015-01-01', 'Purchase', ?, 237000, 237000, 'BRL', 'Initial investment', ?)", [a1Id, user.id]);
                await run("INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES ('2023-01-01', 'Stamp Duty', ?, -9074, 0, 'BRL', 'Stamp Duty', ?)", [a1Id, user.id]);
                await run("INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES ('2023-06-01', 'Sale', ?, -360000, 360000, 'BRL', 'Property sold', ?)", [a1Id, user.id]);
                console.log('Migration: Seeded Andyara 1 ledger entries');
            }

            // --- Rua Montes Claros (Sold) ---
            const mcId = await getOrCreateAsset('Rua Montes Claros', 'BRL');
            if (mcId && !(await hasLedgerEntry(mcId, 'Purchase'))) {
                await run("INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES ('2018-01-01', 'Purchase', ?, 681000, 681000, 'BRL', 'Initial investment', ?)", [mcId, user.id]);
                await run("INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES ('2024-01-01', 'Stamp Duty', ?, -29748, 0, 'BRL', 'Stamp Duty', ?)", [mcId, user.id]);
                await run("INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES ('2024-06-01', 'Sale', ?, -822920, 822920, 'BRL', 'Property sold', ?)", [mcId, user.id]);
                console.log('Migration: Seeded Rua Montes Claros ledger entries');
            }

            // --- Ink Court: mortgage config and valuation ---
            const inkId = await getOrCreateAsset('Ink Court', 'GBP');
            if (inkId) {
                if (!(await hasLedgerEntry(inkId, 'Mortgage Setup'))) {
                    const config = JSON.stringify({ originalAmount: 541000, deposit: 60000, durationMonths: 408, interestRate: 6.24 });
                    await run("INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES ('2024-03-01', 'Mortgage Setup', ?, 0, 0, 'GBP', ?, ?)", [inkId, config, user.id]);
                    console.log('Migration: Seeded Ink Court mortgage setup');
                }
                const valCheck = await query("SELECT id FROM ledger WHERE asset_id = ? AND price > 0 AND user_id = ?", [inkId, user.id]);
                if (!valCheck.length) {
                    await run("INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES ('2026-02-19', 'Valuation Update', ?, 0, 620000, 'GBP', 'Initial valuation', ?)", [inkId, user.id]);
                    console.log('Migration: Seeded Ink Court valuation');
                }
            }
        } catch (migErr) { console.error('Inline migration error:', migErr); }

        // 1. Fetch Properties (Manual assets)
        const propertiesRows = await query(`
            SELECT a.id, a.name, a.currency,
                (SELECT l2.price FROM ledger l2 WHERE l2.asset_id = a.id AND l2.price > 0 ORDER BY l2.date DESC, l2.id DESC LIMIT 1) as currentValue,
                SUM(CASE WHEN l.amount > 0 AND l.type NOT IN ('Income', 'Expense', 'Mortgage', 'Mortgage Principal', 'Mortgage Setup', 'Valuation Update', 'Investment Adjustment', 'Stamp Duty', 'Tax', 'Tinsdills + Management Fees', 'L&G Home Survey', 'Deposit') THEN l.amount ELSE 0 END) as totalPurchases,
                SUM(CASE WHEN l.type = 'Investment Adjustment' THEN l.amount ELSE 0 END) as investmentAdjustments,
                SUM(CASE WHEN l.type IN ('Stamp Duty', 'Tax', 'Tinsdills + Management Fees', 'L&G Home Survey') THEN ABS(l.amount) ELSE 0 END) as totalTaxes,
                SUM(CASE WHEN l.type = 'Deposit' THEN ABS(l.amount) ELSE 0 END) as totalDeposits,
                MAX(CASE WHEN l.type IN ('Sale', 'Sold') THEN 1 ELSE 0 END) as hasSale,
                SUM(CASE WHEN l.type IN ('Sale', 'Sold') THEN ABS(l.amount) ELSE 0 END) as saleAmount,
                MIN(l.date) as firstDate
            FROM assets a
            JOIN ledger l ON l.asset_id = a.id
            WHERE a.asset_class = 'Real Estate' AND a.broker = 'Manual' AND a.sync_status = 'ACTIVE' AND a.user_id = ?
            GROUP BY a.id
        `, [user.id]);

        const allLedgerRows = await query(`
            SELECT l.id, l.asset_id, l.date, l.amount, l.type, l.notes
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.asset_class = 'Real Estate' AND a.broker = 'Manual' AND a.sync_status = 'ACTIVE' AND l.user_id = ?
            ORDER BY l.date DESC
        `, [user.id]);

        const properties = propertiesRows.map(r => {
            // A property is sold only if it has an explicit Sale/Sold entry
            const isSold = r.hasSale > 0;
            const investment = (r.totalPurchases || 0) + (r.investmentAdjustments || 0) + (r.totalDeposits || 0);
            const salePrice = isSold ? (r.saleAmount || 0) : 0;
            const taxes = r.totalTaxes || 0;

            return {
                id: r.name ? r.name.toLowerCase().replace(/\s+/g, '-').replace(/[í]/g, 'i') : 'property-' + Math.random().toString(36).substr(2, 9),
                name: r.name,
                status: isSold ? 'Sold' : 'Owned',
                purchaseDate: r.firstDate || null,
                purchasePrice: investment,
                currentValue: r.currentValue || 0,
                investment: investment,
                salePrice: salePrice,
                taxes: taxes,
                currency: r.currency,
                ledger: allLedgerRows
                    .filter(l => l.asset_id === r.id)
                    .map(l => ({
                        id: l.id,
                        date: l.date,
                        amount: l.amount,
                        type: l.type || l.notes,
                        notes: l.notes
                    }))
            };
        });

        // Helper: convert YYYY-MM to short month
        const toShortMonth = (yyyy_mm) => {
            if (!yyyy_mm || yyyy_mm.length < 7) return yyyy_mm;
            const [y, m] = yyyy_mm.split('-');
            const date = new Date(parseInt(y), parseInt(m) - 1, 1);
            const mmm = date.toLocaleString('en-GB', { month: 'short' });
            return `${mmm}-${y.slice(2)}`;
        };

        // 2. Fetch ALL mortgage & rental ledger entries for all RE properties
        const allMortgageRentalRows = await query(`
            SELECT l.id, l.date, l.notes, l.type, l.amount, a.name as asset_name, a.id as asset_db_id
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.asset_class = 'Real Estate' AND a.broker = 'Manual' AND a.sync_status = 'ACTIVE' AND l.user_id = ?
            AND (l.type LIKE '%Mortgage%' OR l.type = 'Income' OR l.type = 'Expense' 
                 OR l.type = 'Mortgage Setup' OR l.notes LIKE '%Mortgage%'
                 OR l.type IN ('Stamp Duty', 'Tinsdills + Management Fees', 'L&G Home Survey'))
            ORDER BY l.date DESC
        `, [user.id]);

        // Group mortgage entries by property
        const mortgageDataByProperty = {};
        const rentalDataByProperty = {};

        allMortgageRentalRows.forEach(r => {
            const propName = r.asset_name;
            const isMortgage = (r.type && r.type.includes('Mortgage')) || (r.notes && r.notes.includes('Mortgage'));
            const isMortgageSetup = r.type === 'Mortgage Setup';
            const isRental = r.type === 'Income' || r.type === 'Expense';
            const isTax = ['Stamp Duty', 'Tinsdills + Management Fees', 'L&G Home Survey'].includes(r.type);

            if (isMortgageSetup) {
                // Parse config from notes (JSON)
                try {
                    const config = JSON.parse(r.notes || '{}');
                    if (!mortgageDataByProperty[propName]) mortgageDataByProperty[propName] = { config: null, entries: [], taxEntries: [] };
                    mortgageDataByProperty[propName].config = config;
                } catch (e) { /* ignore parse errors */ }
            } else if (isMortgage) {
                if (!mortgageDataByProperty[propName]) mortgageDataByProperty[propName] = { config: null, entries: [], taxEntries: [] };
                mortgageDataByProperty[propName].entries.push(r);
            } else if (isTax) {
                if (!mortgageDataByProperty[propName]) mortgageDataByProperty[propName] = { config: null, entries: [], taxEntries: [] };
                mortgageDataByProperty[propName].taxEntries.push(r);
            } else if (isRental) {
                if (!rentalDataByProperty[propName]) rentalDataByProperty[propName] = [];
                rentalDataByProperty[propName].push(r);
            }
        });

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


        // 6. Enrich properties with mortgage + rental data (generalized)
        const enrichedProperties = properties.map(prop => {
            const enriched = { ...prop, mortgage: null, rental: null, taxes: 0 };

            // --- Mortgage enrichment ---
            const mData = mortgageDataByProperty[prop.name];
            if (mData && (mData.config || mData.entries.length > 0)) {
                // Build mortgage ledger from entries
                const mortgageMap = new Map();
                const otherEntries = [];

                mData.entries.forEach(r => {
                    const isMortgagePayment = (r.type && r.type.includes('Mortgage'));
                    const rawMonth = r.date.substring(0, 7);
                    const amt = Math.abs(r.amount);

                    if (isMortgagePayment) {
                        if (!mortgageMap.has(rawMonth)) {
                            mortgageMap.set(rawMonth, { month: toShortMonth(rawMonth), rawDate: r.date, costs: 0, principal: 0, interest: 0, source: 'Mortgage', ids: [] });
                        }
                        const entry = mortgageMap.get(rawMonth);
                        entry.ids.push(r.id);

                        if (amt > entry.costs) {
                            if (entry.costs > 0 && entry.principal === 0) entry.principal = entry.costs;
                            entry.costs = amt;
                        } else {
                            entry.principal = amt;
                        }
                    }
                });

                // Tax entries
                mData.taxEntries.forEach(r => {
                    const rawMonth = r.date.substring(0, 7);
                    const amt = Math.abs(r.amount);
                    otherEntries.push({
                        id: r.id.toString(),
                        month: toShortMonth(rawMonth),
                        rawDate: r.date,
                        costs: amt,
                        principal: 0,
                        interest: 0,
                        source: r.notes || r.type
                    });
                });

                mortgageMap.forEach(entry => {
                    entry.interest = entry.costs - entry.principal;
                    entry.id = entry.ids.join(',');
                });

                const mortgageLedger = [...otherEntries, ...Array.from(mortgageMap.values())].sort((a, b) => b.rawDate.localeCompare(a.rawDate));

                const totalPrincipalPaid = mortgageLedger
                    .filter(l => l.source === 'Mortgage')
                    .reduce((sum, l) => sum + l.principal, 0);
                const totalInterestPaid = mortgageLedger
                    .filter(l => l.source === 'Mortgage')
                    .reduce((sum, l) => sum + l.interest, 0);
                const taxes = mortgageLedger
                    .filter(l => l.source !== 'Mortgage')
                    .reduce((sum, l) => sum + l.costs, 0);

                // Use config from database (set up via mortgage-setup endpoint)
                const config = mData.config || {};
                const originalAmount = config.originalAmount || 0;
                const deposit = config.deposit || 0;
                const durationMonths = config.durationMonths || 0;

                if (deposit > 0) enriched.investment = deposit;

                const mortgageBalance = originalAmount - totalPrincipalPaid;

                enriched.mortgage = {
                    originalAmount,
                    deposit,
                    balance: mortgageBalance,
                    totalPrincipalPaid,
                    totalInterestPaid,
                    durationMonths,
                    marketValue: enriched.currentValue,
                    lastValuationUpdate: null,
                    ledger: mortgageLedger
                };
                enriched.taxes = taxes;
            }

            // --- Rental enrichment ---
            const rData = rentalDataByProperty[prop.name];
            if (rData && rData.length > 0) {
                const rentalMap = new Map();
                for (const r of rData) {
                    const dateStr = r.date;
                    const [y, m, d] = dateStr.split('-');
                    const dateObj = new Date(Date.UTC(y, m - 1, d));
                    const monthStr = dateObj.toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace(' ', '-');

                    if (!rentalMap.has(monthStr)) {
                        rentalMap.set(monthStr, { month: monthStr, revenue: 0, costs: 0, rawDate: r.date });
                    }
                    const entry = rentalMap.get(monthStr);
                    if (r.type === 'Income') entry.revenue += r.amount;
                    else if (r.type === 'Expense') entry.costs += Math.abs(r.amount);
                }
                const rentalLedger = Array.from(rentalMap.values());
                const totalRevenue = rentalLedger.reduce((sum, m) => sum + m.revenue, 0);
                const totalCosts = rentalLedger.reduce((sum, m) => sum + m.costs, 0);
                // Include raw entries with IDs for edit/delete
                const rawEntries = rData.map(r => ({
                    id: r.id.toString(),
                    date: r.date,
                    type: r.type,
                    amount: r.amount,
                    notes: r.notes || ''
                }));
                enriched.rental = {
                    totalRevenue,
                    totalCosts,
                    totalProfit: totalRevenue - totalCosts,
                    ledger: rentalLedger,
                    entries: rawEntries
                };
            }

            return enriched;
        });

        // Build legacy data for backward compat
        const inkCourtProperty = enrichedProperties.find(p => p.name === 'Ink Court');
        const zaraProperty = enrichedProperties.find(p => p.name && p.name.includes('Zara'));
        const airbnbLedger = zaraProperty?.rental?.ledger || [];
        const inkCourtMortgageLedger = inkCourtProperty?.mortgage?.ledger || [];

        // Add broker info to fund transactions
        const enrichedFundTransactions = fundTransactions.map(t => ({
            ...t,
            broker: t.fund.split(' - ')[0] || 'XP'
        }));

        return NextResponse.json({
            properties: enrichedProperties,
            funds: {
                transactions: enrichedFundTransactions,
                holdings: holdings
            },
            // Keep legacy fields for backward compat during transition
            inkCourt: {
                propertyValue: inkCourtProperty?.currentValue || 0,
                marketValue: inkCourtProperty?.currentValue || 0,
                lastValuationUpdate: null,
                deposit: inkCourtProperty?.mortgage?.deposit || 0,
                mortgageAmount: inkCourtProperty?.mortgage?.originalAmount || 0,
                durationMonths: inkCourtProperty?.mortgage?.durationMonths || 0,
                currency: inkCourtProperty?.currency || 'GBP',
                ledger: inkCourtMortgageLedger
            },
            airbnb: {
                propertyId: "zara",
                ledger: airbnbLedger
            }
        });

    } catch (e) {
        if (e instanceof Response) return e;
        console.error('API Error:', e?.message, e?.stack);
        return NextResponse.json({ error: 'Failed to fetch real estate', details: e?.message }, { status: 500 });
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

        // Handle Delete Property
        if (section === 'property') {
            const name = searchParams.get('name');
            if (!name) return NextResponse.json({ error: 'Property name required' }, { status: 400 });

            // Find the asset
            const assetRows = await query("SELECT id FROM assets WHERE name = ? AND asset_class = 'Real Estate' AND user_id = ?", [name, user.id]);
            if (assetRows.length === 0) return NextResponse.json({ error: 'Property not found' }, { status: 404 });
            const assetId = assetRows[0].id;

            // Delete all ledger entries for this asset
            await run("DELETE FROM ledger WHERE asset_id = ? AND user_id = ?", [assetId, user.id]);

            // Mark asset as deleted (soft delete)
            await run("UPDATE assets SET sync_status = 'DELETED' WHERE id = ? AND user_id = ?", [assetId, user.id]);

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

        // Handle Mortgage Setup (configure mortgage for any property)
        if (body.section === 'mortgage-setup') {
            const propertyName = body.propertyName;
            if (!propertyName) return NextResponse.json({ error: 'Property name required' }, { status: 400 });

            const assetRow = await query("SELECT id, currency FROM assets WHERE name = ? AND asset_class = 'Real Estate' AND user_id = ?", [propertyName, user.id]);
            if (!assetRow.length) return NextResponse.json({ error: 'Property not found' }, { status: 404 });
            const asset = assetRow[0];

            // Remove any existing Mortgage Setup entry for this property
            await run(`DELETE FROM ledger WHERE asset_id = ? AND type = 'Mortgage Setup' AND user_id = ?`, [asset.id, user.id]);

            const config = JSON.stringify({
                originalAmount: parseFloat(body.originalAmount) || 0,
                deposit: parseFloat(body.deposit) || 0,
                durationMonths: parseInt(body.durationMonths) || 0,
                interestRate: parseFloat(body.interestRate) || 0
            });

            const today = new Date().toISOString().split('T')[0];
            await run(
                `INSERT INTO ledger (date, type, asset_id, amount, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [today, 'Mortgage Setup', asset.id, 0, asset.currency, config, user.id]
            );

            return NextResponse.json({ success: true });
        }

        // Handle Add Mortgage Payment (works for any property)
        if (body.section === 'mortgages') {
            const months = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };
            const monthVal = (t.month || '');
            let dateStr;

            if (monthVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // YYYY-MM-DD format from date picker — use first of month
                dateStr = monthVal.substring(0, 7) + '-01';
            } else if (monthVal.match(/^\d{4}-\d{2}$/)) {
                // YYYY-MM format
                dateStr = monthVal + '-01';
            } else {
                // Legacy MMM-YY format (e.g. "Mar-26")
                const [mmm, yy] = monthVal.split('-');
                if (!mmm || !yy || !months[mmm]) return NextResponse.json({ error: 'Invalid month format' }, { status: 400 });
                dateStr = `20${yy}-${months[mmm]}-01`;
            }

            // Accept propertyName, fallback to 'Ink Court' for backward compat
            const propertyName = body.propertyName || 'Ink Court';
            const assetRow = await query("SELECT id, currency FROM assets WHERE name = ? AND user_id = ?", [propertyName, user.id]);
            if (!assetRow.length) return NextResponse.json({ error: `Property '${propertyName}' not found` }, { status: 404 });
            const asset = assetRow[0];

            await run(`INSERT INTO ledger (date, type, asset_id, amount, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [dateStr, 'Mortgage', asset.id, -Math.abs(t.costs), asset.currency, t.notes || 'Mortgage Payment', user.id]);

            if (t.principal > 0) {
                await run(`INSERT INTO ledger (date, type, asset_id, amount, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [dateStr, 'Mortgage Principal', asset.id, -Math.abs(t.principal), asset.currency, 'Mortgage Principal', user.id]);
            }

            return NextResponse.json({ success: true });
        }

        // Handle Add Individual Rental Entry (revenue or cost on a specific date)
        if (body.section === 'airbnb-entry') {
            const propertyName = body.propertyName;
            if (!propertyName) return NextResponse.json({ error: 'Property name required' }, { status: 400 });

            const assetRow = await query("SELECT id, currency FROM assets WHERE name = ? AND asset_class = 'Real Estate' AND user_id = ?", [propertyName, user.id]);
            if (!assetRow.length) return NextResponse.json({ error: 'Property not found' }, { status: 404 });
            const asset = assetRow[0];

            const dateStr = body.date || new Date().toISOString().split('T')[0];
            const amount = parseFloat(body.amount) || 0;
            const entryType = body.type === 'Revenue' ? 'Income' : 'Expense';
            const notes = body.notes || `Rental ${body.type}`;

            if (amount > 0) {
                const dbAmount = entryType === 'Income' ? amount : -Math.abs(amount);
                await run(
                    `INSERT INTO ledger (date, type, asset_id, amount, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [dateStr, entryType, asset.id, dbAmount, asset.currency, notes, user.id]
                );
            }

            return NextResponse.json({ success: true });
        }

        // Handle Add Rental Month (works for any property)
        if (body.section === 'airbnb') {
            // Accept propertyName, fallback to '%Zara%' pattern for backward compat
            const propertyName = body.propertyName;
            let assetRow;
            if (propertyName) {
                assetRow = await query("SELECT id, currency FROM assets WHERE name = ? AND asset_class = 'Real Estate' AND user_id = ?", [propertyName, user.id]);
            } else {
                assetRow = await query("SELECT id, currency FROM assets WHERE name LIKE '%Zara%' AND user_id = ?", [user.id]);
            }
            if (!assetRow.length) return NextResponse.json({ error: 'Property not found' }, { status: 404 });
            const asset = assetRow[0];

            const month = body.month;
            const revenue = parseFloat(body.revenue) || 0;
            const costs = parseFloat(body.costs) || 0;

            // Determine date string from month input
            let dateStr;
            if (month && month.match(/^\d{4}-\d{2}$/)) {
                dateStr = `${month}-15`;
            } else {
                dateStr = new Date().toISOString().split('T')[0];
            }

            if (revenue > 0) {
                await run(
                    `INSERT INTO ledger (date, type, asset_id, amount, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [dateStr, 'Income', asset.id, revenue, asset.currency, 'Rental Income', user.id]
                );
            }
            if (costs > 0) {
                await run(
                    `INSERT INTO ledger (date, type, asset_id, amount, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [dateStr, 'Expense', asset.id, -Math.abs(costs), asset.currency, 'Rental Expense', user.id]
                );
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

        // Handle Sell Property
        if (body.section === 'sell-property') {
            const propertyName = body.name;
            const salePrice = parseFloat(body.salePrice) || 0;
            const taxes = parseFloat(body.taxes) || 0;
            const saleDate = body.date || new Date().toISOString().split('T')[0];

            const assetRows = await query("SELECT id, currency FROM assets WHERE name = ? AND user_id = ?", [propertyName, user.id]);
            if (!assetRows.length) return NextResponse.json({ error: 'Property not found' }, { status: 404 });
            const asset = assetRows[0];

            // Record sale amount as negative ledger entry
            await run(`INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [saleDate, 'Sale', asset.id, -salePrice, salePrice, asset.currency, `Property sold for ${salePrice}`, user.id]);

            // Record taxes/fees if any
            if (taxes > 0) {
                await run(`INSERT INTO ledger (date, type, asset_id, amount, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [saleDate, 'Sale Tax', asset.id, -taxes, asset.currency, 'Sale taxes & fees', user.id]);
            }

            return NextResponse.json({ success: true });
        }

        // Handle Add Property
        if (body.type === 'property') {
            const name = body.name;
            const currency = body.currency || 'BRL';
            const investment = parseFloat(body.investment) || 0;
            const currentValue = parseFloat(body.currentValue) || 0;

            if (!name) return NextResponse.json({ error: 'Property name required' }, { status: 400 });

            // Check if property already exists
            const existing = await query("SELECT id FROM assets WHERE name = ? AND asset_class = 'Real Estate' AND user_id = ?", [name, user.id]);
            if (existing.length > 0) {
                return NextResponse.json({ error: 'Property already exists' }, { status: 400 });
            }

            // Create the asset
            const result = await run(
                `INSERT INTO assets (name, ticker, asset_class, broker, currency, sync_status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [name, null, 'Real Estate', 'Manual', currency, 'ACTIVE', user.id]
            );
            const assetId = result.lastID;

            const today = new Date().toISOString().split('T')[0];

            // Create initial investment ledger entry
            if (investment > 0) {
                await run(
                    `INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [today, 'Purchase', assetId, investment, currentValue || investment, currency, 'Initial investment', user.id]
                );
            }

            // If currentValue differs from investment, add a valuation entry
            if (currentValue > 0 && currentValue !== investment) {
                await run(
                    `INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [today, 'Valuation Update', assetId, 0, currentValue, currency, 'Initial valuation', user.id]
                );
            }

            return NextResponse.json({ success: true, assetId });
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

        if (body.action === 'updatePropertyValues') {
            const { id, name, currentValue, investment: newInvestment, oldInvestment } = body;
            if (!id || !name) return NextResponse.json({ error: 'Property ID/Name required' }, { status: 400 });

            const today = new Date().toISOString().split('T')[0];

            // 1. Update Valuation (Insert a 0-amount entry with the new price)
            if (currentValue !== undefined && currentValue !== null) {
                await run(`
                    INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id)
                    SELECT ?, 'Valuation Update', a.id, 0, ?, a.currency, 'Manual valuation update', ?
                    FROM assets a WHERE a.name = ? AND a.user_id = ?
                `, [today, currentValue, user.id, name, user.id]);
            }

            // 2. Update Investment (Insert an adjustment entry for the difference)
            if (newInvestment !== undefined && newInvestment !== null && oldInvestment !== undefined) {
                const diff = newInvestment - parseFloat(oldInvestment || 0);
                if (Math.abs(diff) > 0.01) {
                    await run(`
                        INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id)
                        SELECT ?, 'Investment Adjustment', a.id, ?, 0, a.currency, 'Manual investment adjustment', ?
                        FROM assets a WHERE a.name = ? AND a.user_id = ?
                    `, [today, diff, user.id, name, user.id]);
                }
            }

            return NextResponse.json({ success: true });
        }

        // Handle Property Transaction Update
        if (body.section === 'property-transaction') {
            const t = body.transaction;
            if (!t.id) return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });

            await run(
                `UPDATE ledger SET date = ?, amount = ?, type = ?, notes = ? WHERE id = ? AND user_id = ?`,
                [t.date, t.amount, t.type, t.type, t.id, user.id]
            );

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
