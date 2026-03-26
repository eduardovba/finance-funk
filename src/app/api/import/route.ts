import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';
import { applyRateLimit } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';
import { apiError } from '@/lib/apiError';

const PostImportSchema = z.object({
    assetClass: z.string().optional(),
    defaultCurrency: z.string().optional(),
    defaultBroker: z.string().optional(),
    transactions: z.array(z.object({
        date: z.string(),
        amount: z.coerce.number().optional(),
        type: z.string().optional(),
        ticker: z.string().optional(),
        asset: z.string().optional(),
        broker: z.string().optional(),
        currency: z.string().optional(),
        quantity: z.coerce.number().optional(),
        price: z.coerce.number().optional(),
        pnl: z.coerce.number().optional(),
        notes: z.string().optional(),
        assetClass: z.string().optional()
    })).min(1, 'No transactions to import').max(5000, 'Maximum 5000 transactions per import')
});

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const limited = await applyRateLimit(request, 'import');
        if (limited) return limited;

        const user = await requireAuth();
        const body: unknown = await request.json();
        const { data, error } = validateBody(PostImportSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        const { assetClass: globalAssetClass, defaultCurrency, defaultBroker, transactions } = data!;

        // At least a global assetClass or per-tx assetClass must be present
        if (!globalAssetClass && !transactions[0]?.assetClass) {
            return NextResponse.json({ error: 'assetClass is required (globally or per transaction)' }, { status: 400 });
        }

        const results: { imported: number; skipped: number; errors: { row: number; error: string }[]; assetsCreated: number } = {
            imported: 0,
            skipped: 0,
            errors: [],
            assetsCreated: 0,
        };

        // ─── Process each transaction ───
        for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i];

            try {
                // Validate required fields
                if (!tx.date || !tx.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    results.errors.push({ row: i + 1, error: `Invalid date: ${tx.date}` });
                    results.skipped++;
                    continue;
                }

                if (!tx.amount && tx.amount !== 0) {
                    results.errors.push({ row: i + 1, error: 'Missing amount' });
                    results.skipped++;
                    continue;
                }

                // Per-transaction assetClass takes priority over global
                const txAssetClass = tx.assetClass || globalAssetClass;

                // ─── Route to the correct asset class handler ───
                switch (txAssetClass) {
                    case 'Equity':
                        await importEquity(tx, user.id, defaultCurrency, defaultBroker, results);
                        break;
                    case 'Crypto':
                        await importCrypto(tx, user.id, defaultCurrency, defaultBroker, results);
                        break;
                    case 'Fixed Income':
                        await importFixedIncome(tx, user.id, defaultCurrency, defaultBroker, results);
                        break;
                    case 'Pension':
                        await importPension(tx, user.id, defaultCurrency, defaultBroker, results);
                        break;
                    case 'Real Estate':
                        await importRealEstate(tx, user.id, defaultCurrency, defaultBroker, results);
                        break;
                    case 'Debt':
                        await importDebt(tx, user.id, defaultCurrency, results);
                        break;
                    default:
                        results.errors.push({ row: i + 1, error: `Unknown asset class: ${txAssetClass}` });
                        results.skipped++;
                }
            } catch (err: any) {
                results.errors.push({ row: i + 1, error: err.message });
                results.skipped++;
            }
        }

        return NextResponse.json({
            success: true,
            ...results,
            total: transactions.length,
        });

    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        logger.error('Import', error);
        return apiError('Import failed', 500, error);
    }
}

// ─── Asset Class Handlers ────────────────────────────────────────────────────

