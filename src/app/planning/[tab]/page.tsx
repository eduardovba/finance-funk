"use client";

import { useMemo, useContext } from 'react';
import { useParams } from 'next/navigation';
import { PortfolioContext } from '@/context/PortfolioContext';
import type { PortfolioContextValue } from '@/context/PortfolioContext';
import PlanningTab from '@/components/PlanningTab';
import actualsData from '@/data/forecast_actuals.json';
import { Loader2 } from 'lucide-react';

export default function PlanningPage() {
    const params = useParams();
    const activeTab = (params?.tab as string) || 'targets';

    // Use raw useContext to avoid any throwing behavior from stale
    // cached builds of usePortfolio(). This is the resilient path.
    const portfolio = useContext(PortfolioContext);

    // If the context is still unavailable (route transition in progress),
    // show a brief loading state rather than crashing.
    if (!portfolio) {
        return (
            <div className="w-full mx-auto pb-12 flex flex-col items-center justify-center gap-4 min-h-[400px]">
                <Loader2 size={32} className="text-[#D4AF37] animate-spin" />
                <span className="font-space text-data-sm text-white/40 tracking-widest uppercase">Loading…</span>
            </div>
        );
    }

    const {
        forecastSettings,
        setForecastSettings,
        totalNetWorthBRL,
        rates,
        masterMixData,
        allocationTargets,
        refreshAllData,
        historicalSnapshots
    } = portfolio;

    const mergedActuals = useMemo(() => {
        const dataMap = new Map();

        // 1. Seed with static JSON
        actualsData.forEach(item => {
            const [mon, year] = item.date.split('/');
            const monthIndex = new Date(`${mon} 1, 2000`).getMonth() + 1;
            const mm = String(monthIndex).padStart(2, '0');
            const key = `${year}-${mm}`;
            dataMap.set(key, { ...item, _source: 'base' });
        });

        // 2. Override with dynamically saved snapshots
        if (historicalSnapshots && historicalSnapshots.length > 0) {
            historicalSnapshots.forEach(snap => {
                const key = snap.month; // 'YYYY-MM'

                const actualBRL = snap.networthPrimary || snap.networthBRL || 0;
                const actualGBP = snap.networthSecondary || snap.networthGBP || 0;
                const contributionGBP = snap.investment?.total || 0;

                // Fallback rate if context isn't loaded
                const activeRate = rates?.BRL || 7.0;
                const contribution = contributionGBP * activeRate;

                dataMap.set(key, {
                    _source: 'snapshot',
                    key,
                    actualBRL,
                    actualGBP,
                    contribution,
                    contributionGBP
                });
            });
        }

        // 3. Sort keys chronologically
        const sortedKeys = Array.from(dataMap.keys()).sort();

        // 4. Reconstruct array and dynamically calculate interest (organic growth)
        const finalActuals: any[] = [];
        let prevBRL = 0;
        let prevGBP = 0;

        sortedKeys.forEach(key => {
            const entry = dataMap.get(key);

            const [yyyy, mm] = key.split('-');
            const dateObj = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
            const dateStr = `${dateObj.toLocaleString('en-US', { month: 'short' })}/${yyyy}`;

            let interest = 0;
            let interestGBP = 0;

            if (entry._source === 'snapshot') {
                interest = entry.actualBRL - prevBRL - entry.contribution;
                interestGBP = entry.actualGBP - prevGBP - entry.contributionGBP;
            } else {
                interest = entry.interest || 0;
                interestGBP = entry.interestGBP || 0;
            }

            finalActuals.push({
                date: dateStr,
                actualBRL: entry.actualBRL,
                actualGBP: entry.actualGBP,
                contribution: entry.contribution,
                interest: interest,
                contributionGBP: entry.contributionGBP,
                interestGBP: interestGBP
            });

            prevBRL = entry.actualBRL;
            prevGBP = entry.actualGBP;
        });

        return finalActuals;
    }, [actualsData, historicalSnapshots, rates]);

    return (
        <PlanningTab
            activeTab={activeTab}
            data={null}
            settings={forecastSettings}
            onSaveSettings={(s: any) => {
                fetch('/api/forecast-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(s)
                }).then(() => setForecastSettings(s));
            }}
            currentPortfolioValueBrl={totalNetWorthBRL}
            currentPortfolioValueGbp={totalNetWorthBRL / (rates?.BRL || 7.0)}
            actualsData={mergedActuals}
            masterMixData={masterMixData}
            allocationTargets={allocationTargets}
            onTargetsSaved={() => refreshAllData()}
        />
    );
}
