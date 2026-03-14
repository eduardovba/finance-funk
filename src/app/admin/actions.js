'use server';

import { requireAdmin, requireSuperAdmin } from '@/lib/authGuard';
import { setUserAdmin, softDeleteUser, getAllUsers } from '@/lib/users';
import { revalidatePath } from 'next/cache';

/**
 * Toggle admin status for a user (super-admin only).
 */
export async function toggleAdminAction(userId, newIsAdmin) {
    await requireSuperAdmin();
    // Prevent self-demotion
    const caller = await requireAdmin();
    if (String(userId) === String(caller.id)) {
        return { error: 'You cannot change your own admin status.' };
    }
    await setUserAdmin(userId, newIsAdmin);
    revalidatePath('/admin');
    return { success: true };
}

/**
 * Soft-delete a user (any admin can do this, but not self).
 */
export async function removeUserAction(userId) {
    const caller = await requireAdmin();
    if (String(userId) === String(caller.id)) {
        return { error: 'You cannot delete yourself.' };
    }
    await softDeleteUser(userId);
    revalidatePath('/admin');
    return { success: true };
}