async function findOrCreateAsset(name: string, ticker: any, broker: string, assetClass: string, currency: string, userId: any, results: any) {
    // Try by ticker + broker first (most specific)
    if (ticker) {
        const byTicker = await query(
            'SELECT id FROM assets WHERE ticker = ? AND broker = ? AND user_id = ?',
            [ticker, broker, userId]
        );
        if (byTicker.length > 0) return byTicker[0].id;
    }

    // Try by name + broker
    const byName = await query(
        'SELECT id FROM assets WHERE name = ? AND broker = ? AND user_id = ?',
        [name, broker, userId]
    );
    if (byName.length > 0) return byName[0].id;

    // Create new asset
    const res = await run(
        'INSERT INTO assets (name, ticker, broker, asset_class, currency, allocation_bucket, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, ticker || null, broker, assetClass, currency, assetClass, userId]
    );
    results.assetsCreated++;
    return res.lastID;
}

async function checkDuplicate(date: string, assetId: any, amount: any, userId: any) {
    const existing = await query(
        'SELECT id FROM ledger WHERE date = ? AND asset_id = ? AND ABS(amount - ?) < 0.01 AND user_id = ?',
        [date, assetId, amount, userId]
    );
    return existing.length > 0;
}

async function importEquity(tx: any, userId: any, defaultCurrency: any, defaultBroker: any, results: any) {
    const currency = tx.currency || defaultCurrency || 'USD';
    const broker = tx.broker || defaultBroker || 'Manual';
    const assetName = tx.asset || tx.ticker || 'Unknown';

    const assetId = await findOrCreateAsset(assetName, tx.ticker, broker, 'Equity', currency, userId, results);

    const ledgerAmount = tx.type === 'Buy' ? -Math.abs(tx.amount) : Math.abs(tx.amount);

    if (await checkDuplicate(tx.date, assetId, ledgerAmount, userId)) {
        results.skipped++;
        return;
    }

    await run(
        'INSERT INTO ledger (date, type, asset_id, quantity, price, amount, currency, notes, realized_pnl, realized_roi_percent, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            tx.date,
            tx.type === 'Buy' ? 'Investment' : 'Divestment',
            assetId,
            tx.type === 'Buy' ? Math.abs(tx.quantity || 0) : -Math.abs(tx.quantity || 0),
            tx.price || 0,
            ledgerAmount,
            currency,
            tx.notes || 'Spreadsheet Import',
            tx.pnl || null,
            null,
            userId
        ]
    );
    results.imported++;
}

async function importCrypto(tx: any, userId: any, defaultCurrency: any, defaultBroker: any, results: any) {
    const currency = tx.currency || defaultCurrency || 'USD';
    const broker = tx.broker || defaultBroker || 'Manual';
    const assetName = tx.asset || tx.ticker || 'Unknown';

    const assetId = await findOrCreateAsset(assetName, tx.ticker, broker, 'Crypto', currency, userId, results);

    const ledgerAmount = tx.type === 'Buy' ? -Math.abs(tx.amount) : Math.abs(tx.amount);

    if (await checkDuplicate(tx.date, assetId, ledgerAmount, userId)) {
        results.skipped++;
        return;
    }

    await run(
        'INSERT INTO ledger (date, type, asset_id, quantity, price, amount, currency, notes, realized_pnl, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            tx.date,
            tx.type === 'Buy' ? 'Investment' : 'Divestment',
            assetId,
            tx.quantity || 0,
            tx.price || 0,
            ledgerAmount,
            currency,
            tx.notes || 'Spreadsheet Import',
            tx.pnl || null,
            userId
        ]
    );
    results.imported++;
}

async function importFixedIncome(tx: any, userId: any, defaultCurrency: any, defaultBroker: any, results: any) {
    const currency = tx.currency || defaultCurrency || 'GBP';
    const broker = tx.broker || defaultBroker || 'Manual';
    const assetName = tx.asset || 'Fixed Income';

    const assetId = await findOrCreateAsset(assetName, null, broker, 'Fixed Income', currency, userId, results);

    const amount = tx.type === 'Sell' ? Math.abs(tx.amount) : -Math.abs(tx.amount);

    if (await checkDuplicate(tx.date, assetId, amount, userId)) {
        results.skipped++;
        return;
    }

    await run(
        'INSERT INTO ledger (date, type, asset_id, amount, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
            tx.date,
            tx.type === 'Buy' ? 'Investment' : (tx.type === 'Sell' ? 'Divestment' : 'Investment'),
            assetId,
            amount,
            currency,
            tx.notes || 'Spreadsheet Import',
            userId
        ]
    );
    results.imported++;
}

