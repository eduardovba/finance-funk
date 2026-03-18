// Types for the Real Estate Tab component

export interface RealEstateTabProps {
    data: {
        properties?: PropertyData[];
        funds?: {
            transactions?: FundTransaction[];
            holdings?: FundHolding[];
        };
    } | null;
    rates: Record<string, number> | null;
    onRefresh: () => void;
    marketData?: Record<string, { price?: number; [key: string]: unknown }>;
}

export interface PropertyData {
    id: string | number;
    name: string;
    currency: string;
    currentValue: number;
    investment: number;
    taxes?: number;
    status?: string;
    salePrice?: number;
    mortgage?: MortgageData;
    rental?: RentalData;
    ledger?: PropertyTransaction[];
}

export interface MortgageData {
    originalAmount: number;
    balance: number;
    deposit: number;
    totalPrincipalPaid: number;
    totalInterestPaid: number;
    ledger: MortgageLedgerEntry[];
}

export interface MortgageLedgerEntry {
    id?: string;
    month: string;
    rawDate?: string;
    costs: number;
    principal: number;
    source?: string;
}

export interface RentalData {
    totalRevenue: number;
    totalCosts: number;
    totalProfit: number;
    ledger: RentalLedgerEntry[];
    entries?: RentalEntry[];
}

export interface RentalLedgerEntry {
    month: string;
    rawDate?: string;
    revenue: number;
    costs: number;
}

export interface RentalEntry {
    id?: string | number;
    date: string;
    type: string;
    amount: number;
    notes?: string;
}

export interface PropertyTransaction {
    id?: string | number;
    date: string;
    amount: number;
    type?: string;
    notes?: string;
}

export interface FundTransaction {
    id?: string | number;
    date: string;
    fund: string;
    ticker?: string;
    investment: number;
    quantity: number;
    costPerShare?: number;
    price?: number;
}

export interface FundHolding {
    ticker: string;
    currentPrice: number;
}

export interface FundHoldingComputed {
    fund: string;
    ticker: string;
    broker: string;
    totalQuantity: number;
    totalInvestment: number;
    transactions: FundTransaction[];
    currentPrice: number;
    currentValue: number;
    pnl: number;
    roi: number;
    liveData: unknown;
    type?: string;
}

export interface PropertyDisplayData {
    currentValue: number;
    investment: number;
    taxes: number;
    profitLoss: number;
    roi: number;
    equity: number;
}

export interface SummaryCard {
    name: string;
    currentValue: number;
    purchasePrice: number;
    pnl: number;
    roi: number;
    currency: string;
}

export interface DeleteTarget {
    type: string;
    value?: string | number;
    id?: string | number;
    name?: string;
}
