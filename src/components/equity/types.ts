export interface EquityTabProps {
    transactions?: EquityTransaction[];
    marketData?: Record<string, { price?: number; currency?: string; [key: string]: unknown }>;
    rates?: Record<string, number> | null;
    onRefresh?: () => void;
}

export interface EquityTransaction {
    id?: string | number;
    date: string;
    asset: string;
    broker: string;
    currency: string;
    ticker?: string;
    investment: number;
    quantity: number;
    costPerShare?: number;
    type?: 'Buy' | 'Sell';
    pnl?: number | null;
    roiPercent?: number | null;
    isSalaryContribution?: boolean;
}

export interface EquityHolding {
    asset: string;
    qty: number;
    totalCost: number;
    broker: string;
    currency: string;
    ticker: string | null;
    currentValue?: number;
    pnl?: number;
    roi?: number;
    livePrice?: number | null;
}

export interface EquitySellData {
    asset: string;
    broker: string;
    currency: string;
    ticker?: string;
    sharesHeld: number;
    avgCost: number;
    qtyToSell: number;
    sellPricePerShare: number;
    totalProceeds: number;
    pnl: number;
    roi: number;
    date: string;
}

export interface EquityBuyData {
    asset: string;
    broker: string;
    currency: string;
    ticker: string;
    qtyToBuy: string;
    buyPricePerShare: number | string;
    totalInvestment: number;
    date: string;
    isSalaryContribution?: boolean;
}
