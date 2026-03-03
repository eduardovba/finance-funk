import { get, run } from './db';
import bcrypt from 'bcryptjs';

/**
 * Find a user by email address.
 */
export async function findUserByEmail(email) {
    return get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
}

/**
 * Create a new user with email/password credentials.
 * Password is hashed with bcrypt before storage.
 */
export async function createUser({ name, email, password }) {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await run(
        'INSERT INTO users (name, email, password_hash, provider) VALUES (?, ?, ?, ?)',
        [name, email.toLowerCase(), passwordHash, 'credentials']
    );
    return {
        id: result.lastID,
        name,
        email: email.toLowerCase(),
        provider: 'credentials'
    };
}

/**
 * Find or create a user from an OAuth provider (Google).
 * If the user already exists (by email), return them.
 * Otherwise, create a new user without a password.
 */
export async function findOrCreateOAuthUser({ name, email, provider }) {
    let user = await findUserByEmail(email);

    if (!user) {
        const result = await run(
            'INSERT INTO users (name, email, provider) VALUES (?, ?, ?)',
            [name, email.toLowerCase(), provider]
        );
        user = {
            id: result.lastID,
            name,
            email: email.toLowerCase(),
            provider
        };
    }

    return user;
}

/**
 * Verify a password against a stored hash.
 */
export async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}
