import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createClient, type Client, type InValue } from '@libsql/client';
import { initTestDB } from '@/test/setup';

let testClient: Client;

// Mock db module to use in-memory SQLite
vi.mock('@/lib/db', async () => {
    testClient = createClient({ url: ':memory:' });
    await initTestDB(testClient);

    return {
        query: async (sql: string, params: InValue[] = []) => {
            const result = await testClient.execute({ sql, args: params });
            return result.rows;
        },
        get: async (sql: string, params: InValue[] = []) => {
            const result = await testClient.execute({ sql, args: params });
            return result.rows[0];
        },
        run: async (sql: string, params: InValue[] = []) => {
            const result = await testClient.execute({ sql, args: params });
            return {
                lastID: Number(result.lastInsertRowid ?? 0),
                changes: result.rowsAffected,
                lastInsertRowid: result.lastInsertRowid ?? BigInt(0),
                rowsAffected: result.rowsAffected,
            };
        },
    };
});

// Mock authGuard to return a fake user
vi.mock('@/lib/authGuard', () => ({
    requireAuth: async () => ({ id: 1, name: 'Test User', email: 'test@test.com' }),
}));

// Import route handlers AFTER mocks are set up
const { GET, POST, PUT, DELETE: DELETE_HANDLER } = await import('@/app/api/equity-transactions/route');

function createRequest(method: string, body?: unknown, searchParams?: Record<string, string>): Request {
    const url = new URL('http://localhost:3000/api/equity-transactions');
    if (searchParams) {
        Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const init: RequestInit = { method };
    if (body) {
        init.body = JSON.stringify(body);
        init.headers = { 'Content-Type': 'application/json' };
    }
    return new Request(url.toString(), init);
}

describe('Equity Transactions CRUD Integration', () => {
    beforeAll(async () => {
        // Re-init tables for safety
        if (testClient) await initTestDB(testClient);
    });

    beforeEach(async () => {
        // Clear data between tests
        if (testClient) {
            await testClient.execute('DELETE FROM ledger');
            await testClient.execute('DELETE FROM assets');
        }
    });

    it('POST with valid data returns 200 with success', async () => {
        const body = {
            ticker: 'AAPL',
            broker: 'Trading 212',
            date: '2024-01-15',
            type: 'Buy',
            investment: 1500,
            quantity: 10,
            currency: 'USD',
        };
        const req = createRequest('POST', body);
        const res = await POST(req as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(typeof data.id).toBe('number');
    });

    it('POST with invalid data returns 400', async () => {
        const body = {
            // missing ticker and broker
            date: '2024-01-15',
            type: 'Buy',
            investment: 1500,
            quantity: 10,
        };
        const req = createRequest('POST', body);
        const res = await POST(req as any);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBeTruthy();
    });

    it('GET returns array of transactions', async () => {
        // First create a transaction
        const body = {
            ticker: 'AAPL',
            broker: 'Trading 212',
            date: '2024-01-15',
            type: 'Buy',
            investment: 1500,
            quantity: 10,
            currency: 'USD',
        };
        await POST(createRequest('POST', body) as any);

        // Then GET
        const res = await GET();
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThanOrEqual(1);
    });

    it('PUT with valid data returns 200', async () => {
        // Create a transaction first
        const createBody = {
            ticker: 'MSFT',
            broker: 'Trading 212',
            date: '2024-01-15',
            type: 'Buy',
            investment: 2000,
            quantity: 8,
            currency: 'USD',
        };
        const createRes = await POST(createRequest('POST', createBody) as any);
        const createData = await createRes.json();

        // Update it
        const updateBody = {
            id: createData.id,
            date: '2024-02-01',
            type: 'Buy',
            investment: 2500,
            quantity: 8,
            currency: 'USD',
        };
        const res = await PUT(createRequest('PUT', updateBody) as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it('DELETE with valid id returns 200', async () => {
        // Create a transaction
        const createBody = {
            ticker: 'GOOG',
            broker: 'Trading 212',
            date: '2024-01-15',
            type: 'Buy',
            investment: 3000,
            quantity: 5,
            currency: 'USD',
        };
        const createRes = await POST(createRequest('POST', createBody) as any);
        const createData = await createRes.json();

        // Delete it
        const req = createRequest('DELETE', undefined, { id: createData.id.toString() });
        const res = await DELETE_HANDLER(req as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it('DELETE with missing id returns 400', async () => {
        const req = createRequest('DELETE');
        const res = await DELETE_HANDLER(req as any);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBeTruthy();
    });
});
