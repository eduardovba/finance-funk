"use client";

import { usePortfolio } from '@/context/PortfolioContext';
import EquityTab from '@/components/EquityTab';

export default function EquityPage() {
    const { equityTransactions, marketData, rates, refreshAllData } = usePortfolio();

    return (
        <EquityTab
            transactions={equityTransactions}
            marketData={marketData}
            rates={rates}
            onRefresh={refreshAllData}
        />
    );
}
