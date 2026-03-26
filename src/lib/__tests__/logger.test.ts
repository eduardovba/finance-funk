import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '../logger';

describe('logger', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('error', () => {
        it('logs formatted error with context tag', () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
            logger.error('TestCtx', new Error('boom'));
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy.mock.calls[0][0]).toContain('[TestCtx]');
            expect(spy.mock.calls[0][0]).toContain('boom');
        });

        it('handles string errors', () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
            logger.error('TestCtx', 'string-error');
            expect(spy.mock.calls[0][0]).toContain('string-error');
        });

        it('includes meta in output', () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
            logger.error('TestCtx', 'err', { action: 'GET', userId: 42 });
            expect(spy.mock.calls[0][0]).toContain('action');
            expect(spy.mock.calls[0][0]).toContain('GET');
        });
    });

    describe('warn', () => {
        it('logs with context tag', () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            logger.warn('Cache', 'stale data');
            expect(spy.mock.calls[0][0]).toBe('[Cache] stale data');
        });
    });

    describe('info', () => {
        it('logs with context tag', () => {
            const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
            logger.info('API', 'request received');
            expect(spy.mock.calls[0][0]).toBe('[API] request received');
        });
    });
});
