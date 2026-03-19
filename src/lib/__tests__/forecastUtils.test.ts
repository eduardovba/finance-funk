import { describe, it, expect } from 'vitest';
import { getMonthDiff, calculateFV, calculatePMT, parseDate } from '../forecastUtils';

describe('getMonthDiff', () => {
    it('returns 0 for same month', () => {
        const d = new Date(2024, 0, 1);
        expect(getMonthDiff(d, d)).toBe(0);
    });

    it('returns 1 for one month apart', () => {
        const d1 = new Date(2024, 0, 1);
        const d2 = new Date(2024, 1, 1);
        expect(getMonthDiff(d1, d2)).toBe(1);
    });

    it('returns 12 for one year apart', () => {
        const d1 = new Date(2024, 0, 1);
        const d2 = new Date(2025, 0, 1);
        expect(getMonthDiff(d1, d2)).toBe(12);
    });

    it('handles cross-year boundaries', () => {
        const d1 = new Date(2024, 10, 1); // Nov 2024
        const d2 = new Date(2025, 2, 1);  // Mar 2025
        expect(getMonthDiff(d1, d2)).toBe(4);
    });

    it('returns negative for reversed dates', () => {
        const d1 = new Date(2025, 0, 1);
        const d2 = new Date(2024, 0, 1);
        expect(getMonthDiff(d1, d2)).toBe(-12);
    });
});

describe('calculateFV', () => {
    it('calculates simple compound growth (no PMT)', () => {
        // FV = 10000 * (1.01)^12 = 10000 * 1.12682503... ≈ 11268.25
        const result = calculateFV(10000, 0.01, 12, 0);
        expect(result).toBeCloseTo(11268.25, 0);
    });

    it('calculates with regular contributions', () => {
        // FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
        // FV = 10000*(1.01)^12 + 1000*((1.01)^12 - 1)/0.01
        // FV ≈ 11268.25 + 1000*12.6825 ≈ 11268.25 + 12682.50 ≈ 23950.75
        const result = calculateFV(10000, 0.01, 12, 1000);
        expect(result).toBeCloseTo(23950.75, 0);
    });

    it('handles zero interest rate', () => {
        // When r ≈ 0: FV = PV + pmt * n
        const result = calculateFV(10000, 0, 12, 1000);
        expect(result).toBeCloseTo(22000, 2);
    });

    it('handles very small interest rate near zero', () => {
        const result = calculateFV(10000, 1e-12, 12, 1000);
        expect(result).toBeCloseTo(22000, 0);
    });

    it('reproduces known financial calculator result', () => {
        // PV=50000, r=0.005 (0.5%/mo), n=60, pmt=500
        // FV = 50000*(1.005)^60 + 500*((1.005)^60 -1)/0.005
        // (1.005)^60 ≈ 1.34885
        // FV ≈ 50000*1.34885 + 500*(0.34885/0.005) ≈ 67442.5 + 34885 ≈ 102327.5
        const result = calculateFV(50000, 0.005, 60, 500);
        expect(result).toBeCloseTo(102327.5, -1); // within ~10
    });
});

describe('calculatePMT', () => {
    it('calculates known PMT to reach a specific FV', () => {
        // To grow from PV=0 to FV=12000 over n=12 months at r=0 => PMT = 1000
        const result = calculatePMT(12000, 0, 0, 12);
        expect(result).toBeCloseTo(1000, 2);
    });

    it('handles zero interest rate', () => {
        // PMT = (FV - PV) / n
        const result = calculatePMT(22000, 10000, 0, 12);
        expect(result).toBeCloseTo(1000, 2);
    });

    it('is the inverse of calculateFV', () => {
        // Calculate PMT needed to go from PV=10000 to FV=50000 in 24 months at 1%/mo
        const pmt = calculatePMT(50000, 10000, 0.01, 24);
        // Verify: using that PMT, FV should be ~50000
        const fv = calculateFV(10000, 0.01, 24, pmt);
        expect(fv).toBeCloseTo(50000, 0);
    });

    it('returns positive PMT for growing portfolio', () => {
        const pmt = calculatePMT(100000, 50000, 0.005, 36);
        expect(pmt).toBeGreaterThan(0);
    });
});

describe('parseDate', () => {
    it('parses "Jan/2024" correctly', () => {
        const result = parseDate('Jan/2024');
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(0); // January = 0
    });

    it('parses "Dec/2026" correctly', () => {
        const result = parseDate('Dec/2026');
        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(11); // December = 11
    });

    it('parses "Sept/2025" correctly', () => {
        const result = parseDate('Sept/2025');
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(8); // September = 8
    });

    it('returns current date for null input', () => {
        const before = new Date();
        const result = parseDate(null);
        const after = new Date();
        expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(result.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('returns current date for undefined input', () => {
        const result = parseDate(undefined);
        expect(result instanceof Date).toBe(true);
        // Should be roughly "now"
        expect(Math.abs(result.getTime() - Date.now())).toBeLessThan(1000);
    });
});
