"use client";

import { usePortfolio } from '@/context/PortfolioContext';
import RealEstateTab from '@/components/RealEstateTab';

export default function RealEstatePage() {
    const { realEstate, rates, fetchRealEstate, marketData } = usePortfolio();

    return (
        <RealEstateTab
            data={realEstate}
            rates={rates}
            onRefresh={fetchRealEstate}
            marketData={marketData}
        />
    );
}
