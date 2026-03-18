/**
 * Utility for currency conversion and formatting.
 * Supports dynamic primary/secondary currency selection.
 */

// ═══════════ TYPES ═══════════

export interface CurrencyInfo {
    code: string;
    symbol: string;
    flag: string;
    locale: string;
    name: string;
}

// ═══════════ SUPPORTED CURRENCIES ═══════════
export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
    BRL: { code: 'BRL', symbol: 'R$', flag: '🇧🇷', locale: 'pt-BR', name: 'Brazilian Real' },
    GBP: { code: 'GBP', symbol: '£', flag: '🇬🇧', locale: 'en-GB', name: 'British Pound' },
    USD: { code: 'USD', symbol: '$', flag: '🇺🇸', locale: 'en-US', name: 'US Dollar' },
    EUR: { code: 'EUR', symbol: '€', flag: '🇪🇺', locale: 'de-DE', name: 'Euro' },
    JPY: { code: 'JPY', symbol: '¥', flag: '🇯🇵', locale: 'ja-JP', name: 'Japanese Yen' },
    CHF: { code: 'CHF', symbol: 'Fr', flag: '🇨🇭', locale: 'de-CH', name: 'Swiss Franc' },
    AUD: { code: 'AUD', symbol: 'A$', flag: '🇦🇺', locale: 'en-AU', name: 'Australian Dollar' },
};

export const CURRENCY_LIST: CurrencyInfo[] = Object.values(SUPPORTED_CURRENCIES);

// ═══════════ FALLBACK RATES (vs GBP) ═══════════
// Used if live fetch fails. 1 GBP = X of each currency.
const FALLBACK_RATES: Record<string, number> = {
    GBP: 1,
    BRL: 7.10,
    USD: 1.28,
    EUR: 1.17,
    JPY: 190.0,
    CHF: 1.12,
    AUD: 1.96,
};

// ═══════════ FORMATTING ═══════════
/**
 * Formats a number as a currency string.
 */
export const formatCurrency = (amount: number, currency: string = 'GBP', options: Intl.NumberFormatOptions = {}): string => {
    const meta = SUPPORTED_CURRENCIES[currency];
    const locale = meta?.locale || 'en-GB';

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        currencyDisplay: 'symbol',
        ...options
    }).format(amount);
};

// ═══════════ CONVERSION ═══════════
/**
 * Converts an amount from one currency to another via GBP base.
 */
export const convertCurrency = (amount: number, from: string, to: string, rates: Record<string, number> = FALLBACK_RATES): number => {
    if (from === to) return amount;
    // Convert to GBP first, then to target
    const rateFrom = rates[from] || 1;
    const rateTo = rates[to] || 1;
    const amountInGBP = amount / rateFrom;
    return amountInGBP * rateTo;
};

// ═══════════ LIVE RATES ═══════════
/**
 * Fetches live exchange rates from a free API.
 * Returns rates as { GBP: 1, BRL: X, USD: X, ... } (all vs GBP).
 * Falls back to FALLBACK_RATES on error.
 */
export const fetchLiveRates = async (): Promise<Record<string, number>> => {
    try {
        // Using exchangerate.host (free, no API key required for basic usage)
        const res = await fetch('https://api.exchangerate.host/latest?base=GBP');
        if (!res.ok) throw new Error(`Rate fetch failed: ${res.status}`);
        const data = await res.json();

        if (!data.success && !data.rates) {
            // Try fallback API
            return await fetchLiveRatesFallback();
        }

        const liveRates: Record<string, number> = { GBP: 1 };
        for (const code of Object.keys(SUPPORTED_CURRENCIES)) {
            if (code === 'GBP') continue;
            liveRates[code] = data.rates?.[code] || FALLBACK_RATES[code];
        }
        return liveRates;
    } catch (err) {
        console.warn('Primary rate API failed, trying fallback...', (err as Error).message);
        return await fetchLiveRatesFallback();
    }
};

/**
 * Fallback rate fetcher using a different free API.
 */
const fetchLiveRatesFallback = async (): Promise<Record<string, number>> => {
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/GBP');
        if (!res.ok) throw new Error(`Fallback rate fetch failed: ${res.status}`);
        const data = await res.json();

        const liveRates: Record<string, number> = { GBP: 1 };
        for (const code of Object.keys(SUPPORTED_CURRENCIES)) {
            if (code === 'GBP') continue;
            liveRates[code] = data.rates?.[code] || FALLBACK_RATES[code];
        }
        return liveRates;
    } catch (err) {
        console.warn('All rate APIs failed, using fallback rates.', (err as Error).message);
        return FALLBACK_RATES;
    }
};

/**
 * Returns the fallback rates (for initial/offline use).
 */
export const getFallbackRates = (): Record<string, number> => FALLBACK_RATES;
