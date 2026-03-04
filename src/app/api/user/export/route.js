import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authGuard';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const sessionUser = await requireAuth();
        const userId = sessionUser.id;

        const [assets, ledger, monthlyLedger, connections, snapshots] = await Promise.all([
            query('SELECT * FROM assets WHERE user_id = ?', [userId]),
            query('SELECT * FROM ledger WHERE user_id = ?', [userId]),
            query('SELECT * FROM monthly_ledger WHERE user_id = ?', [userId]),
            query('SELECT * FROM connections WHERE user_id = ?', [userId]),
            query('SELECT * FROM snapshots WHERE user_id = ?', [userId]),
        ]);

        const exportData = {
            exported_at: new Date().toISOString(),
            user: {
                name: sessionUser.name,
                email: sessionUser.email,
            },
            assets,
            ledger,
            monthly_ledger: monthlyLedger,
            connections,
            snapshots: snapshots.map(s => {
                try { return { ...s, content: JSON.parse(s.content) }; }
                catch { return s; }
            }),
        };

        return new Response(JSON.stringify(exportData, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="finance-export-${new Date().toISOString().slice(0, 10)}.json"`,
            },
        });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('Error exporting user data:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
