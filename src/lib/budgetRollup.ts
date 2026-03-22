/**
 * Shared budget rollup helpers.
 *
 * Builds the batch SQL statements that recalculate a budget_monthly_rollups row.
 * Used by both the single-transaction POST/DELETE and the bulk import endpoint.
 */

export interface BatchStatement {
    sql: string;
    args: (string | number | null)[];
}

/**
 * Build the batch statements that recalculate a month's rollup row.
 * Called after INSERT or DELETE to keep rollups consistent with the source data.
 */
export function buildRollupStatements(userId: string, month: string): BatchStatement[] {
    return [
        // 1. Ensure the rollup row exists
        {
            sql: `INSERT OR IGNORE INTO budget_monthly_rollups (user_id, month, total_income_cents, total_expenses_cents, total_savings_cents, savings_rate_basis_points)
                  VALUES (?, ?, 0, 0, 0, 0)`,
            args: [userId, month],
        },
        // 2. Recalculate income
        {
            sql: `UPDATE budget_monthly_rollups
                  SET total_income_cents = (
                      SELECT COALESCE(SUM(bt.amount_cents), 0)
                      FROM budget_transactions bt
                      JOIN budget_categories bc ON bt.category_id = bc.id
                      WHERE bc.is_income = 1 AND bt.user_id = ? AND strftime('%Y-%m', bt.date) = ?
                  )
                  WHERE user_id = ? AND month = ?`,
            args: [userId, month, userId, month],
        },
        // 3. Recalculate expenses
        {
            sql: `UPDATE budget_monthly_rollups
                  SET total_expenses_cents = (
                      SELECT COALESCE(SUM(bt.amount_cents), 0)
                      FROM budget_transactions bt
                      JOIN budget_categories bc ON bt.category_id = bc.id
                      WHERE bc.is_income = 0 AND bt.user_id = ? AND strftime('%Y-%m', bt.date) = ?
                  )
                  WHERE user_id = ? AND month = ?`,
            args: [userId, month, userId, month],
        },
        // 4. Derive savings + savings rate
        {
            sql: `UPDATE budget_monthly_rollups
                  SET total_savings_cents = total_income_cents - total_expenses_cents,
                      savings_rate_basis_points = CASE
                          WHEN total_income_cents > 0
                          THEN ((total_income_cents - total_expenses_cents) * 10000) / total_income_cents
                          ELSE 0
                      END
                  WHERE user_id = ? AND month = ?`,
            args: [userId, month],
        },
    ];
}
