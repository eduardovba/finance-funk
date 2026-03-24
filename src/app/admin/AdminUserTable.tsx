'use client';

import { useState } from 'react';
import { toggleAdminAction, removeUserAction } from './actions';
import { Shield, ShieldOff, Trash2 } from 'lucide-react';
import styles from './admin.module.css';

export default function AdminUserTable({ users, currentUserId, isSuperAdmin }) {
    const [confirmAction, setConfirmAction] = useState(null); // { type, user }
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!confirmAction) return;
        setLoading(true);
        try {
            if (confirmAction.type === 'promote') {
                await toggleAdminAction(confirmAction.user.id, true);
            } else if (confirmAction.type === 'demote') {
                await toggleAdminAction(confirmAction.user.id, false);
            } else if (confirmAction.type === 'remove') {
                await removeUserAction(confirmAction.user.id);
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
        setConfirmAction(null);
    };

    const isSelf = (user) => String(user.id) === String(currentUserId);

    return (
        <>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Provider</th>
                            <th>Role</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={5} className={styles.emptyState}>No users found.</td>
                            </tr>
                        )}
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <div className={styles.userCell}>
                                        <div className={styles.avatar}>
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt={user.name} />
                                            ) : (
                                                (user.name || user.email)?.[0]?.toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <div className={styles.userName}>
                                                {user.name || '—'}
                                                {isSelf(user) && <span className={styles.selfBadge}> (you)</span>}
                                            </div>
                                            <div className={styles.userEmail}>{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className={`${styles.badge} ${user.provider === 'google' ? styles.badgeGoogle : styles.badgeCredentials}`}>
                                        {user.provider}
                                    </span>
                                </td>
                                <td>
                                    <span className={`${styles.badge} ${user.is_admin ? styles.badgeAdmin : styles.badgeUser}`}>
                                        {user.is_admin ? '🛡 Admin' : 'User'}
                                    </span>
                                </td>
                                <td>
                                    {user.created_at
                                        ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                        : '—'
                                    }
                                </td>
                                <td>
                                    {isSelf(user) ? (
                                        <span className={styles.selfBadge}>—</span>
                                    ) : (
                                        <div className={styles.actionsCell}>
                                            {isSuperAdmin && (
                                                user.is_admin ? (
                                                    <button
                                                        className={`${styles.btnAction} ${styles.btnDemote}`}
                                                        onClick={() => setConfirmAction({ type: 'demote', user })}
                                                        title="Revoke admin"
                                                    >
                                                        <ShieldOff size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                                                        Demote
                                                    </button>
                                                ) : (
                                                    <button
                                                        className={`${styles.btnAction} ${styles.btnPromote}`}
                                                        onClick={() => setConfirmAction({ type: 'promote', user })}
                                                        title="Make admin"
                                                    >
                                                        <Shield size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                                                        Promote
                                                    </button>
                                                )
                                            )}
                                            <button
                                                className={`${styles.btnAction} ${styles.btnRemove}`}
                                                onClick={() => setConfirmAction({ type: 'remove', user })}
                                                title="Remove user"
                                            >
                                                <Trash2 size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Confirmation Dialog */}
            {confirmAction && (
                <div className={styles.confirmOverlay} onClick={() => !loading && setConfirmAction(null)}>
                    <div className={styles.confirmCard} onClick={e => e.stopPropagation()}>
                        <div className={styles.confirmTitle}>
                            {confirmAction.type === 'promote' && 'Promote to Admin?'}
                            {confirmAction.type === 'demote' && 'Revoke Admin Access?'}
                            {confirmAction.type === 'remove' && 'Remove User?'}
                        </div>
                        <div className={styles.confirmDesc}>
                            {confirmAction.type === 'promote' && (
                                <>You are about to give <strong>{confirmAction.user.name || confirmAction.user.email}</strong> admin privileges. They will be able to view and manage all users.</>
                            )}
                            {confirmAction.type === 'demote' && (
                                <>You are about to revoke admin access for <strong>{confirmAction.user.name || confirmAction.user.email}</strong>. They will lose all admin privileges.</>
                            )}
                            {confirmAction.type === 'remove' && (
                                <>You are about to remove <strong>{confirmAction.user.name || confirmAction.user.email}</strong>. Their account will be deactivated (data is preserved and can be restored).</>
                            )}
                        </div>
                        <div className={styles.confirmActions}>
                            <button
                                className={styles.btnCancel}
                                onClick={() => setConfirmAction(null)}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                className={confirmAction.type === 'promote' ? styles.btnConfirmPromote : styles.btnConfirmDanger}
                                onClick={handleConfirm}
                                disabled={loading}
                            >
                                {loading ? 'Processing…' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
