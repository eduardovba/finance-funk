import { describe, it, expect } from 'vitest';
import { PostCryptoSchema, PutCryptoSchema } from '@/app/api/crypto-transactions/route';

describe('PostCryptoSchema', () => {
    const validPayload = {
        ticker: 'BTC',
        platform: 'Binance',
        date: '2024-01-15',
        type: 'Buy',
        investment: 25000,
        quantity: 0.5,
        currency: 'USD',
    };

    it('accepts valid complete payload', () => {
        const result = PostCryptoSchema.safeParse(validPayload);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.ticker).toBe('BTC');
            expect(result.data.platform).toBe('Binance');
        }
    });

    it('rejects missing ticker', () => {
        const { ticker, ...noTicker } = validPayload;
        const result = PostCryptoSchema.safeParse(noTicker);
        expect(result.success).toBe(false);
    });

    it('rejects missing platform', () => {
        const { platform, ...noPlatform } = validPayload;
        const result = PostCryptoSchema.safeParse(noPlatform);
        expect(result.success).toBe(false);
    });

    it('rejects invalid type', () => {
        const result = PostCryptoSchema.safeParse({ ...validPayload, type: 'HODL' });
        expect(result.success).toBe(false);
    });

    it('coerces string numbers', () => {
        const result = PostCryptoSchema.safeParse({
            ...validPayload,
            investment: '25000',
            quantity: '0.5',
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.investment).toBe(25000);
            expect(result.data.quantity).toBe(0.5);
        }
    });

    it('applies default for isSalaryContribution', () => {
        const result = PostCryptoSchema.safeParse(validPayload);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.isSalaryContribution).toBe(false);
        }
    });

    it('accepts Sell type', () => {
        const result = PostCryptoSchema.safeParse({ ...validPayload, type: 'Sell' });
        expect(result.success).toBe(true);
    });
});

describe('PutCryptoSchema', () => {
    const validPayload = {
        id: 1,
        date: '2024-02-01',
        type: 'Buy',
        quantity: 1.5,
        investment: 50000,
        currency: 'USD',
    };

    it('accepts valid payload', () => {
        const result = PutCryptoSchema.safeParse(validPayload);
        expect(result.success).toBe(true);
    });

    it('rejects missing id', () => {
        const { id, ...noId } = validPayload;
        const result = PutCryptoSchema.safeParse(noId);
        expect(result.success).toBe(false);
    });

    it('accepts all 4 type variants', () => {
        for (const type of ['Buy', 'Sell', 'Investment', 'Divestment']) {
            const result = PutCryptoSchema.safeParse({ ...validPayload, type });
            expect(result.success).toBe(true);
        }
    });
});
