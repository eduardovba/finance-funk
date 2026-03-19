import { describe, it, expect } from 'vitest';
import { RegisterSchema } from '@/app/api/auth/register/route';

describe('RegisterSchema', () => {
    const validPayload = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'securePassword123',
        confirmPassword: 'securePassword123',
    };

    it('accepts valid registration data', () => {
        const result = RegisterSchema.safeParse(validPayload);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.name).toBe('Test User');
            expect(result.data.email).toBe('test@example.com');
        }
    });

    it('rejects password too short (< 6 chars)', () => {
        const result = RegisterSchema.safeParse({
            ...validPayload,
            password: '12345',
            confirmPassword: '12345',
        });
        expect(result.success).toBe(false);
    });

    it('rejects passwords that do not match', () => {
        const result = RegisterSchema.safeParse({
            ...validPayload,
            password: 'securePassword123',
            confirmPassword: 'differentPassword456',
        });
        expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
        const result = RegisterSchema.safeParse({
            ...validPayload,
            email: 'not-an-email',
        });
        expect(result.success).toBe(false);
    });

    it('rejects empty name', () => {
        const result = RegisterSchema.safeParse({
            ...validPayload,
            name: '',
        });
        expect(result.success).toBe(false);
    });

    it('rejects missing fields', () => {
        const result = RegisterSchema.safeParse({});
        expect(result.success).toBe(false);
    });

    it('rejects name exceeding 100 chars', () => {
        const result = RegisterSchema.safeParse({
            ...validPayload,
            name: 'A'.repeat(101),
        });
        expect(result.success).toBe(false);
    });

    it('accepts exactly 6 char password', () => {
        const result = RegisterSchema.safeParse({
            ...validPayload,
            password: '123456',
            confirmPassword: '123456',
        });
        expect(result.success).toBe(true);
    });
});
