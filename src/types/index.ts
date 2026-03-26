// ═══════════ User domain ═══════════

export interface User {
    id: number;
    name: string;
    email: string;
    provider: 'credentials' | 'google';
    password_hash?: string | null;
    avatar_url?: string | null;
    is_admin: boolean;
    deleted_at?: string | null;
    last_accessed_at?: string | null;
    created_at: string;
}

export interface SessionUser {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    is_admin?: boolean;
}

// ═══════════ Database helpers ═══════════

export interface RunResult {
    lastID: number;
    changes: number;
    lastInsertRowid: bigint | number;
    rowsAffected: number;
}

// ═══════════ API response helpers ═══════════

export interface ApiError {
    error: string;
}

export interface ApiSuccess {
    success: true;
    id?: number;
}

// ═══════════ Budget domain ═══════════

export interface BudgetCategory {
    id: number;
    user_id: number;
    name: string;
    icon: string | null;
    color: string | null;
    monthly_target_cents: number;
    parent_id: number | null;
    sort_order: number;
    is_income: number;           // 0 | 1
}

export interface BudgetTransaction {
    id: number;
    user_id: number;
    category_id: number | null;
    amount_cents: number;
    currency: string;
    description: string | null;
    date: string;                // YYYY-MM-DD
    is_recurring: number;        // 0 | 1
    source: string | null;       // 'AMEX' | 'HSBC' | 'BARCLAYS' | 'LLOYDS' | 'MONZO' | 'SANTANDER' | 'NUBANK' | 'Manual' | null
}

export interface BudgetMonthlyRollup {
    id: number;
    user_id: number;
    month: string;               // YYYY-MM
    total_income_cents: number;
    total_expenses_cents: number;
    total_savings_cents: number;
    savings_rate_basis_points: number;
}

// ═══════════ Monthly Close domain ═══════════

export type MonthlyCloseTaskType =
    | 'REAL_ESTATE_UPDATE'
    | 'FIXED_INCOME_UPDATE'
    | 'DEBT_UPDATE'
    | 'BUDGET_REVIEW'
    | 'RECORD_SNAPSHOT'
    | 'CUSTOM';

export interface MonthlyCloseTask {
    id: number;
    user_id: number;
    month: string;               // YYYY-MM
    task_type: MonthlyCloseTaskType;
    related_entity_id: number | null;
    related_entity_name: string | null;
    is_completed: number;        // 0 | 1
    completed_at: string | null;
    is_recurring: number;        // 0 | 1
    custom_label: string | null;
}

export interface MonthlyCloseTemplate {
    id: number;
    user_id: number;
    task_type: string;
    related_entity_id: number | null;
    label: string;
    is_active: number;           // 0 | 1
    created_at: string;
}

