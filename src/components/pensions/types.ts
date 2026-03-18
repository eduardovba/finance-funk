export interface PensionsTabProps {
    transactions: PensionTransaction[];
    rates: Record<string, number> | null;
    onRefresh: () => void;
    marketData?: Record<string, { price?: number; currency?: string; [key: string]: unknown }>;
    pensionPrices?: Record<string, { price: number; currency: string }>;
}

export interface PensionTransaction {
    id?: string | number;
    date: string;
    asset: string;
    broker: string;
    ticker?: string;
    type: 'Buy' | 'Sell';
    category?: string;
    value: number;
    quantity: number;
    price?: number;
    pnl?: number;
    roiPercent?: number;
    isSalaryContribution?: boolean;
    allocationClass?: string;
    description?: string;
    account?: string;
    amount?: number;
    notes?: string;
}

export interface PensionHolding {
    asset: string;
    qty: number;
    totalCost: number;
    broker: string;
    ticker?: string;
    currentValue?: number;
    pnl?: number;
    roi?: number;
    valuePerShare?: number;
    livePrice?: number | null;
    allocationClass?: string;
}

export interface SellData {
    asset: string;
    broker: string;
    currency: string;
    ticker?: string;
    sharesHeld: number;
    qtyToSell: number;
    sellPricePerShare: number;
    totalProceeds: number;
    avgCost: number;
    date: string;
    pnl?: number;
    roi?: number;
}

export interface BuyData {
    asset: string;
    broker: string;
    currency: string;
    ticker: string;
    qtyToBuy: string;
    buyPricePerShare: number | string;
    totalInvestment: number;
    date: string;
    allocationClass: string;
    buyPath?: string;
    scraperUrl?: string;
    isVerified?: boolean;
    isSalaryContribution?: boolean;
    scrapedType?: string;
    selector?: string;
}

export interface BrokerSummary {
    name: string;
    totalValue: number;
    totalCost: number;
    pnl: number;
    roi: number;
    currency: string;
}
