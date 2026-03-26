/**
 * Structured logger — thin wrapper around console with context tags.
 *
 * Prepends [context] to every log for easy grep.
 * In production, hides stack traces from error serialization.
 * Ready for future Sentry/LogFlare integration via a single hook point.
 */

const isDev = process.env.NODE_ENV === 'development';

function formatError(err: unknown): string {
    if (err instanceof Error) {
        return isDev ? `${err.message}\n${err.stack}` : err.message;
    }
    if (typeof err === 'string') return err;
    try { return JSON.stringify(err); } catch { return String(err); }
}

function formatMeta(meta?: Record<string, unknown>): string {
    if (!meta || Object.keys(meta).length === 0) return '';
    try { return ` ${JSON.stringify(meta)}`; } catch { return ''; }
}

export const logger = {
    error(context: string, error: unknown, meta?: Record<string, unknown>) {
        console.error(`[${context}] ${formatError(error)}${formatMeta(meta)}`);
        // Future: Sentry.captureException(error, { tags: { context }, extra: meta });
    },

    warn(context: string, message: string, meta?: Record<string, unknown>) {
        console.warn(`[${context}] ${message}${formatMeta(meta)}`);
    },

    info(context: string, message: string, meta?: Record<string, unknown>) {
        console.log(`[${context}] ${message}${formatMeta(meta)}`);
    },

    debug(context: string, message: string, meta?: Record<string, unknown>) {
        if (isDev) {
            console.log(`[${context}] ${message}${formatMeta(meta)}`);
        }
    },
};
