export interface DebtTabProps {
    transactions?: DebtTransaction[];
    rates?: Record<string, number> | null;
    onRefresh?: () => void;
}

export interface DebtTransaction {
    id?: string | number;
    date: string;
    lender: string;
    value_brl: number;
    value_gbp?: number;
    obs?: string;
    isSalaryContribution?: boolean;
    lenderName?: string;
}

export interface LenderSummary {
    lender: string;
    total: number;
    transactions: DebtTransaction[];
}
