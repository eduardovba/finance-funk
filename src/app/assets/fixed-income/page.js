"use client";

import { usePortfolio } from '@/context/PortfolioContext';
import FixedIncomeTab from '@/components/FixedIncomeTab';

export default function FixedIncomePage() {
    const {
        fixedIncomeTransactions,
        rates,
        refreshAllData,
        setEditingTransaction,
        setIsFormOpen,
        handleDeleteClick,
        handleEditTransaction,
    } = usePortfolio();

    return (
        <FixedIncomeTab
            transactions={fixedIncomeTransactions}
            rates={rates}
            onRefresh={refreshAllData}
        />
    );
}
