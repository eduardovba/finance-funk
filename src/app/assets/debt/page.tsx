"use client";

import { usePortfolio } from '@/context/PortfolioContext';
import DebtTab from '@/components/debt';

export default function DebtPage() {
    const { debtTransactions, rates, refreshAllData } = usePortfolio();

    return (
        <DebtTab
            transactions={debtTransactions}
            rates={rates}
            onRefresh={refreshAllData}
        />
    );
}
