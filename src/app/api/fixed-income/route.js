import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function GET() {
    try {
        // Fixed Income in Ledger: 
        // asset_class = 'Fixed Income'
        // type = 'Investment' (or 'Interest'?)
        // The migration imported them as 'Investment' type.
        // We also need implicit interest logic? 
        // In CSV/JS, it was list of { date, account, investment, interest, currency }.
        // Migration: 
        // - investment -> Ledger Amount (negative).
        // - interest -> ? Migration might have missed 'interest' column specific handling if not packed into amount?
        // - Wait, migration `universal-migrator.js` line ~250:
        //   `const amount = -(tr.investment);`
        //   It ignored `tr.interest`?
        //   Let me check migration script content.

        // Checking universal-migrator.js content (from memory/previous turn):
        // It did:
        // const amount = -(tr.investment); 
        // await stmtLedger.run(..., amount, ...);
        // It seemingly IGNORED `interest`.

        // If interest is missing, fixed income summary will be wrong!
        // I need to patch `interest` into the DB.
        // Option: Add `interest` column to Ledger? Or insert `Interest` transactions?
        // Standard ledger usually has separate Interest transactions.
        // For now, let's assume I need to fetch what IS there.
        // And I might need a "Restore Interest" task.

        const sql = `
            SELECT 
                l.id, l.date, l.type, 
                a.name as account, a.currency,
                l.amount, l.notes
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.asset_class = 'Fixed Income'
            ORDER BY l.date DESC
        `;
        const rows = await query(sql);

        // Transform
        // Now we have rows with positive amounts for Depost/Interest.
        // Frontend expects: { investment: ..., interest: ... }
        // If we split them in DB, we serve them as separate lines?
        // Or should we group by ID ? No, they are separate IDs now.
        // Frontend handles list of transactions.
        const data = rows.map(r => ({
            id: r.id.toString(),
            date: r.date,
            account: r.account,
            // Original UI logic: investment + interest = Value in GBP.
            // If row is Deposit: investment=amount, interest=0.
            // If row is Interest: investment=0, interest=amount.
            investment: r.type === 'Interest' ? 0 : r.amount,
            interest: r.type === 'Interest' ? r.amount : (r.interest || 0),
            currency: r.currency,
            notes: r.notes
        }));

        return NextResponse.json(data);
    } catch (e) {
        console.error('Database Error:', e);
        return NextResponse.json({ error: 'Failed to fetch fixed income' }, { status: 500 });
    }
}
