"use client";

import { usePortfolio } from '@/context/PortfolioContext';
import PensionsTab from '@/components/pensions';

export default function PensionsPage() {
    const {
        pensionTransactions,
        rates,
        marketData,
        pensionPrices,
        refreshAllData,
        handleEditTransaction,
        handleDeleteClick,
    } = usePortfolio();

    return (
        <PensionsTab
            transactions={pensionTransactions}
            rates={rates}
            marketData={marketData}
            pensionPrices={pensionPrices}
            onRefresh={refreshAllData}
            onEditClick={handleEditTransaction}
            onDeleteClick={handleDeleteClick}
        />
    );
}
