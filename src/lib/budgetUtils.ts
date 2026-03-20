/**
 * Budget utility functions.
 * All monetary values are INTEGER CENTS. Conversion to display strings
 * happens ONLY via formatCents() at the rendering boundary.
 */

import { SUPPORTED_CURRENCIES } from '@/lib/currency';

/**
 * Format integer cents to a localized currency string.
 * This is the ONLY place where division by 100 occurs.
 * When no locale is provided, auto-resolves from SUPPORTED_CURRENCIES.
 */
export function formatCents(
    cents: number,
    currency: string = 'BRL',
    locale?: string
): string {
    const resolvedLocale = locale ?? SUPPORTED_CURRENCIES[currency]?.locale ?? 'pt-BR';
    return (cents / 100).toLocaleString(resolvedLocale, {
        style: 'currency',
        currency,
    });
}

/**
 * Parse a user-entered amount string into integer cents.
 * Handles both "45.50" and "45,50" localized inputs.
 * Uses string manipulation — never intermediate floats.
 *
 * Examples:
 *   "45.50"   → 4550
 *   "45,50"   → 4550
 *   "1.234,56" → 123456
 *   "1,234.56" → 123456
 *   "100"     → 10000
 */
export function parseToCents(input: string): number {
    // Strip currency symbols, spaces, thousand separators
    let clean = input.replace(/[R$\s]/g, '');

    // Normalize: treat comma as decimal separator
    // If there's both '.' and ',', the last one is the decimal separator
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');

    if (lastComma > lastDot) {
        // "1.234,56" → comma is decimal
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
        // "1,234.56" → dot is decimal (remove thousand commas)
        clean = clean.replace(/,/g, '');
    }

    // Split on decimal point
    const parts = clean.split('.');
    const whole = parseInt(parts[0] || '0', 10);
    const frac = (parts[1] || '00').padEnd(2, '0').slice(0, 2);

    return whole * 100 + parseInt(frac, 10);
}

/**
 * Get YYYY-MM string offset from a reference month.
 * e.g. offsetMonth('2026-03', -5) → '2025-10'
 */
export function offsetMonth(month: string, offset: number): string {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Format a YYYY-MM string into a human label, e.g. "Mar 2026"
 */
export function formatMonthLabel(month: string): string {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Format a YYYY-MM string into a short label, e.g. "Mar"
 */
export function formatMonthShort(month: string): string {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleString('en-US', { month: 'short' });
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function todayISO(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Format a YYYY-MM-DD date into a human-readable day label.
 * Returns "Today", "Yesterday", or "Mar 18" etc.
 */
export function formatDayLabel(dateStr: string): string {
    const today = todayISO();
    if (dateStr === today) return 'Today';

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (dateStr === yStr) return 'Yesterday';

    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleString('en-US', { month: 'short', day: 'numeric' });
}
