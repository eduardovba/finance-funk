import { describe, it, expect } from 'vitest';
import { GoogleFinanceProvider, getMarketDataProvider } from '../marketDataProvider';
import type { MarketDataProvider, MarketDataResult } from '../marketDataProvider';

describe('MarketDataProvider', () => {
    describe('GoogleFinanceProvider', () => {
        it('implements the MarketDataProvider interface', () => {
            const provider: MarketDataProvider = new GoogleFinanceProvider();
            expect(provider.name).toBe('Google Finance');
            expect(typeof provider.fetchQuote).toBe('function');
        });
    });

    describe('getMarketDataProvider', () => {
        it('returns a GoogleFinanceProvider by default', () => {
            const provider = getMarketDataProvider();
            expect(provider.name).toBe('Google Finance');
        });

        it('returned provider has fetchQuote method', () => {
            const provider = getMarketDataProvider();
            expect(typeof provider.fetchQuote).toBe('function');
        });
    });

    describe('MarketDataResult type contract', () => {
        it('accepts a valid result shape', () => {
            const result: MarketDataResult = {
                symbol: 'AAPL',
                price: 150.25,
                changePercent: 1.5,
                change1M: 5.2,
                currency: 'USD'
            };
            expect(result.symbol).toBe('AAPL');
            expect(result.price).toBe(150.25);
            expect(result.currency).toBe('USD');
        });
    });
});
