export interface CryptoTabProps {
    transactions: CryptoTransaction[];
    marketData: Record<string, { price?: number; currency?: string; [key: string]: unknown }>;
    rates: Record<string, number> | null;
    onRefresh: () => void;
}

export interface CryptoTransaction {
    id?: string | number;
    date: string;
    asset: string;
    broker: string;
    currency: string;
    ticker?: string;
    investment: number;
    quantity: number;
    type: 'Buy' | 'Sell';
    platform?: string;
    pnl?: number;
    isSalaryContribution?: boolean;
}

export interface CryptoHolding {
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

export interface CryptoSellData {
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

export interface CryptoBuyData {
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
