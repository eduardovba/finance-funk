import { describe, it, expect, vi } from 'vitest';

// Mock modules that route files depend on (so we can import schemas without side effects)
vi.mock('next/server', () => ({
    NextRequest: class {},
    NextResponse: { json: (data: any, init?: any) => new Response(JSON.stringify(data), init) },
}));
vi.mock('@/lib/db', () => ({ query: vi.fn(), run: vi.fn(), get: vi.fn() }));
vi.mock('@/lib/authGuard', () => ({ requireAuth: vi.fn() }));

const { PostEquitySchema, PutEquitySchema } = await import('@/app/api/equity-transactions/route');

describe('PostEquitySchema', () => {
    const validPayload = {
        ticker: 'AAPL',
        broker: 'Trading 212',
        date: '2024-01-15',
        type: 'Buy',
        investment: 1500,
        quantity: 10,
        currency: 'USD',
    };

    it('accepts valid complete payload', () => {
        const result = PostEquitySchema.safeParse(validPayload);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.ticker).toBe('AAPL');
            expect(result.data.investment).toBe(1500);
            expect(result.data.quantity).toBe(10);
        }
    });

    it('applies default values', () => {
        const result = PostEquitySchema.safeParse(validPayload);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.is_salary_contribution).toBe(false);
            expect(result.data.isSalaryContribution).toBe(false);
        }
    });

    it('rejects missing ticker', () => {
        const { ticker, ...noTicker } = validPayload;
        const result = PostEquitySchema.safeParse(noTicker);
        expect(result.success).toBe(false);
    });

    it('rejects missing broker', () => {
        const { broker, ...noBroker } = validPayload;
        const result = PostEquitySchema.safeParse(noBroker);
        expect(result.success).toBe(false);
    });

    it('rejects invalid date format', () => {
        const result = PostEquitySchema.safeParse({ ...validPayload, date: '15-01-2024' });
        expect(result.success).toBe(false);
    });

    it('rejects invalid type', () => {
        const result = PostEquitySchema.safeParse({ ...validPayload, type: 'Hold' });
        expect(result.success).toBe(false);
    });

    it('coerces string numbers for investment', () => {
        const result = PostEquitySchema.safeParse({ ...validPayload, investment: '1500' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.investment).toBe(1500);
        }
    });

    it('coerces string numbers for quantity', () => {
        const result = PostEquitySchema.safeParse({ ...validPayload, quantity: '10' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.quantity).toBe(10);
        }
    });

    it('accepts optional fields as null/undefined', () => {
        const result = PostEquitySchema.safeParse({
            ...validPayload,
            asset: null,
            pnl: null,
            roiPercent: undefined,
            costPerShare: undefined,
        });
        expect(result.success).toBe(true);
    });
});

describe('PutEquitySchema', () => {
    const validPayload = {
        id: 1,
        date: '2024-01-15',
        type: 'Buy',
        quantity: 10,
        investment: 1500,
        currency: 'USD',
    };

    it('accepts valid payload with id', () => {
        const result = PutEquitySchema.safeParse(validPayload);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.id).toBe(1);
        }
    });

    it('rejects missing id', () => {
        const { id, ...noId } = validPayload;
        const result = PutEquitySchema.safeParse(noId);
        expect(result.success).toBe(false);
    });

    it('accepts Investment and Divestment types', () => {
        expect(PutEquitySchema.safeParse({ ...validPayload, type: 'Investment' }).success).toBe(true);
        expect(PutEquitySchema.safeParse({ ...validPayload, type: 'Divestment' }).success).toBe(true);
    });

    it('coerces string id', () => {
        const result = PutEquitySchema.safeParse({ ...validPayload, id: '42' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.id).toBe(42);
        }
    });
});
