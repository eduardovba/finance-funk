import { describe, it, expect } from 'vitest';
import { normalizeTransactions, calculateMonthlyInvestments } from '../ledgerUtils';

describe('normalizeTransactions', () => {
    const defaultRates = { GBP: 1, BRL: 7.10, USD: 1.28 };

    it('returns empty array for empty input', () => {
        const result = normalizeTransactions({}, defaultRates);
        expect(result).toEqual([]);
    });

    it('normalizes a single equity buy transaction', () => {
        const result = normalizeTransactions({
            equity: [{
                id: 'eq-1',
                date: '2024-01-15',
                ticker: 'AAPL',
                broker: 'Trading 212',
                type: 'Buy',
                quantity: 10,
                investment: 1500,
                currency: 'GBP',
            }],
        }, defaultRates);

        expect(result).toHaveLength(1);
        expect(result[0].category).toBe('Equity');
        expect(result[0].type).toBe('Investment');
        expect(result[0].date).toBe('2024-01-15');
        expect(result[0].currency).toBe('GBP');
        expect(result[0].flow).toBeLessThan(0); // Buy = outflow
    });

    it('normalizes equity sell as Divestment', () => {
        const result = normalizeTransactions({
            equity: [{
                id: 'eq-2',
                date: '2024-02-01',
                ticker: 'MSFT',
                broker: 'XP',
                type: 'Sell',
                quantity: 5,
                investment: 2000,
                currency: 'BRL',
            }],
        }, defaultRates);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('Divestment');
        expect(result[0].flow).toBeGreaterThan(0); // Sell = inflow
    });

    it('normalizes crypto transactions', () => {
        const result = normalizeTransactions({
            crypto: [{
                id: 'cr-1',
                date: '2024-03-01',
                ticker: 'BTC',
                type: 'Buy',
                quantity: 0.5,
                investment: 25000,
                currency: 'USD',
            }],
        }, defaultRates);

        expect(result).toHaveLength(1);
        expect(result[0].category).toBe('Crypto');
        expect(result[0].type).toBe('Investment');
    });

    it('normalizes mixed asset classes', () => {
        const result = normalizeTransactions({
            equity: [{ id: 'eq-1', date: '2024-01-15', ticker: 'AAPL', broker: 'T212', type: 'Buy', quantity: 10, investment: 1500, currency: 'GBP' }],
            crypto: [{ id: 'cr-1', date: '2024-01-20', ticker: 'ETH', type: 'Buy', quantity: 2, investment: 5000, currency: 'USD' }],
            pensions: [{ id: 'pn-1', date: '2024-01-25', asset: 'L&G Global', broker: 'L&G', type: 'Buy', value: 500, quantity: 100 }],
            debt: [{ id: 'db-1', date: '2024-02-01', lender: 'Bank', value_brl: 1000 }],
        }, defaultRates);

        expect(result.length).toBe(4);
        const categories = result.map(t => t.category);
        expect(categories).toContain('Equity');
        expect(categories).toContain('Crypto');
        expect(categories).toContain('Pension');
        expect(categories).toContain('Debt');
    });

    it('applies currency conversion during normalization', () => {
        const result = normalizeTransactions({
            equity: [{
                id: 'eq-1',
                date: '2024-01-15',
                ticker: 'PETR4',
                broker: 'XP',
                type: 'Buy',
                quantity: 100,
                investment: 7100,
                currency: 'BRL',
            }],
        }, defaultRates);

        // 7100 BRL / 7.10 = 1000 GBP
        expect(result[0].flow).toBeCloseTo(-1000, 0);
        expect(result[0].currency).toBe('GBP');
    });

    it('sorts results by date descending', () => {
        const result = normalizeTransactions({
            equity: [
                { id: 'eq-1', date: '2024-01-15', ticker: 'A', broker: 'B', type: 'Buy', quantity: 1, investment: 100, currency: 'GBP' },
                { id: 'eq-2', date: '2024-03-15', ticker: 'C', broker: 'D', type: 'Buy', quantity: 1, investment: 100, currency: 'GBP' },
                { id: 'eq-3', date: '2024-02-15', ticker: 'E', broker: 'F', type: 'Buy', quantity: 1, investment: 100, currency: 'GBP' },
            ],
        }, defaultRates);

        expect(result[0].date).toBe('2024-03-15');
        expect(result[1].date).toBe('2024-02-15');
        expect(result[2].date).toBe('2024-01-15');
    });

    it('handles DD/MM/YYYY date format', () => {
        const result = normalizeTransactions({
            equity: [{
                id: 'eq-1',
                date: '15/01/2024',
                ticker: 'X',
                broker: 'Y',
                type: 'Buy',
                quantity: 1,
                investment: 100,
                currency: 'GBP',
            }],
        }, defaultRates);

        expect(result[0].date).toBe('2024-01-15');
    });
});

describe('calculateMonthlyInvestments', () => {
    it('returns array for empty inputs', () => {
        const result = calculateMonthlyInvestments([], []);
        expect(Array.isArray(result)).toBe(true);
    });

    it('includes historical data', () => {
        const historical = [
            { month: '2024-01', equity: 1000, fixedIncome: 500, realEstate: 0, pensions: 0, crypto: 0, debt: 0 },
        ];
        const result = calculateMonthlyInvestments([], historical);
        const jan = result.find(d => d.month === '2024-01');
        expect(jan).toBeDefined();
        expect(jan!.equity).toBe(1000);
        expect(jan!.fixedIncome).toBe(500);
    });

    it('adds live transactions to non-historical months', () => {
        const transactions = [
            { date: '2099-01-15', flow: -500, category: 'Equity' },
            { date: '2099-01-20', flow: -300, category: 'Crypto' },
        ];
        const result = calculateMonthlyInvestments(transactions, []);
        const month = result.find(d => d.month === '2099-01');
        expect(month).toBeDefined();
        // flow is negated (-(-500) = 500)
        expect(month!.equity).toBe(500);
        expect(month!.crypto).toBe(300);
    });

    it('computes totals', () => {
        const historical = [
            { month: '2024-01', equity: 1000, fixedIncome: 500, realEstate: 200, pensions: 100, crypto: 50, debt: 25 },
        ];
        const result = calculateMonthlyInvestments([], historical);
        const jan = result.find(d => d.month === '2024-01');
        expect(jan!.total).toBe(1875);
    });
});
