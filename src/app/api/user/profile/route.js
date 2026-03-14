import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authGuard';
import { getUserById, updateUser, changePassword } from '@/lib/users';
import { kvGet, kvSet } from '@/lib/kv';

export async function GET() {
    try {
        const sessionUser = await requireAuth();
        const user = await getUserById(sessionUser.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Include currency preferences
        const currencyPreferences = await kvGet('currency_preferences', null, sessionUser.id);

        return NextResponse.json({
            ...user,
            currencyPreferences: currencyPreferences || { primary: 'BRL', secondary: 'GBP', rateFlipped: false, displayCurrencyOverrides: {} },
        });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('Error fetching user profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const sessionUser = await requireAuth();
        const body = await request.json();

        // ── Password change ──
        if (body.currentPassword && body.newPassword) {
            if (body.newPassword.length < 8) {
                return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
            }
            try {
                await changePassword(sessionUser.id, body.currentPassword, body.newPassword);
                return NextResponse.json({ success: true, message: 'Password updated successfully' });
            } catch (err) {
                const msg = err.message || 'Failed to change password';
                const status = msg.includes('incorrect') ? 403 : 400;
                return NextResponse.json({ error: msg }, { status });
            }
        }

        // ── Currency preferences ──
        if (body.primaryCurrency || body.secondaryCurrency || body.rateFlipped !== undefined || body.displayCurrencyOverrides !== undefined) {
            const current = await kvGet('currency_preferences', { primary: 'BRL', secondary: 'GBP', rateFlipped: false, displayCurrencyOverrides: {} }, sessionUser.id);
            const updated = {
                primary: body.primaryCurrency || current.primary,
                secondary: body.secondaryCurrency || current.secondary,
                rateFlipped: body.rateFlipped !== undefined ? body.rateFlipped : (current.rateFlipped || false),
                displayCurrencyOverrides: body.displayCurrencyOverrides !== undefined ? body.displayCurrencyOverrides : (current.displayCurrencyOverrides || {}),
            };
            await kvSet('currency_preferences', updated, sessionUser.id);

            const user = await getUserById(sessionUser.id);
            return NextResponse.json({ ...user, currencyPreferences: updated });
        }

        // ── Name update ──
        const { name } = body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const updated = await updateUser(sessionUser.id, { name: name.trim() });
        const currencyPreferences = await kvGet('currency_preferences', { primary: 'BRL', secondary: 'GBP' }, sessionUser.id);
        return NextResponse.json({ ...updated, currencyPreferences });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('Error updating user profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
