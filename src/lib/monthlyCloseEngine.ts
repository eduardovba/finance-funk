import { query, run, get } from '@/lib/db';
import type { MonthlyCloseTask, MonthlyCloseTaskType, MonthlyCloseTemplate } from '@/types';
import type { InValue } from '@libsql/client';

// ─── Month targeting ─────────────────────────────────────────────────────

/**
 * Determine the target month for the monthly close.
 * - First 10 days of the month → prompt to close the PREVIOUS month
 * - After the 10th → target the CURRENT month
 */
export function getTargetMonth(): string {
    const today = new Date();
    const day = today.getDate();

    if (day <= 10) {
        const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    }
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get the last day of a month in YYYY-MM-DD format.
 */
export function getLastDayOfMonth(month: string): string {
    const [year, mon] = month.split('-').map(Number);
    const d = new Date(year, mon, 0);
    return d.toISOString().split('T')[0];
}

// ─── Task generation ─────────────────────────────────────────────────────

interface AssetRow {
    id: number;
    name: string;
    asset_class: string;
    currency: string;
    broker: string;
}

const ASSET_CLASS_TO_TASK: Record<string, MonthlyCloseTaskType> = {
    'Real Estate': 'REAL_ESTATE_UPDATE',
    'Fixed Income': 'FIXED_INCOME_UPDATE',
    'Debt': 'DEBT_UPDATE',
};

/**
 * Generate monthly close tasks for a user/month.
 * Only creates tasks for MANUAL asset classes (Real Estate, Fixed Income, Debt).
 * Pensions, equity, and crypto auto-update and are excluded.
 * Uses INSERT OR IGNORE for idempotency.
 */
/**
 * Clean up stale/invalid tasks. Safe to call on every request.
 * - Removes ALL tasks for auto-updating asset classes (equity, crypto, pensions)
 * - Removes tasks for RE funds (auto-fetched, broker != 'Manual')
 * - Removes tasks whose asset no longer exists or is inactive
 */
export async function cleanupStaleTasks(userId: string | number): Promise<void> {
    // a) Remove tasks for assets that should NOT be in the checklist:
    //    equity, crypto, pensions, or RE funds (non-Manual broker)
    await run(
        `DELETE FROM monthly_close_tasks
         WHERE user_id = ?
           AND related_entity_id IS NOT NULL
           AND task_type != 'CUSTOM'
           AND related_entity_id IN (
               SELECT id FROM assets WHERE user_id = ?
               AND (
                   asset_class NOT IN ('Real Estate', 'Fixed Income', 'Debt')
                   OR (asset_class = 'Real Estate' AND broker != 'Manual')
               )
           )`,
        [userId as InValue, userId as InValue]
    );

    // b) Remove tasks for deleted/inactive assets (asset row gone or not ACTIVE)
    await run(
        `DELETE FROM monthly_close_tasks
         WHERE user_id = ?
           AND related_entity_id IS NOT NULL
           AND task_type != 'CUSTOM'
           AND related_entity_id NOT IN (
               SELECT id FROM assets WHERE user_id = ? AND sync_status = 'ACTIVE'
           )`,
        [userId as InValue, userId as InValue]
    );

    // c) Legacy: remove any lingering PENSION_UPDATE task types
    await run(
        `DELETE FROM monthly_close_tasks WHERE user_id = ? AND task_type = 'PENSION_UPDATE'`,
        [userId as InValue]
    );

    // d) Deduplicate: for task types with NULL related_entity_id, keep only the
    //    row with the smallest id and remove any duplicates
    await run(
        `DELETE FROM monthly_close_tasks
         WHERE user_id = ? AND id NOT IN (
             SELECT MIN(id) FROM monthly_close_tasks
             WHERE user_id = ?
             GROUP BY user_id, month, task_type, COALESCE(related_entity_id, -1), COALESCE(custom_label, '')
         )`,
        [userId as InValue, userId as InValue]
    );
}

export async function generateTasksForMonth(
    userId: string | number,
    month: string
): Promise<void> {

    // 1. Query active assets that need MANUAL updates only
    //    Real Estate: only physical properties (broker='Manual'), not auto-fetched funds/FIIs
    const assets = await query<AssetRow>(
        `SELECT id, name, asset_class, currency, broker
         FROM assets
         WHERE user_id = ?
           AND sync_status = 'ACTIVE'
           AND (
               (asset_class = 'Real Estate' AND broker = 'Manual')
               OR asset_class IN ('Fixed Income', 'Debt')
           )`,
        [userId as InValue]
    );

    // 2. Build INSERT statements for asset tasks
    const insertSql = `INSERT OR IGNORE INTO monthly_close_tasks
        (user_id, month, task_type, related_entity_id, related_entity_name)
        VALUES (?, ?, ?, ?, ?)`;

    for (const asset of assets) {
        const taskType = ASSET_CLASS_TO_TASK[asset.asset_class];
        if (taskType) {
            await run(insertSql, [userId as InValue, month, taskType, asset.id, asset.name]);
        }
    }

    // 3. Budget review — only if the user has budget categories
    //    Use WHERE NOT EXISTS to handle NULL related_entity_id (SQLite NULL != NULL in UNIQUE)
    const budgetCheck = await get<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM budget_categories WHERE user_id = ?',
        [userId as InValue]
    );
    if (budgetCheck && budgetCheck.cnt > 0) {
        await run(
            `INSERT INTO monthly_close_tasks (user_id, month, task_type, related_entity_id, related_entity_name)
             SELECT ?, ?, 'BUDGET_REVIEW', NULL, NULL
             WHERE NOT EXISTS (
                 SELECT 1 FROM monthly_close_tasks WHERE user_id = ? AND month = ? AND task_type = 'BUDGET_REVIEW'
             )`,
            [userId as InValue, month, userId as InValue, month]
        );
    }

    // 4. Always add RECORD_SNAPSHOT
    await run(
        `INSERT INTO monthly_close_tasks (user_id, month, task_type, related_entity_id, related_entity_name)
         SELECT ?, ?, 'RECORD_SNAPSHOT', NULL, NULL
         WHERE NOT EXISTS (
             SELECT 1 FROM monthly_close_tasks WHERE user_id = ? AND month = ? AND task_type = 'RECORD_SNAPSHOT'
         )`,
        [userId as InValue, month, userId as InValue, month]
    );

    // 5. Create tasks from active recurring templates
    const templates = await query<MonthlyCloseTemplate>(
        `SELECT * FROM monthly_close_templates WHERE user_id = ? AND is_active = 1`,
        [userId as InValue]
    );

    for (const tmpl of templates) {
        await run(
            `INSERT INTO monthly_close_tasks (user_id, month, task_type, related_entity_id, related_entity_name, is_recurring, custom_label)
             SELECT ?, ?, ?, ?, ?, 1, ?
             WHERE NOT EXISTS (
                 SELECT 1 FROM monthly_close_tasks WHERE user_id = ? AND month = ? AND task_type = ? AND custom_label = ?
             )`,
            [
                userId as InValue, month, tmpl.task_type, tmpl.related_entity_id, tmpl.label, tmpl.label,
                userId as InValue, month, tmpl.task_type, tmpl.label,
            ]
        );
    }
}

