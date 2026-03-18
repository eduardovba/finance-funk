import { z } from 'zod';

/**
 * Validate request body against a Zod schema.
 * Returns { data, error }. If error, caller should return 400.
 */
export function validateBody(schema, body) {
    const result = schema.safeParse(body);
    if (!result.success) {
        const message = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
        return { data: null, error: message };
    }
    return { data: result.data, error: null };
}

/**
 * Validate a single search param as a positive integer ID.
 */
export function validateId(idString) {
    if (!idString || isNaN(Number(idString))) {
        return { id: null, error: 'Valid numeric ID is required' };
    }
    return { id: idString, error: null };
}

// Common field schemas reused across routes
export const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format');
export const monthField = z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format');
export const currencyField = z.string().min(1).max(5).default('USD');
export const transactionType = z.enum(['Buy', 'Sell', 'Investment', 'Divestment', 'Interest', 'Dividend', 'Deposit', 'Withdrawal']);
export const positiveNumber = z.coerce.number().positive();
export const optionalNumber = z.coerce.number().optional().nullable();
export const optionalString = z.string().optional().nullable();
export const requiredString = z.string().min(1, 'Required');
