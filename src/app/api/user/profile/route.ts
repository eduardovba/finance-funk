import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authGuard';
import { getUserById, updateUser, changePassword } from '@/lib/users';
import { kvGet, kvSet } from '@/lib/kv';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';

const PatchProfileSchema = z.object({
    // Password change fields
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, 'New password must be at least 8 characters').optional(),
    // Currency preference fields
    primaryCurrency: z.string().optional(),
    secondaryCurrency: z.string().optional(),
    singleCurrencyMode: z.boolean().optional(),
    rateFlipped: z.boolean().optional(),
    displayCurrencyOverrides: z.record(z.string(), z.string()).optional(),
    // Name update
    name: z.string().optional()
}).passthrough();

export async function GET(): Promise<NextResponse> {
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
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Error fetching user profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
    try {
        const sessionUser = await requireAuth();
        const body: unknown = await request.json();
        const { data, error } = validateBody(PatchProfileSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        // ── Password change ──
        if (data!.currentPassword && data!.newPassword) {
            try {
                await changePassword(sessionUser.id, data!.currentPassword, data!.newPassword);
                return NextResponse.json({ success: true, message: 'Password updated successfully' });
            } catch (err: any) {
                const msg = err.message || 'Failed to change password';
                const status = msg.includes('incorrect') ? 403 : 400;
                return NextResponse.json({ error: msg }, { status });
            }
        }

        // ── Currency preferences ──
        if (data!.primaryCurrency || data!.secondaryCurrency || data!.singleCurrencyMode !== undefined || data!.rateFlipped !== undefined || data!.displayCurrencyOverrides !== undefined) {
            const current = await kvGet<Record<string, any>>('currency_preferences', { primary: 'BRL', secondary: 'GBP', singleCurrencyMode: false, rateFlipped: false, displayCurrencyOverrides: {} }, sessionUser.id) || { primary: 'BRL', secondary: 'GBP', singleCurrencyMode: false, rateFlipped: false, displayCurrencyOverrides: {} };
            const updated = {
                primary: data!.primaryCurrency || current.primary,
                secondary: data!.secondaryCurrency || current.secondary,
                singleCurrencyMode: data!.singleCurrencyMode !== undefined ? data!.singleCurrencyMode : (current.singleCurrencyMode || false),
                rateFlipped: data!.rateFlipped !== undefined ? data!.rateFlipped : (current.rateFlipped || false),
                displayCurrencyOverrides: data!.displayCurrencyOverrides !== undefined ? data!.displayCurrencyOverrides : (current.displayCurrencyOverrides || {}),
            };
            await kvSet('currency_preferences', updated, sessionUser.id);

            const user = await getUserById(sessionUser.id);
            return NextResponse.json({ ...user, currencyPreferences: updated });
        }

        // ── Name update ──
        const { name } = data!;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const updated = await updateUser(sessionUser.id, { name: name.trim() });
        const currencyPreferences = await kvGet('currency_preferences', { primary: 'BRL', secondary: 'GBP' }, sessionUser.id);
        return NextResponse.json({ ...updated, currencyPreferences });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Error updating user profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
