export interface FixedIncomeTabProps {
    transactions?: FixedIncomeTransaction[];
    rates?: Record<string, number> | null;
    onRefresh?: () => void;
}

export interface FixedIncomeTransaction {
    id?: string | number;
    date: string;
    asset: string;
    broker: string;
    currency: string;
    investment: number;
    interest?: number;
    type?: string;
    notes?: string;
}

export interface FixedIncomeHolding {
    name: string;
    broker: string;
    currency: string;
    investment: number;
    interest: number;
    currentValue: number;
    roi: number;
    syncValue?: number | null;
    isXPSubAccount?: boolean;
}

export interface BrokerSummary {
    broker: string;
    currentValue: number;
    investment: number;
    pnl: number;
    roi: number;
    nativeVal: number;
    nativeCur: string;
}
