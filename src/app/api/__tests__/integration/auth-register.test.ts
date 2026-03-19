import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient, type Client, type InValue } from '@libsql/client';
import { initTestDB } from '@/test/setup';

let testClient: Client;

// Mock db module — needed because the route file imports from @/lib/db via @/lib/users
vi.mock('@/lib/db', async () => {
    testClient = createClient({ url: ':memory:' });
    await testClient.execute('PRAGMA foreign_keys = OFF');
    await initTestDB(testClient);

    return {
        query: async (sql: string, params: InValue[] = []) => {
            const result = await testClient.execute({ sql, args: params });
            return result.rows;
        },
        get: async (sql: string, params: InValue[] = []) => {
            const result = await testClient.execute({ sql, args: params });
            return result.rows[0] ?? undefined;
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

// The register route imports createUser and findUserByEmail from @/lib/users
// which in turn imports from @/lib/db. Since we've mocked @/lib/db above,
// the actual users.ts module will use our mock. No separate users mock needed.

const { POST } = await import('@/app/api/auth/register/route');

function createRequest(body: unknown): Request {
    return new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('Auth Register Integration', () => {
    beforeEach(async () => {
        if (testClient) {
            await testClient.execute('DELETE FROM users');
        }
    });

    it('creates a new user with valid data → 201', async () => {
        const body = {
            name: 'Test User',
            email: 'newuser@example.com',
            password: 'securePass123',
            confirmPassword: 'securePass123',
        };
        const res = await POST(createRequest(body) as any);
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(data.message).toContain('Account created');
        expect(data.user.email).toBe('newuser@example.com');
    });

    it('returns 409 for duplicate email', async () => {
        const body = {
            name: 'First User',
            email: 'dupe@example.com',
            password: 'securePass123',
            confirmPassword: 'securePass123',
        };

        // Create first user
        const first = await POST(createRequest(body) as any);
        expect(first.status).toBe(201);

        // Attempt duplicate
        const body2 = {
            name: 'Second User',
            email: 'dupe@example.com',
            password: 'anotherPass456',
            confirmPassword: 'anotherPass456',
        };
        const res = await POST(createRequest(body2) as any);
        const data = await res.json();

        expect(res.status).toBe(409);
        expect(data.error).toContain('already exists');
    });

    it('returns 400 for invalid data (password mismatch)', async () => {
        const body = {
            name: 'Test User',
            email: 'test@example.com',
            password: 'securePass123',
            confirmPassword: 'differentPassword',
        };
        const res = await POST(createRequest(body) as any);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBeTruthy();
    });

    it('returns 400 for invalid email', async () => {
        const body = {
            name: 'Test User',
            email: 'not-an-email',
            password: 'securePass123',
            confirmPassword: 'securePass123',
        };
        const res = await POST(createRequest(body) as any);

        expect(res.status).toBe(400);
    });
});
