'use client';

import React, { useState } from 'react';
import { toggleAdminAction, removeUserAction } from './actions';
import { Shield, ShieldOff, Trash2, Info } from 'lucide-react';
import { computeEngagementTier } from '@/lib/engagement';
import styles from './admin.module.css';

export default function AdminUserTable({ users, engagementStats, currentUserId, isSuperAdmin }: any) {
    const [confirmAction, setConfirmAction] = useState<any>(null); // { type, user }
    const [loading, setLoading] = useState(false);
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

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

    const isSelf = (user: any) => String(user.id) === String(currentUserId);

    const toggleExpand = (userId: string) => {
        setExpandedUser(expandedUser === userId ? null : userId);
    };

    return (
        <>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Provider</th>
                            <th>Role</th>
                            <th>Engagement</th>
                            <th>Joined</th>
                            <th>Last Seen</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={7} className={styles.emptyState}>No users found.</td>
                            </tr>
                        )}
                        {users.map((user: any) => {
                            const stats = engagementStats?.[user.id] || { 
                                asset_count: 0, ledger_count: 0, budget_tx_count: 0, snapshot_count: 0, recent_tx_count: 0 
                            };
                            const tier = computeEngagementTier(stats.recent_tx_count, user.last_accessed_at);
                            const isExpanded = expandedUser === String(user.id);

                            // Formatter for relative time
                            const formatRelativeTime = (dateStr?: string | null) => {
                                if (!dateStr) return '—';
                                const d = new Date(dateStr.replace(' ', 'T') + 'Z');
                                if (isNaN(d.getTime())) return '—';
                                const diffHrs = (Date.now() - d.getTime()) / (1000 * 3600);
                                if (diffHrs < 1) return 'Just now';
                                if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
                                if (diffHrs < 48) return 'Yesterday';
                                const diffDays = Math.floor(diffHrs / 24);
                                if (diffDays < 7) return `${diffDays}d ago`;
                                return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                            };

                            return (
                                <React.Fragment key={user.id}>
                                    <tr className={isExpanded ? styles.expandedRowTop : ''}>
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
                                            <div className={styles.engagementCell}>
                                                <span className={`${styles.tierBadge} ${styles['tier' + tier]}`}>
                                                    {tier === 'active' ? '🟢 Active' : tier === 'moderate' ? '🟡 Moderate' : '🔴 Dormant'}
                                                </span>
                                                <button 
                                                    className={styles.infoBtn} 
                                                    onClick={() => toggleExpand(String(user.id))}
                                                    title="View engagement details"
                                                >
                                                    <Info size={14} />
                                                </button>
                                            </div>
                                        </td>
                                        <td>
                                            {user.created_at
                                                ? new Date(user.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                                : '—'
                                            }
                                        </td>
                                        <td>
                                            {formatRelativeTime(user.last_accessed_at)}
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
                                    {isExpanded && (
                                        <tr className={styles.expandedRowBottom}>
                                            <td colSpan={7}>
                                                <div className={styles.expandedContent}>
                                                    <div className={styles.statBox}>
                                                        <div className={styles.statBoxLabel}>Assets</div>
                                                        <div className={styles.statBoxValue}>{stats.asset_count}</div>
                                                    </div>
                                                    <div className={styles.statBox}>
                                                        <div className={styles.statBoxLabel}>Ledger</div>
                                                        <div className={styles.statBoxValue}>{stats.ledger_count}</div>
                                                    </div>
                                                    <div className={styles.statBox}>
                                                        <div className={styles.statBoxLabel}>Budget Txns</div>
                                                        <div className={styles.statBoxValue}>{stats.budget_tx_count}</div>
                                                    </div>
                                                    <div className={styles.statBox}>
                                                        <div className={styles.statBoxLabel}>Snapshots</div>
                                                        <div className={styles.statBoxValue}>{stats.snapshot_count}</div>
                                                    </div>
                                                    <div className={styles.statBox}>
                                                        <div className={styles.statBoxLabel}>Last 30d Txns</div>
                                                        <div className={styles.statBoxValue}>{stats.recent_tx_count}</div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
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
