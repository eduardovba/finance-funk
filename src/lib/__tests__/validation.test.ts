import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
    validateBody,
    validateId,
    dateField,
    currencyField,
    optionalNumber,
    monthField,
    transactionType,
    positiveNumber,
    optionalString,
    requiredString,
} from '../validation';

describe('validateBody', () => {
    const testSchema = z.object({
        name: z.string().min(1),
        age: z.coerce.number().positive(),
    });

    it('returns data for valid input', () => {
        const { data, error } = validateBody(testSchema, { name: 'Alice', age: 30 });
        expect(error).toBeNull();
        expect(data).toEqual({ name: 'Alice', age: 30 });
    });

    it('returns error for invalid input', () => {
        const { data, error } = validateBody(testSchema, { name: '', age: -1 });
        expect(data).toBeNull();
        expect(error).toBeTruthy();
        expect(typeof error).toBe('string');
    });

    it('returns error for missing fields', () => {
        const { data, error } = validateBody(testSchema, {});
        expect(data).toBeNull();
        expect(error).toBeTruthy();
    });

    it('coerces string numbers', () => {
        const { data, error } = validateBody(testSchema, { name: 'Bob', age: '25' });
        expect(error).toBeNull();
        expect(data!.age).toBe(25);
    });
});

describe('validateId', () => {
    it('accepts valid numeric string', () => {
        const { id, error } = validateId('123');
        expect(error).toBeNull();
        expect(id).toBe('123');
    });

    it('rejects null', () => {
        const { id, error } = validateId(null);
        expect(id).toBeNull();
        expect(error).toBeTruthy();
    });

    it('rejects empty string', () => {
        const { id, error } = validateId('');
        expect(id).toBeNull();
        expect(error).toBeTruthy();
    });

    it('rejects "abc"', () => {
        const { id, error } = validateId('abc');
        expect(id).toBeNull();
        expect(error).toBeTruthy();
    });

    it('accepts "0"', () => {
        // 0 is a valid number but isNaN(0) is false, so it should pass
        const { id, error } = validateId('0');
        expect(error).toBeNull();
        expect(id).toBe('0');
    });
});

describe('dateField', () => {
    it('accepts YYYY-MM-DD format', () => {
        const result = dateField.safeParse('2024-01-15');
        expect(result.success).toBe(true);
    });

    it('rejects "not-a-date"', () => {
        const result = dateField.safeParse('not-a-date');
        expect(result.success).toBe(false);
    });

    it('rejects non-zero-padded date "2024-1-5"', () => {
        const result = dateField.safeParse('2024-1-5');
        expect(result.success).toBe(false);
    });

    it('rejects empty string', () => {
        const result = dateField.safeParse('');
        expect(result.success).toBe(false);
    });
});

describe('monthField', () => {
    it('accepts YYYY-MM format', () => {
        const result = monthField.safeParse('2024-01');
        expect(result.success).toBe(true);
    });

    it('rejects YYYY-MM-DD', () => {
        const result = monthField.safeParse('2024-01-15');
        expect(result.success).toBe(false);
    });
});

describe('currencyField', () => {
    it('accepts "USD"', () => {
        const result = currencyField.safeParse('USD');
        expect(result.success).toBe(true);
    });

    it('accepts "BRL"', () => {
        const result = currencyField.safeParse('BRL');
        expect(result.success).toBe(true);
    });

    it('rejects empty string', () => {
        const result = currencyField.safeParse('');
        expect(result.success).toBe(false);
    });

    it('defaults to "USD" when using default', () => {
        const schema = z.object({ currency: currencyField.default('USD') });
        const result = schema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.currency).toBe('USD');
        }
    });
});

describe('optionalNumber', () => {
    it('accepts 42', () => {
        const result = optionalNumber.safeParse(42);
        expect(result.success).toBe(true);
    });

    it('accepts null', () => {
        const result = optionalNumber.safeParse(null);
        expect(result.success).toBe(true);
    });

    it('accepts undefined', () => {
        const result = optionalNumber.safeParse(undefined);
        expect(result.success).toBe(true);
    });

    it('coerces string "42" to 42', () => {
        const result = optionalNumber.safeParse('42');
        expect(result.success).toBe(true);
    });
});

describe('transactionType', () => {
    it('accepts valid types', () => {
        const validTypes = ['Buy', 'Sell', 'Investment', 'Divestment', 'Interest', 'Dividend', 'Deposit', 'Withdrawal'];
        for (const type of validTypes) {
            const result = transactionType.safeParse(type);
            expect(result.success).toBe(true);
        }
    });

    it('rejects invalid type', () => {
        const result = transactionType.safeParse('Transfer');
        expect(result.success).toBe(false);
    });
});

describe('positiveNumber', () => {
    it('accepts positive number', () => {
        expect(positiveNumber.safeParse(1).success).toBe(true);
    });

    it('rejects zero', () => {
        expect(positiveNumber.safeParse(0).success).toBe(false);
    });

    it('rejects negative', () => {
        expect(positiveNumber.safeParse(-5).success).toBe(false);
    });
});

describe('requiredString', () => {
    it('accepts non-empty string', () => {
        expect(requiredString.safeParse('hello').success).toBe(true);
    });

    it('rejects empty string', () => {
        expect(requiredString.safeParse('').success).toBe(false);
    });
});
