import { get, run, query } from './db';
import bcrypt from 'bcryptjs';
import type { User } from '@/types';

/**
 * Find a user by email address.
 */
export async function findUserByEmail(email: string): Promise<User | undefined> {
    return get<User>('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
}

/**
 * Create a new user with email/password credentials.
 * Password is hashed with bcrypt before storage.
 */
export async function createUser({ name, email, password }: { name: string; email: string; password: string }): Promise<Pick<User, 'id' | 'name' | 'email' | 'provider'>> {
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
export async function findOrCreateOAuthUser({ name, email, provider }: { name: string; email: string; provider: string }): Promise<User | Pick<User, 'id' | 'name' | 'email' | 'provider'>> {
    let user: User | Pick<User, 'id' | 'name' | 'email' | 'provider'> | undefined = await findUserByEmail(email);

    if (!user) {
        const result = await run(
            'INSERT INTO users (name, email, provider) VALUES (?, ?, ?)',
            [name, email.toLowerCase(), provider]
        );
        user = {
            id: result.lastID,
            name,
            email: email.toLowerCase(),
            provider: provider as User['provider']
        };
    }

    return user;
}

/**
 * Verify a password against a stored hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Get a user by their ID.
 */
export async function getUserById(id: string | number): Promise<User | undefined> {
    return get<User>('SELECT id, name, email, provider, avatar_url, is_admin, created_at FROM users WHERE id = ?', [id]);
}

/**
 * Update mutable user profile fields (name).
 */
export async function updateUser(id: string | number, { name }: { name: string }): Promise<User | undefined> {
    await run('UPDATE users SET name = ? WHERE id = ?', [name, id]);
    return getUserById(id);
}

/**
 * Persist OAuth avatar URL for a user.
 */
export async function updateUserAvatar(id: string | number, avatarUrl: string): Promise<void> {
    await run('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, id]);
}

/**
 * Change the password for a credentials-based user.
 * Verifies the current password before updating.
 */
export async function changePassword(id: string | number, currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
    const user = await get<{ password_hash: string | null; provider: string }>('SELECT password_hash, provider FROM users WHERE id = ?', [id]);
    if (!user) throw new Error('User not found');
    if (user.provider !== 'credentials' || !user.password_hash) {
        throw new Error('Password change is only available for email/password accounts');
    }
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) throw new Error('Current password is incorrect');
    const newHash = await bcrypt.hash(newPassword, 12);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, id]);
    return { success: true };
}

/**
 * Delete a user and all their associated data (cascade).
 */
export async function deleteUserAndData(id: string | number): Promise<{ success: boolean }> {
    // Delete from child tables first (order matters for FK constraints)
    const tables = ['ledger', 'monthly_ledger', 'snapshots', 'connections', 'assets'];
    for (const table of tables) {
        await run(`DELETE FROM ${table} WHERE user_id = ?`, [id]);
    }
    // Delete user-scoped kv_store entries (prefixed with "userId:")
    const kvRows = await query<{ key: string }>('SELECT key FROM kv_store WHERE key LIKE ?', [`${id}:%`]);
    for (const row of kvRows) {
        await run('DELETE FROM kv_store WHERE key = ?', [row.key]);
    }
    // Finally delete the user record
    await run('DELETE FROM users WHERE id = ?', [id]);
    return { success: true };
}

/**
 * List all users (for admin dashboard). Excludes soft-deleted users.
 */
export async function getAllUsers(): Promise<User[]> {
    return query<User>(
        'SELECT id, name, email, provider, avatar_url, is_admin, created_at, deleted_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );
}

/**
 * Set or revoke admin status for a user.
 */
export async function setUserAdmin(userId: string | number, isAdmin: boolean): Promise<User | undefined> {
    await run('UPDATE users SET is_admin = ? WHERE id = ?', [isAdmin ? 1 : 0, userId]);
    return getUserById(userId);
}

/**
 * Soft-delete a user: flag with deleted_at timestamp, revoke admin.
 * Does NOT destroy data — can be reversed.
 */
export async function softDeleteUser(userId: string | number): Promise<{ success: boolean }> {
    await run(
        'UPDATE users SET deleted_at = CURRENT_TIMESTAMP, is_admin = 0 WHERE id = ?',
        [userId]
    );
    return { success: true };
}
