"use client";

import { usePortfolio } from '@/context/PortfolioContext';
import LiveTrackingTab from '@/components/LiveTrackingTab';

export default function LiveTrackingPage() {
    const { marketData, fetchMarketData, loadingRates } = usePortfolio();

    return (
        <LiveTrackingTab
            marketData={marketData}
            onRefresh={fetchMarketData}
            isMarketDataLoading={loadingRates}
        />
    );
}
