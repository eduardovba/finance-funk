"use client";

import { usePortfolio } from '@/context/PortfolioContext';
import CryptoTab from '@/components/CryptoTab';

export default function CryptoPage() {
    const { cryptoTransactions, marketData, rates, refreshAllData } = usePortfolio();

    return (
        <CryptoTab
            transactions={cryptoTransactions}
            marketData={marketData}
            rates={rates}
            onRefresh={refreshAllData}
        />
    );
}
