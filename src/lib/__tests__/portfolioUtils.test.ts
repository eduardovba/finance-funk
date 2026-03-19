import { describe, it, expect } from 'vitest';
import { getEquitySummary, getCryptoSummary, getFixedIncomeSummary } from '../portfolioUtils';

const defaultRates = { GBP: 1, BRL: 7.10, USD: 1.28 };

describe('getEquitySummary', () => {
    it('returns proper shape for empty input', () => {
        const result = getEquitySummary([], {}, defaultRates);
        expect(result).toHaveProperty('assets');
        expect(result).toHaveProperty('total');
        expect(Array.isArray(result.assets)).toBe(true);
        expect(result.total).toHaveProperty('brl');
        expect(result.total).toHaveProperty('gbp');
    });

    it('handles a single holding', () => {
        const transactions = [
            {
                id: '1', date: '2024-01-15', asset: 'Apple Inc', ticker: 'AAPL',
                broker: 'Trading 212', currency: 'GBP', quantity: 10,
                investment: 1500, type: 'Buy', pnl: null,
            },
        ];
        const marketData = { AAPL: { price: 180, currency: 'USD' } };
        const result = getEquitySummary(transactions, marketData, defaultRates);

        expect(result.assets.length).toBeGreaterThanOrEqual(1);
        expect(result.total.gbp).toBeGreaterThan(0);
        expect(result.total.brl).toBeGreaterThan(0);
    });

    it('handles multiple holdings across brokers', () => {
        const transactions = [
            { id: '1', date: '2024-01-01', asset: 'Apple', ticker: 'AAPL', broker: 'Trading 212', currency: 'GBP', quantity: 10, investment: 1500, type: 'Buy', pnl: null },
            { id: '2', date: '2024-01-02', asset: 'PETR4', ticker: 'PETR4', broker: 'XP', currency: 'BRL', quantity: 100, investment: 3550, type: 'Buy', pnl: null },
        ];

        const result = getEquitySummary(transactions, {}, defaultRates);
        expect(result.assets.length).toBe(2);

        // Each broker should appear
        const brokerNames = result.assets.map(a => a.name);
        expect(brokerNames).toContain('Trading 212');
        expect(brokerNames).toContain('XP');
    });

    it('calculates ROI correctly', () => {
        const transactions = [
            { id: '1', date: '2024-01-01', asset: 'Cash', ticker: 'Cash', broker: 'Trading 212', currency: 'GBP', quantity: 1000, investment: 1000, type: 'Buy', pnl: null },
        ];
        const result = getEquitySummary(transactions, {}, defaultRates);
        // Cash at price=1.0, so value = 1000, cost = 1000, ROI = 0%
        const broker = result.assets.find(a => a.name === 'Trading 212');
        expect(broker).toBeDefined();
        expect(broker!.roi).toBeCloseTo(0, 0);
    });
});

describe('getCryptoSummary', () => {
    it('returns proper shape for empty input', () => {
        const result = getCryptoSummary([], {}, defaultRates);
        expect(result).toHaveProperty('assets');
        expect(result).toHaveProperty('total');
        expect(result.total).toHaveProperty('brl');
        expect(result.total).toHaveProperty('gbp');
    });

    it('calculates value with market data prices', () => {
        const transactions = [
            { id: '1', date: '2024-01-01', ticker: 'BTC', asset: 'Bitcoin', quantity: 1, investment: 40000, type: 'Buy', currency: 'USD' },
        ];
        const marketData = { 'BTC-USD': { price: 60000 } };
        const result = getCryptoSummary(transactions, marketData, defaultRates);

        expect(result.assets.length).toBe(1);
        expect(result.assets[0].name).toBe('Bitcoin');
        // Value = 60000 USD / 1.28 ≈ 46875 GBP
        expect(result.total.gbp).toBeCloseTo(46875, -2);
    });

    it('calculates ROI correctly', () => {
        const transactions = [
            { id: '1', date: '2024-01-01', ticker: 'ETH', asset: 'Ethereum', quantity: 10, investment: 20000, type: 'Buy', currency: 'USD' },
        ];
        const marketData = { 'ETH-USD': { price: 3000 } };
        const result = getCryptoSummary(transactions, marketData, defaultRates);

        // Value = 10 * 3000 = 30000 USD, Invest = 20000 USD
        // Both in GBP: val ≈ 23437.5, inv ≈ 15625. ROI = (23437.5 - 15625) / 15625 * 100 = 50%
        expect(result.assets[0].roi).toBeCloseTo(50, 0);
    });

    it('zeroes out closed positions', () => {
        const transactions = [
            { id: '1', date: '2024-01-01', ticker: 'DOGE', asset: 'Dogecoin', quantity: 1000, investment: 100, type: 'Buy', currency: 'USD' },
            { id: '2', date: '2024-02-01', ticker: 'DOGE', asset: 'Dogecoin', quantity: -1000, investment: -200, type: 'Sell', currency: 'USD' },
        ];
        const result = getCryptoSummary(transactions, {}, defaultRates);
        // Position is closed; should have 0 assets
        expect(result.assets.length).toBe(0);
    });
});

describe('getFixedIncomeSummary', () => {
    it('returns proper shape for empty input', () => {
        const result = getFixedIncomeSummary([], defaultRates);
        expect(result).toHaveProperty('assets');
        expect(result).toHaveProperty('total');
        expect(result.total).toHaveProperty('brl');
        expect(result.total).toHaveProperty('gbp');
    });

    it('handles BRL fixed income assets', () => {
        const transactions = [
            { id: '1', date: '2024-01-15', broker: 'NuBank', investment: 50000, interest: 2000, currency: 'BRL' },
        ];
        const result = getFixedIncomeSummary(transactions, defaultRates);

        expect(result.assets.length).toBeGreaterThanOrEqual(1);
        const nubank = result.assets.find(a => a.name === 'NuBank');
        expect(nubank).toBeDefined();
        // Value = (50000 + 2000) / 7.10 ≈ 7323.94 GBP
        expect(nubank!.gbp).toBeCloseTo(7323.94, 0);
    });

    it('handles GBP fixed income assets', () => {
        const transactions = [
            { id: '1', date: '2024-01-15', broker: 'Monzo', investment: 5000, interest: 250, currency: 'GBP' },
        ];
        const result = getFixedIncomeSummary(transactions, defaultRates);

        const monzo = result.assets.find(a => a.name === 'Monzo');
        expect(monzo).toBeDefined();
        // GBP asset, no conversion needed
        expect(monzo!.gbp).toBeCloseTo(5250, 0);
    });

    it('filters out assets with < 10 BRL', () => {
        const transactions = [
            { id: '1', date: '2024-01-15', broker: 'TinyBank', investment: 0.5, interest: 0.01, currency: 'GBP' },
        ];
        const result = getFixedIncomeSummary(transactions, defaultRates);
        // 0.51 GBP * 7.10 = 3.62 BRL < 10, should be filtered out
        expect(result.assets.length).toBe(0);
    });

    it('all summary functions return { assets, total } structure', () => {
        const equityResult = getEquitySummary([], {}, defaultRates);
        const cryptoResult = getCryptoSummary([], {}, defaultRates);
        const fixedResult = getFixedIncomeSummary([], defaultRates);

        for (const result of [equityResult, cryptoResult, fixedResult]) {
            expect(result).toHaveProperty('assets');
            expect(result).toHaveProperty('total');
            expect(Array.isArray(result.assets)).toBe(true);
            expect(result.total).toHaveProperty('brl');
            expect(result.total).toHaveProperty('gbp');
        }
    });
});
