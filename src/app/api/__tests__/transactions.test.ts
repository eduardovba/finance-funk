import { describe, it, expect, vi } from 'vitest';

// Mock modules that route files depend on
vi.mock('next/server', () => ({
    NextRequest: class {},
    NextResponse: { json: (data: any, init?: any) => new Response(JSON.stringify(data), init) },
}));
vi.mock('@/lib/db', () => ({ query: vi.fn(), run: vi.fn(), get: vi.fn() }));
vi.mock('@/lib/authGuard', () => ({ requireAuth: vi.fn() }));

const { PostTransactionSchema, PutTransactionSchema } = await import('@/app/api/transactions/route');

describe('PostTransactionSchema', () => {
    const validPayload = {
        date: '2024-01-15',
        description: 'NuBank CDB',
        account: 'NuBank',
        type: 'Investment',
        amount: 5000,
        currency: 'BRL',
    };

    it('accepts valid payload', () => {
        const result = PostTransactionSchema.safeParse(validPayload);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.date).toBe('2024-01-15');
            expect(result.data.description).toBe('NuBank CDB');
        }
    });

    it('rejects invalid date', () => {
        const result = PostTransactionSchema.safeParse({ ...validPayload, date: 'not-a-date' });
        expect(result.success).toBe(false);
    });

    it('accepts minimal payload (only date required)', () => {
        const result = PostTransactionSchema.safeParse({ date: '2024-01-15' });
        expect(result.success).toBe(true);
    });

    it('applies defaults', () => {
        const result = PostTransactionSchema.safeParse({ date: '2024-01-15' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.type).toBe('Investment');
            expect(result.data.isSalaryContribution).toBe(false);
        }
    });

    it('accepts interest field', () => {
        const result = PostTransactionSchema.safeParse({
            ...validPayload,
            interest: 250,
        });
        expect(result.success).toBe(true);
    });

    it('accepts null optional fields', () => {
        const result = PostTransactionSchema.safeParse({
            date: '2024-01-15',
            description: null,
            account: null,
            amount: null,
        });
        expect(result.success).toBe(true);
    });
});

describe('PutTransactionSchema', () => {
    const validPayload = {
        id: 42,
        date: '2024-01-15',
        type: 'Investment',
        investment: 5000,
        currency: 'BRL',
    };

    it('accepts valid payload', () => {
        const result = PutTransactionSchema.safeParse(validPayload);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.id).toBe(42);
        }
    });

    it('rejects missing id', () => {
        const { id, ...noId } = validPayload;
        const result = PutTransactionSchema.safeParse(noId);
        expect(result.success).toBe(false);
    });

    it('rejects missing date', () => {
        const { date, ...noDate } = validPayload;
        const result = PutTransactionSchema.safeParse(noDate);
        expect(result.success).toBe(false);
    });

    it('coerces string id', () => {
        const result = PutTransactionSchema.safeParse({ ...validPayload, id: '42' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.id).toBe(42);
        }
    });

    it('accepts asset_id', () => {
        const result = PutTransactionSchema.safeParse({ ...validPayload, asset_id: 10 });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.asset_id).toBe(10);
        }
    });
});