// ─── Task queries ─────────────────────────────────────────────────────────

/**
 * Get all tasks for a user/month, ordered by type then entity name.
 */
export async function getTasksForMonth(
    userId: string | number,
    month: string
): Promise<MonthlyCloseTask[]> {
    return query<MonthlyCloseTask>(
        `SELECT * FROM monthly_close_tasks
         WHERE user_id = ? AND month = ?
         ORDER BY
            sort_order ASC,
            CASE task_type
                WHEN 'REAL_ESTATE_UPDATE' THEN 1
                WHEN 'FIXED_INCOME_UPDATE' THEN 2
                WHEN 'DEBT_UPDATE' THEN 3
                WHEN 'CUSTOM' THEN 4
                WHEN 'BUDGET_REVIEW' THEN 5
                WHEN 'RECORD_SNAPSHOT' THEN 6
            END,
            related_entity_name ASC`,
        [userId as InValue, month]
    );
}

/**
 * Mark a task as completed.
 */
export async function completeTask(
    userId: string | number,
    taskId: number
): Promise<void> {
    await run(
        `UPDATE monthly_close_tasks
         SET is_completed = 1, completed_at = datetime('now')
         WHERE id = ? AND user_id = ?`,
        [taskId, userId as InValue]
    );
}

/**
 * Unmark a task (set incomplete).
 */
export async function uncompleteTask(
    userId: string | number,
    taskId: number
): Promise<void> {
    await run(
        `UPDATE monthly_close_tasks
         SET is_completed = 0, completed_at = NULL
         WHERE id = ? AND user_id = ?`,
        [taskId, userId as InValue]
    );
}

// ─── Fixed income balance helper ──────────────────────────────────────────

/**
 * Get the last known balance for a fixed income asset from the ledger.
 * Balance = SUM(amount) for all ledger entries on that asset.
 */
export async function getFixedIncomeBalance(
    userId: string | number,
    assetId: number
): Promise<number> {
    const row = await get<{ last_balance: number }>(
        `SELECT COALESCE(SUM(l.amount), 0) as last_balance
         FROM ledger l
         WHERE l.asset_id = ? AND l.user_id = ?`,
        [assetId, userId as InValue]
    );
    return row?.last_balance ?? 0;
}

/**
 * Get the currency for an asset from the assets table.
 */
export async function getAssetCurrency(
    userId: string | number,
    assetId: number
): Promise<string> {
    const row = await get<{ currency: string }>(
        'SELECT currency FROM assets WHERE id = ? AND user_id = ?',
        [assetId, userId as InValue]
    );
    return row?.currency ?? 'BRL';
}

// ─── Smart suggestions ───────────────────────────────────────────────────

export interface TaskSuggestion {
    label: string;
    task_type: string;
    related_entity_id: number | null;
    reason: string;
}

/**
 * Analyze the user's assets and suggest recurring task templates.
 * Excludes suggestions that already exist as active templates.
 */
