/**
 * FX Conversion utilities for the Budget module.
 * All amounts are in integer cents. Math.round() ensures no float corruption.
 */

// ═══════════ MOCK RATES ═══════════
// Rates relative to BRL as base (1 BRL = X of target).
// In production, replace with live rates from the portfolio's rate engine.
export const MOCK_FX_RATES: Record<string, number> = {
    BRL: 1,
    GBP: 0.141,
    USD: 0.179,
    EUR: 0.164,
    JPY: 26.76,
    CHF: 0.158,
    AUD: 0.276,
};

// ═══════════ CONVERSION ═══════════

/**
 * Convert an amount in integer cents from one currency to another.
 * Uses Math.round() to return clean integer cents — no float corruption.
 *
 * @param amountCents   - Source amount in integer cents
 * @param fromCurrency  - ISO code of the source currency
 * @param toCurrency    - ISO code of the target currency
 * @param rates         - Rate dictionary relative to a common base
 * @returns             - Converted amount as integer cents in target currency
 */
export function convertCurrency(
    amountCents: number,
    fromCurrency: string,
    toCurrency: string,
    rates: Record<string, number>
): number {
    if (fromCurrency === toCurrency) return amountCents;
    const rateFrom = rates[fromCurrency] ?? 1;
    const rateTo = rates[toCurrency] ?? 1;
    return Math.round(amountCents * (rateTo / rateFrom));
}
