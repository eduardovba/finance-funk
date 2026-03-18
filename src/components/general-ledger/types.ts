export interface GeneralLedgerTabProps {
    activeTab?: string;
    equityTransactions?: unknown[];
    cryptoTransactions?: unknown[];
    pensionTransactions?: unknown[];
    debtTransactions?: unknown[];
    transactions?: unknown[];
    realEstate?: unknown[];
    rates?: Record<string, number> | null;
    historicalSnapshots?: HistoricalSnapshot[];
    dashboardData?: DashboardData | null;
    onRecordSnapshot?: () => Promise<void>;
    onRefreshLedger?: () => void;
    onDeleteSnapshot?: () => void;
    marketData?: Record<string, unknown>;
    pensionPrices?: Record<string, unknown>;
    ledgerData?: unknown;
    fxHistory?: Record<string, Record<string, number>>;
    assetClasses?: unknown[];
    onSaveAssetClasses?: (classes: unknown[]) => void;
    appSettings?: Record<string, unknown>;
    onUpdateAppSettings?: (settings: Record<string, unknown>) => void;
    setIsMonthlyCloseModalOpen?: (open: boolean) => void;
}


export interface HistoricalSnapshot {
    month: string;
    networthBRL?: number;
    networthGBP?: number;
    totalminuspensionsBRL?: number;
    totalminuspensionsGBP?: number;
    roi?: number;
    categories?: Record<string, number>;
    isLive?: boolean;
}

export interface DashboardData {
    netWorth: { amount: number; percentage: number };
    categories: { id: string; assets: { isTotal?: boolean; brl?: number }[] }[];
}

export interface IncomeRow {
    month: string;
    salary: number;
    realEstate: number;
    equity: number;
    fixedIncome: number;
    extraordinary: number;
    total: number;
    isHistorical?: boolean;
}

export interface InvestmentRow {
    month: string;
    equity: number;
    fixedIncome: number;
    realEstate: number;
    pensions: number;
    crypto: number;
    debt: number;
    total: number;
    isHistorical?: boolean;
}
