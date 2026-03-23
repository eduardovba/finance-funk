"use client";

import { useEffect, useState } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import DashboardTab from '@/components/dashboard';
import BudgetDashboard from '@/components/budget/BudgetDashboard';

export default function DemoPage() {
    const portfolio = usePortfolio() as any;
    const [userGoal, setUserGoal] = useState<string | null>(null);

    useEffect(() => {
        try {
            const stored = sessionStorage.getItem('ff_onboarding');
            if (stored) {
                const data = JSON.parse(stored);
                setUserGoal(data.goal || 'both');
            } else {
                setUserGoal('both');
            }
        } catch {
            setUserGoal('both');
        }
    }, []);

    // Don't render until we know the goal (prevents flash of wrong dashboard)
    if (userGoal === null) return null;

    // Budget users (or users who clicked 'View Budget Demo') see the budget dashboard
    if (userGoal === 'budget') {
        return (
            <div className="relative">
                {/* Back button for 'both' users who switched views */}
                {typeof window !== 'undefined' && sessionStorage.getItem('ff_onboarding')?.includes('"both"') && (
                    <button 
                        onClick={() => setUserGoal('both')}
                        className="mb-4 text-emerald-400 hover:text-emerald-300 text-sm font-space flex items-center gap-1 transition-colors"
                    >
                        ← Back to Portfolio Demo
                    </button>
                )}
                <BudgetDashboard />
            </div>
        );
    }

    // Investment and "both" users see the portfolio dashboard
    return (
        <div className="relative">
            {/* Floating prompt to check Budget Demo if 'both' */}
            {typeof window !== 'undefined' && sessionStorage.getItem('ff_onboarding')?.includes('"both"') && !sessionStorage.getItem('dismissed_demo_budget_promo') && (
                <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[1000] animate-in slide-in-from-bottom-5 fade-in duration-500">
                    <div className="bg-[#1a1d24]/95 backdrop-blur-xl border border-emerald-500/30 p-4 rounded-2xl shadow-2xl max-w-[320px] flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <h3 className="font-space font-bold text-emerald-400 text-sm">Don't forget the Budget!</h3>
                            <button 
                                onClick={() => {
                                    sessionStorage.setItem('dismissed_demo_budget_promo', '1');
                                    // Force re-render to hide
                                    setUserGoal(prev => prev);
                                }} 
                                className="text-white/50 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>
                        <p className="text-white/70 text-xs">
                            You chose to track both investments and budget. Switch over to see the budget tools in action!
                        </p>
                        <button 
                            onClick={() => setUserGoal('budget')}
                            className="bg-emerald-500 hover:bg-emerald-600 text-[#0B0611] font-bold text-sm py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors w-full mt-1"
                        >
                            View Budget Demo → 
                        </button>
                    </div>
                </div>
            )}

            <DashboardTab
                data={portfolio.dashboardData}
                rates={portfolio.rates}
                historicalSnapshots={portfolio.historicalSnapshots}
                monthlyInvestments={portfolio.monthlyInvestments}
                diffPrevMonth={portfolio.diffPrevMonth}
                diffPrevMonthGBP={portfolio.diffPrevMonthGBP}
                fxEffectBRL={portfolio.fxEffectBRL}
                assetEffectBRL={portfolio.assetEffectBRL}
                fxEffectGBP={portfolio.fxEffectGBP}
                assetEffectGBP={portfolio.assetEffectGBP}
                diffTarget={portfolio.diffTarget}
                diffTargetGBP={portfolio.diffTargetGBP}
                assetDiffs={portfolio.assetDiffs}
                assetDiffsGBP={portfolio.assetDiffsGBP}
                categoryAssetDiffs={portfolio.categoryAssetDiffs}
                isLoading={false}
                masterMixData={portfolio.masterMixData}
                allocationTargets={portfolio.allocationTargets}
                onNavigate={(tabId: string, assetName?: string) => {
                    const routeMap: Record<string, string> = {
                        'fixed-income': '/assets/fixed-income',
                        'equity': '/assets/equity',
                        'real-estate': '/assets/real-estate',
                        'crypto': '/assets/crypto',
                        'pensions': '/assets/pensions',
                        'debt': '/assets/debt',
                        'dashboard': '/demo',
                        'general-ledger': '/ledger/income',
                        'forecast': '/targets',
                        'long-term-forecast': '/forecast',
                        'live-tracking': '/live-tracking',
                    };
                    let targetUrl = routeMap[tabId] || `/assets/${tabId}`;
                    if (assetName) {
                        targetUrl += '#' + encodeURIComponent(assetName);
                    }
                    window.location.href = targetUrl;
                }}
            />
        </div>
    );
}
