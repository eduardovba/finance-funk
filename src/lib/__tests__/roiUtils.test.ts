import { describe, it, expect } from 'vitest';
import { calculateTWRHistory } from '../roiUtils';

describe('calculateTWRHistory', () => {
    const defaultRates = { GBP: 1, BRL: 7.10, USD: 1.28 };

    it('returns empty object for empty snapshots', () => {
        expect(calculateTWRHistory([], [], defaultRates)).toEqual({});
    });

    it('returns empty object for null/undefined snapshots', () => {
        expect(calculateTWRHistory(null as any, [], defaultRates)).toEqual({});
    });

    it('returns 0% TWR for a single snapshot', () => {
        const snapshots = [{ month: '2024-01', networthGBP: 10000 }];
        const result = calculateTWRHistory(snapshots, [], defaultRates);
        expect(result['2024-01']).toBe(0);
    });

    it('calculates pure market return with two snapshots, no investments', () => {
        const snapshots = [
            { month: '2024-01', networthGBP: 10000 },
            { month: '2024-02', networthGBP: 10500 },
        ];
        const result = calculateTWRHistory(snapshots, [], defaultRates);
        // Period return = (10500 - 0) / 10000 - 1 = 0.05 = 5%
        expect(result['2024-02']).toBeCloseTo(5, 1);
    });

    it('isolates market return from cash flows with TWR', () => {
        const snapshots = [
            { month: '2024-01', networthGBP: 10000 },
            { month: '2024-02', networthGBP: 12000 },
        ];
        const investments = [
            { month: '2024-02', total: 1000 },
        ];
        // Period return = (12000 - 1000) / 10000 - 1 = 11000/10000 - 1 = 0.10 = 10%
        const result = calculateTWRHistory(snapshots, investments, defaultRates);
        expect(result['2024-02']).toBeCloseTo(10, 1);
    });

    it('compounds correctly across 3+ periods', () => {
        const snapshots = [
            { month: '2024-01', networthGBP: 10000 },
            { month: '2024-02', networthGBP: 11000 }, // +10% market
            { month: '2024-03', networthGBP: 12100 }, // +10% market
        ];
        // Period 1: (11000 - 0) / 10000 - 1 = 0.10
        // Period 2: (12100 - 0) / 11000 - 1 = 0.10
        // Cumulative: (1.10 * 1.10 - 1) * 100 = 21%
        const result = calculateTWRHistory(snapshots, [], defaultRates);
        expect(result['2024-03']).toBeCloseTo(21, 0);
    });

    it('handles negative returns', () => {
        const snapshots = [
            { month: '2024-01', networthGBP: 10000 },
            { month: '2024-02', networthGBP: 9000 },
        ];
        // Period return = 9000 / 10000 - 1 = -0.10 = -10%
        const result = calculateTWRHistory(snapshots, [], defaultRates);
        expect(result['2024-02']).toBeCloseTo(-10, 1);
    });

    it('falls back to networthBRL with impliedRate when networthGBP is missing', () => {
        const snapshots = [
            { month: '2024-01', networthBRL: 71000, impliedRate: 7.10 },
            { month: '2024-02', networthBRL: 78100, impliedRate: 7.10 },
        ];
        // GBP values: 10000, 11000 => +10%
        const result = calculateTWRHistory(snapshots, [], defaultRates);
        expect(result['2024-02']).toBeCloseTo(10, 0);
    });

    it('uses asset category sum when total is missing for investments', () => {
        const snapshots = [
            { month: '2024-01', networthGBP: 10000 },
            { month: '2024-02', networthGBP: 12500 },
        ];
        const investments = [
            { month: '2024-02', equity: 500, fixedIncome: 300, crypto: 200 },
        ];
        // Cash flow = 500 + 300 + 200 = 1000
        // Period return = (12500 - 1000) / 10000 - 1 = 0.15 = 15%
        const result = calculateTWRHistory(snapshots, investments, defaultRates);
        expect(result['2024-02']).toBeCloseTo(15, 1);
    });
});
