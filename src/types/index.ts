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
