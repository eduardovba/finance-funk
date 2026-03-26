import { describe, it, expect, vi } from 'vitest';
import { apiError } from '../apiError';

describe('apiError', () => {
    it('returns JSON response with the given message', async () => {
        const res = apiError('Something went wrong');
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBe('Something went wrong');
    });

    it('uses custom status code', async () => {
        const res = apiError('Not found', 404);
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error).toBe('Not found');
    });

    it('includes details in development mode', async () => {
        vi.stubEnv('NODE_ENV', 'development');

        const res = apiError('fail', 500, new Error('internal detail'));
        const body = await res.json();
        expect(body.details).toBe('internal detail');

        vi.unstubAllEnvs();
    });

    it('hides details in production mode', async () => {
        vi.stubEnv('NODE_ENV', 'production');

        const res = apiError('fail', 500, new Error('secret'));
        const body = await res.json();
        expect(body.details).toBeUndefined();

        vi.unstubAllEnvs();
    });

    it('handles string details', async () => {
        vi.stubEnv('NODE_ENV', 'development');

        const res = apiError('fail', 500, 'string detail');
        const body = await res.json();
        expect(body.details).toBe('string detail');

        vi.unstubAllEnvs();
    });
});
