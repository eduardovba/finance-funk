"use client";

import { usePortfolio } from '@/context/PortfolioContext';
import FixedIncomeTab from '@/components/fixed-income';

export default function FixedIncomePage() {
    const {
        fixedIncomeTransactions,
        rates,
        refreshAllData,
    } = usePortfolio();

    return (
        <FixedIncomeTab
            transactions={fixedIncomeTransactions}
            rates={rates}
            onRefresh={refreshAllData}
        />
    );
}