export async function suggestTasksForUser(
    userId: string | number
): Promise<TaskSuggestion[]> {
    const suggestions: TaskSuggestion[] = [];

    // Existing templates (to avoid duplicates) + intentionally dismissed ones
    const existing = await query<{ label: string }>(
        `SELECT label FROM monthly_close_templates WHERE user_id = ? AND is_active = 1
         UNION
         SELECT label FROM monthly_close_dismissed_suggestions WHERE user_id = ?`,
        [userId as InValue, userId as InValue]
    );
    const existingLabels = new Set(existing.map((t) => t.label.toLowerCase()));

    // 1. Mortgage payments — debt assets with "mortgage" in the name
    const debtAssets = await query<AssetRow>(
        `SELECT id, name, asset_class, currency, broker FROM assets
         WHERE user_id = ? AND sync_status = 'ACTIVE' AND asset_class = 'Debt'`,
        [userId as InValue]
    );

    for (const debt of debtAssets) {
        const nameLower = debt.name.toLowerCase();
        if (nameLower.includes('mortgage') || nameLower.includes('hipoteca')) {
            const label = `Record mortgage payment — ${debt.name}`;
            if (!existingLabels.has(label.toLowerCase())) {
                suggestions.push({
                    label,
                    task_type: 'CUSTOM',
                    related_entity_id: debt.id,
                    reason: `You have an active mortgage with ${debt.name}`,
                });
            }
        } else {
            const label = `Record loan payment — ${debt.name}`;
            if (!existingLabels.has(label.toLowerCase())) {
                suggestions.push({
                    label,
                    task_type: 'CUSTOM',
                    related_entity_id: debt.id,
                    reason: `You have an active loan with ${debt.name}`,
                });
            }
        }
    }

    // 2. Rental revenue/costs — physical properties only (not auto-fetched funds)
    const rentalProperties = await query<{ name: string; id: number }>(
        `SELECT DISTINCT a.name, a.id FROM assets a
         JOIN ledger l ON l.asset_id = a.id
         WHERE a.user_id = ? AND a.asset_class = 'Real Estate'
           AND a.broker = 'Manual'
           AND a.sync_status = 'ACTIVE'
           AND l.type IN ('Income', 'Expense')`,
        [userId as InValue]
    );

    for (const prop of rentalProperties) {
        const revenueLabel = `Record rental revenue — ${prop.name}`;
        const costsLabel = `Record rental costs — ${prop.name}`;
        if (!existingLabels.has(revenueLabel.toLowerCase())) {
            suggestions.push({
                label: revenueLabel,
                task_type: 'CUSTOM',
                related_entity_id: prop.id,
                reason: `You track rental income for ${prop.name}`,
            });
        }
        if (!existingLabels.has(costsLabel.toLowerCase())) {
            suggestions.push({
                label: costsLabel,
                task_type: 'CUSTOM',
                related_entity_id: prop.id,
                reason: `You track rental costs for ${prop.name}`,
            });
        }
    }

    // 3. Salary/income recording — if budget has income categories
    const incomeCheck = await get<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM budget_categories WHERE user_id = ? AND is_income = 1',
        [userId as InValue]
    );
    if (incomeCheck && incomeCheck.cnt > 0) {
        const label = 'Record monthly income';
        if (!existingLabels.has(label.toLowerCase())) {
            suggestions.push({
                label,
                task_type: 'CUSTOM',
                related_entity_id: null,
                reason: 'Track your income for budget accuracy',
            });
        }
    }

    return suggestions;
}

// ─── Template management ─────────────────────────────────────────────────

/**
 * Get all active templates for a user.
 */
export async function getTemplates(
    userId: string | number
): Promise<MonthlyCloseTemplate[]> {
    return query<MonthlyCloseTemplate>(
        'SELECT * FROM monthly_close_templates WHERE user_id = ? AND is_active = 1 ORDER BY created_at ASC',
        [userId as InValue]
    );
}

/**
 * Add a new template and create a task for the given month.
 */
export async function addTemplate(
    userId: string | number,
    label: string,
    taskType: string = 'CUSTOM',
    relatedEntityId: number | null = null
): Promise<number> {
    const res = await run(
        `INSERT OR IGNORE INTO monthly_close_templates (user_id, task_type, related_entity_id, label)
         VALUES (?, ?, ?, ?)`,
        [userId as InValue, taskType, relatedEntityId, label]
    );
    return res.lastID;
}

/**
 * Remove a template and delete uncompleted tasks from it.
 */
export async function removeTemplate(
    userId: string | number,
    templateId: number
): Promise<void> {
    // Get the template label before deleting
    const tmpl = await get<{ label: string }>(
        'SELECT label FROM monthly_close_templates WHERE id = ? AND user_id = ?',
        [templateId, userId as InValue]
    );

    await run(
        'DELETE FROM monthly_close_templates WHERE id = ? AND user_id = ?',
        [templateId, userId as InValue]
    );

    // Delete corresponding uncompleted custom tasks
    if (tmpl) {
        await run(
            `DELETE FROM monthly_close_tasks
             WHERE user_id = ? AND task_type = 'CUSTOM' AND custom_label = ? AND is_completed = 0`,
            [userId as InValue, tmpl.label]
        );
    }
}
