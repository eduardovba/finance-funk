import { query } from './db';

export interface UserEngagementStats {
    user_id: number;
    asset_count: number;
    ledger_count: number;
    budget_tx_count: number;
    snapshot_count: number;
    recent_tx_count: number;
}

export type EngagementTier = 'active' | 'moderate' | 'dormant';

export async function getAllUsersEngagementStats(): Promise<Record<number, UserEngagementStats>> {
    // We use subqueries to accurately count associated records without N+1 queries or Cartesian products.
    const rawStats = await query<UserEngagementStats>(`
        SELECT 
            u.id as user_id,
            (SELECT COUNT(*) FROM assets WHERE user_id = u.id) as asset_count,
            (SELECT COUNT(*) FROM ledger WHERE user_id = u.id) as ledger_count,
            (SELECT COUNT(*) FROM budget_transactions WHERE user_id = u.id) as budget_tx_count,
            (SELECT COUNT(*) FROM snapshots WHERE user_id = u.id) as snapshot_count,
            (
                SELECT COUNT(*) FROM ledger 
                WHERE user_id = u.id AND date >= date('now', '-30 days')
            ) + (
                SELECT COUNT(*) FROM budget_transactions 
                WHERE user_id = u.id AND date >= date('now', '-30 days')
            ) as recent_tx_count
        FROM users u
        WHERE u.deleted_at IS NULL
    `);

    const statsMap: Record<number, UserEngagementStats> = {};
    for (const stat of rawStats) {
        statsMap[stat.user_id] = stat;
    }
    return statsMap;
}

export function computeEngagementTier(recentTxCount: number, lastAccessedAt?: string | null): EngagementTier {
    if (!lastAccessedAt) return 'dormant';
    
    const lastAccessDate = new Date(lastAccessedAt);
    const now = new Date();
    // Normalize string dates parsing issues if ' ' is used instead of 'T' (SQLite default)
    const normalizedAccessDate = isNaN(lastAccessDate.getTime()) 
        ? new Date(lastAccessedAt.replace(' ', 'T') + 'Z') 
        : lastAccessDate;

    if (isNaN(normalizedAccessDate.getTime())) return 'dormant';

    const daysSinceAccess = (now.getTime() - normalizedAccessDate.getTime()) / (1000 * 3600 * 24);

    if (daysSinceAccess <= 7 && recentTxCount > 0) {
        return 'active';
    } else if (daysSinceAccess <= 30 || recentTxCount > 0) {
        return 'moderate';
    }
    return 'dormant';
}
