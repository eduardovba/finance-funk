import { describe, it, expect } from 'vitest';
import {
    formatCurrency,
    convertCurrency,
    getFallbackRates,
    SUPPORTED_CURRENCIES,
} from '../currency';

describe('formatCurrency', () => {
    it('formats BRL correctly', () => {
        const result = formatCurrency(1234.56, 'BRL');
        expect(result).toContain('1.234,56');
    });

    it('formats GBP correctly', () => {
        const result = formatCurrency(1234.56, 'GBP');
        expect(result).toContain('1,234.56');
    });

    it('formats USD correctly', () => {
        const result = formatCurrency(1234.56, 'USD');
        expect(result).toContain('1,234.56');
    });

    it('formats EUR correctly', () => {
        const result = formatCurrency(1234.56, 'EUR');
        // EUR uses German locale (de-DE) with period as thousand sep
        expect(result).toContain('1.234,56');
    });

    it('formats JPY correctly (no decimals)', () => {
        const result = formatCurrency(1234, 'JPY');
        expect(result).toContain('1,234');
    });

    it('formats CHF correctly', () => {
        const result = formatCurrency(1234.56, 'CHF');
        expect(result).toContain('1');
        expect(result).toContain('234');
    });

    it('formats AUD correctly', () => {
        const result = formatCurrency(1234.56, 'AUD');
        expect(result).toContain('1,234.56');
    });

    it('defaults to GBP when no currency specified', () => {
        const result = formatCurrency(100);
        expect(result).toContain('100');
    });

    it('handles zero amount', () => {
        const result = formatCurrency(0, 'USD');
        expect(result).toContain('0');
    });

    it('handles negative amount', () => {
        const result = formatCurrency(-500, 'GBP');
        expect(result).toContain('500');
    });
});

describe('convertCurrency', () => {
    const rates = { GBP: 1, BRL: 7.10, USD: 1.28, EUR: 1.17, JPY: 190, CHF: 1.12, AUD: 1.96 };

    it('returns same amount when from === to', () => {
        expect(convertCurrency(100, 'BRL', 'BRL', rates)).toBe(100);
        expect(convertCurrency(50, 'GBP', 'GBP', rates)).toBe(50);
        expect(convertCurrency(0, 'USD', 'USD', rates)).toBe(0);
    });

    it('converts GBP to BRL correctly', () => {
        // 100 GBP / 1 * 7.10 = 710 BRL
        const result = convertCurrency(100, 'GBP', 'BRL', rates);
        expect(result).toBeCloseTo(710, 2);
    });

    it('converts BRL to GBP correctly', () => {
        // 710 BRL / 7.10 * 1 = 100 GBP
        const result = convertCurrency(710, 'BRL', 'GBP', rates);
        expect(result).toBeCloseTo(100, 2);
    });

    it('converts BRL to USD (cross-rate via GBP)', () => {
        // 710 BRL / 7.10 = 100 GBP; 100 GBP * 1.28 = 128 USD
        const result = convertCurrency(710, 'BRL', 'USD', rates);
        expect(result).toBeCloseTo(128, 2);
    });

    it('converts USD to EUR', () => {
        // 128 USD / 1.28 = 100 GBP; 100 GBP * 1.17 = 117 EUR
        const result = convertCurrency(128, 'USD', 'EUR', rates);
        expect(result).toBeCloseTo(117, 2);
    });

    it('handles zero amount', () => {
        expect(convertCurrency(0, 'BRL', 'USD', rates)).toBe(0);
    });

    it('falls back to rate of 1 for missing currency', () => {
        // Unknown currency treated as rate = 1 (same as GBP)
        const result = convertCurrency(100, 'GBP', 'XYZ', rates);
        // GBP->GBP base = 100 GBP, XYZ rate = 1 => 100
        expect(result).toBe(100);
    });

    it('uses fallback rates when none provided', () => {
        // Should not throw and should return a number using FALLBACK_RATES
        const result = convertCurrency(100, 'GBP', 'BRL');
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThan(0);
    });
});

describe('getFallbackRates', () => {
    it('returns an object with all supported currency keys', () => {
        const rates = getFallbackRates();
        const supportedCodes = Object.keys(SUPPORTED_CURRENCIES);

        for (const code of supportedCodes) {
            expect(rates).toHaveProperty(code);
            expect(typeof rates[code]).toBe('number');
            expect(rates[code]).toBeGreaterThan(0);
        }
    });

    it('has GBP rate equal to 1 (base currency)', () => {
        const rates = getFallbackRates();
        expect(rates.GBP).toBe(1);
    });

    it('returns consistent values across calls', () => {
        const rates1 = getFallbackRates();
        const rates2 = getFallbackRates();
        expect(rates1).toEqual(rates2);
    });
});
