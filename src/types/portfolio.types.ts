/**
 * Shared portfolio domain types used across portfolioUtils, ledgerUtils,
 * spreadsheetParser, PortfolioContext, and all asset-class components.
 *
 * These are the canonical shapes — component-level types.ts files may
 * extend or narrow these for their specific needs.
 */

// ═══════════ Currency ═══════════

/** ISO currency code */
export type CurrencyCode = 'GBP' | 'BRL' | 'USD' | string;

/** Rates map: 1 GBP = N units of each currency (GBP is always 1) */
export type CurrencyRates = Record<string, number>;

/** Maps broker/account names to their default operating currency */
export type BrokerCurrencyMap = Record<string, CurrencyCode>;

// ═══════════ Market Data ═══════════

export interface MarketDataEntry {
    price: number;
    currency?: string;
    change?: number;
    changePercent?: number;
    previousClose?: number;
    name?: string;
    [key: string]: unknown;
}

export type MarketDataMap = Record<string, MarketDataEntry>;

export interface PensionPriceEntry {
    price: number;
    currency: string;
}

export type PensionPricesMap = Record<string, PensionPriceEntry>;

// ═══════════ FX History ═══════════

/** month → currency → rate */
export type FxHistoryMap = Record<string, Record<string, number>>;

// ═══════════ Transactions ═══════════

export interface BaseTransaction {
    id?: string | number;
    date: string;
    asset?: string;
    broker?: string;
    account?: string;
    currency?: CurrencyCode;
    type?: string;
    notes?: string;
}

export interface FixedIncomeTransaction extends BaseTransaction {
    investment?: number;
    interest?: number;
}

export interface EquityTransaction extends BaseTransaction {
    ticker?: string;
    investment: number;
    quantity: number;
    costPerShare?: number;
    type?: 'Buy' | 'Sell';
    pnl?: number | null;
    roiPercent?: number | null;
    isSalaryContribution?: boolean;
}

export interface CryptoTransaction extends BaseTransaction {
    ticker?: string;
    investment: number;
    quantity: number;
    type?: 'Buy' | 'Sell';
}

export interface PensionTransaction extends BaseTransaction {
    ticker?: string;
    value?: number;
    quantity: number;
    price?: number;
    category?: string;
    allocationClass?: string;
    isSalaryContribution?: boolean;
    amount?: number;
}

export interface DebtTransaction extends BaseTransaction {
    amount: number;
    lender?: string;
    interestRate?: number;
    description?: string;
}

// ═══════════ Real Estate ═══════════

export interface RealEstateProperty {
    id?: string;
    name: string;
    status?: 'Active' | 'Sold';
    investment?: number;
    currentValue?: number;
    taxes?: number;
    salePrice?: number;
    currency?: CurrencyCode;
    rentalIncome?: number;
    airbnbData?: unknown;
}

export interface RealEstateData {
    properties?: RealEstateProperty[];
    funds?: {
        transactions?: BaseTransaction[];
        holdings?: Array<{ ticker: string; qty: number; broker: string; [key: string]: unknown }>;
    };
    airbnb?: unknown;
    inkCourt?: { ledger?: unknown[] } | null;
}

// ═══════════ Asset Summary (returned by get*Summary functions) ═══════════

export interface AssetHolding {
    name: string;
    brl: number;
    gbp: number;
    investmentGBP?: number;
    investmentBRL?: number;
    grossInvGBP?: number;
    interestBRL?: number;
    roi?: number;
    roiBRL?: number;
    nativeCurrency?: CurrencyCode;
    category?: string;
    isTotal?: boolean;
    isRealisedPnL?: boolean;
    broker?: string;
    ticker?: string | null;
    qty?: number;
    currentValue?: number;
    costPerShare?: number;
    avgCost?: number;
    [key: string]: unknown;
}

export interface IndividualHolding {
    name: string;
    brl: number;
    gbp: number;
    broker?: string;
}

export interface TotalRow {
    name: 'Total';
    brl: number;
    gbp: number;
    investmentGBP: number;
    grossInvGBP?: number;
    roi: number;
    isTotal: true;
    realisedPnLBrl?: number;
    realisedPnLGbp?: number;
}

export interface CategorySummaryResult {
    assets: AssetHolding[];
    individualHoldings: IndividualHolding[];
    total: TotalRow;
}

// ═══════════ Master Mix (allocation buckets) ═══════════

export interface MasterMixBuckets {
    FixedIncome: number;
    Equity: number;
    RealEstate: number;
    Crypto: number;
}

export interface MasterMixResult {
    buckets: MasterMixBuckets;
    total: number;
}

// ═══════════ Pension Fund Map ═══════════

export interface PensionFundMapEntry {
    asset: string;
    url?: string;
    selector?: string;
    type?: string;
    ticker?: string;
    currency?: string;
    isPence?: boolean;
    price?: number;
    allocations?: Record<string, number | undefined>;
    allocationClass?: string;
    [key: string]: unknown;
}

// ═══════════ Asset Classes Config ═══════════

export interface AssetClassConfig {
    currency?: CurrencyCode;
    category?: string;
    [key: string]: unknown;
}

export type AssetClassesMap = Record<string, AssetClassConfig>;

// ═══════════ Ledger ═══════════

export interface LedgerInvestmentEntry {
    month: string;
    totalBRL: number;
    totalGBP: number;
    [key: string]: unknown;
}

export interface LedgerData {
    investments?: LedgerInvestmentEntry[];
    [key: string]: unknown;
}

export interface NormalizedTransaction {
    date: string;
    assetClass: string;
    amountBRL: number;
    amountGBP: number;
    broker?: string;
    [key: string]: unknown;
}

export interface MonthlyInvestment {
    month: string;
    totalBRL: number;
    totalGBP: number;
    byClass?: Record<string, number>;
    [key: string]: unknown;
}

// ═══════════ Spreadsheet Parser ═══════════

export interface ColumnMapping {
    [targetField: string]: string | null;
}

export interface ParsedSheet {
    name: string;
    headers: string[];
    rows: unknown[][];
}

export interface SpreadsheetParseResult {
    sheets: ParsedSheet[];
    headers: string[];
    rows: unknown[][];
}

// ═══════════ Historical Snapshots ═══════════

export interface HistoricalSnapshot {
    month: string;
    networthBRL?: number;
    networthGBP?: number;
    totalBRL?: number;
    categories?: Record<string, number>;
    assetDetails?: Record<string, AssetHolding[]>;
    [key: string]: unknown;
}

// ═══════════ Forecast ═══════════

export interface ForecastSettings {
    annualInterestRate?: number;
    yearlyGoals?: Record<number | string, number>;
    [key: string]: unknown;
}