async function importPension(tx: any, userId: any, defaultCurrency: any, defaultBroker: any, results: any) {
    const broker = tx.broker || defaultBroker || 'Manual';
    const assetName = tx.asset || 'Pension Fund';

    const assetId = await findOrCreateAsset(assetName, null, broker, 'Pension', 'GBP', userId, results);

    const ledgerAmount = tx.type === 'Buy' ? -Math.abs(tx.amount) : Math.abs(tx.amount);

    if (await checkDuplicate(tx.date, assetId, ledgerAmount, userId)) {
        results.skipped++;
        return;
    }

    await run(
        'INSERT INTO ledger (date, type, asset_id, quantity, price, amount, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            tx.date,
            tx.type === 'Buy' ? 'Investment' : 'Divestment',
            assetId,
            tx.quantity || 0,
            tx.price || 0,
            ledgerAmount,
            'GBP',
            tx.notes || 'Spreadsheet Import',
            userId
        ]
    );
    results.imported++;
}

async function importRealEstate(tx: any, userId: any, defaultCurrency: any, defaultBroker: any, results: any) {
    const currency = tx.currency || defaultCurrency || 'BRL';
    const assetName = tx.asset || 'Property';

    // Check if property exists
    let assetRows = await query(
        "SELECT id FROM assets WHERE name = ? AND asset_class = 'Real Estate' AND user_id = ?",
        [assetName, userId]
    );

    let assetId;
    if (assetRows.length > 0) {
        assetId = assetRows[0].id;
    } else {
        const res = await run(
            "INSERT INTO assets (name, asset_class, broker, currency, sync_status, user_id) VALUES (?, 'Real Estate', 'Manual', ?, 'ACTIVE', ?)",
            [assetName, currency, userId]
        );
        assetId = res.lastID;
        results.assetsCreated++;
    }

    if (await checkDuplicate(tx.date, assetId, tx.amount, userId)) {
        results.skipped++;
        return;
    }

    const type = tx.type === 'Sell' ? 'Sale' : 'Purchase';

    await run(
        'INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
            tx.date,
            type,
            assetId,
            tx.amount,
            tx.amount,
            currency,
            tx.notes || 'Spreadsheet Import',
            userId
        ]
    );
    results.imported++;
}

async function importDebt(tx: any, userId: any, defaultCurrency: any, results: any) {
    const currency = tx.currency || defaultCurrency || 'BRL';
    const lender = tx.asset || 'Unknown Lender';

    let assetRows = await query(
        "SELECT id FROM assets WHERE name = ? AND asset_class = 'Debt' AND user_id = ?",
        [lender, userId]
    );

    let assetId;
    if (assetRows.length > 0) {
        assetId = assetRows[0].id;
    } else {
        const res = await run(
            "INSERT INTO assets (name, asset_class, currency, broker, user_id) VALUES (?, 'Debt', ?, 'Manual', ?)",
            [lender, currency, userId]
        );
        assetId = res.lastID;
        results.assetsCreated++;
    }

    if (await checkDuplicate(tx.date, assetId, tx.amount, userId)) {
        results.skipped++;
        return;
    }

    await run(
        "INSERT INTO ledger (date, type, asset_id, amount, currency, notes, user_id) VALUES (?, 'Liability', ?, ?, ?, ?, ?)",
        [tx.date, assetId, tx.amount, currency, tx.notes || 'Spreadsheet Import', userId]
    );
    results.imported++;
}
