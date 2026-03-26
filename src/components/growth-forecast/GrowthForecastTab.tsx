'use client';
import React from 'react';
import { formatCurrency } from '@/lib/currency';
import { MapPin, Loader2 } from 'lucide-react';
import _StatusModal from '../StatusModal';
import _GrowthWaterfall from '../GrowthWaterfall';
import _SmartInsights from '../SmartInsights';
import _PageTutorialOverlay from '../ftue/PageTutorialOverlay';
const StatusModal = _StatusModal as any;
const GrowthWaterfall = _GrowthWaterfall as any;
const SmartInsights = _SmartInsights as any;
const PageTutorialOverlay = _PageTutorialOverlay as any;
import useGrowthForecast from './useGrowthForecast';
import ForecastHeader from './ForecastHeader';
import ScenarioEditor from './ScenarioEditor';
import ForecastChart from './ForecastChart';
import type { GrowthForecastTabProps } from './types';

const FORECAST_TUTORIAL_STEPS = [
    { type: 'spotlight', targetId: 'ftue-forecast-projection', title: 'Strategic Growth Projections', message: "Your core goal progress visual and your projected net worth. Compare current trajectory against projections and final goals.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-forecast-scenario', title: 'Scenario Modeling', message: "Tweak monthly contributions, expected returns, and your time horizon. Watch the projection adjust instantly. Lock a scenario to save a snapshot.", position: 'top' },
    { type: 'spotlight', targetId: 'ftue-forecast-container', title: 'Strategy vs. Reality', message: "Compare your locked projections against actual portfolio performance. Revisit and adjust your strategy to ensure you remain on your chosen path.", position: 'top' },
];

export default function GrowthForecastTab({ currentPortfolioValueBrl, currentPortfolioValueGbp, liveContributionBrl, liveContributionGbp, budgetSurplusBrl }: GrowthForecastTabProps) {
    const h = useGrowthForecast({ currentPortfolioValueBrl, currentPortfolioValueGbp, liveContributionBrl, liveContributionGbp, budgetSurplusBrl });

    // Show a loading state while forecast data is being computed
    if (!h.settingsLoaded || h.forecastData.length === 0) {
        return (
            <div className="w-full mx-auto pb-12 flex flex-col items-center justify-center gap-4 min-h-[400px]">
                <Loader2 size={32} className="text-[#D4AF37] animate-spin" />
                <span className="font-space text-data-sm text-white/40 tracking-widest uppercase">Loading projections…</span>
            </div>
        );
    }

    return (
        <>
        <div id="ftue-forecast-container" className="w-full mx-auto pb-12 space-y-6">

            <ForecastHeader
                currentPortfolioValueBrl={currentPortfolioValueBrl || 0}
                currentTargetValue={h.currentTargetValue}
                startingValueBrl={h.startingValueBrl}
                target2031={h.target2031}
                finalValueBrl={h.finalValueBrl}
                finalValueGbp={h.finalValueGbp}
                etaMonths={h.etaMonths}
                forecastEtaMonths={h.forecastEtaMonths}
                formatK={h.formatK}
            />

            <ScenarioEditor
                isLocked={h.isLocked}
                lockedPlan={h.lockedPlan}
                lockedAt={h.lockedAt}
                monthlyContribution={h.monthlyContribution}
                annualInterestRate={h.annualInterestRate}
                target2031={h.target2031}
                startMonth={h.startMonth}
                startingValueBrl={h.startingValueBrl}
                requiredContributionHint={h.requiredContributionHint}
                forecastPhases={h.forecastPhases}
                formatK={h.formatK}
                setMonthlyContribution={h.setMonthlyContribution}
                setAnnualInterestRate={h.setAnnualInterestRate}
                setStartMonth={h.setStartMonth}
                setLastInteraction={h.setLastInteraction}
                handleGoal2031Change={h.handleGoal2031Change}
                handleSave={h.handleSave}
                handleAddPhase={h.handleAddPhase}
                handleUpdatePhase={h.handleUpdatePhase}
                handleRemovePhase={h.handleRemovePhase}
                budgetSurplusBrl={h.budgetSurplusBrl}
            />

            <ForecastChart
                forecastData={h.forecastData}
                forecastPhases={h.forecastPhases}
                target2031={h.target2031}
                secondaryCurrency={h.secondaryCurrency}
                secondaryPrefix={h.secondaryPrefix}
                formatK={h.formatK}
            />

            {/* Waterfall + Insights */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <GrowthWaterfall
                    startingCapital={h.startingValueBrl || 0}
                    totalDeposits={h.totalContributedBrl}
                    compoundGrowth={h.projectedGrowthBrl}
                    projectedTotal={h.finalValueBrl}
                    formatValue={(v: number) => h.formatK(v, 'BRL')}
                />
                <SmartInsights
                    currentValue={currentPortfolioValueBrl || 0}
                    goalValue={h.target2031}
                    goalYear={2031}
                    monthlyContribution={h.monthlyContribution}
                    annualInterestRate={h.annualInterestRate}
                    projectedFinalValue={h.finalValueBrl}
                    totalDeposits={h.totalContributedBrl}
                    compoundGrowth={h.projectedGrowthBrl}
                    isLocked={h.isLocked}
                />
            </div>

            {/* Collapsible Ledger */}
            <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
                <button
                    onClick={() => h.setLedgerOpen(!h.ledgerOpen)}
                    className="w-full flex items-center justify-between border-none cursor-pointer" style={{ padding: '16px 20px', background: 'transparent', borderBottom: h.ledgerOpen ? '1px solid rgba(255,255,255,0.06)' : 'none', transition: 'all 0.2s ease' }}
                >
                    <div className="flex items-center gap-2.5">
                        <span className="text-sm">📊</span>
                        <span className="text-[13px] font-semibold tracking-[0.3px]" style={{ color: 'rgba(245,245,220,0.7)' }}>Planning Ledger</span>
                        <span className="text-[11px] font-normal" style={{ color: 'rgba(245,245,220,0.3)' }}>({h.forecastData.length} rows)</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {h.ledgerOpen && (
                            <span
                                onClick={(e) => { e.stopPropagation(); document.getElementById('live-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                                className="flex items-center gap-1.5 bg-[#34D399]/10 border border-[#34D399]/20 rounded-lg px-3 py-1.5 text-data-xs font-space text-[#34D399] hover:bg-[#34D399]/20 transition-colors cursor-pointer"
                            >
                                <MapPin size={10} /> Jump to Live
                            </span>
                        )}
                        <span className="text-xs inline-block" style={{ color: 'rgba(245,245,220,0.35)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: h.ledgerOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    </div>
                </button>

                <div style={{ maxHeight: h.ledgerOpen ? 'calc(100vh - 12rem)' : '0', overflow: h.ledgerOpen ? 'auto' : 'hidden', transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                    <table className="w-full border-collapse text-[15px]">
                        <thead className="sticky top-0 z-10" style={{ background: '#121418', backdropFilter: 'blur(10px)' }}>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <th className="p-3 text-left text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: 'rgba(245,245,220,0.4)' }}>Date</th>
                                <th className="p-3 text-left text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: 'rgba(245,245,220,0.4)' }}>Type</th>
                                <th className="p-3 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: 'rgba(245,245,220,0.4)' }}>Contr.</th>
                                <th className="p-3 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: 'rgba(245,245,220,0.4)' }}>Total</th>
                                <th className="p-3 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#D4AF37' }}>Target</th>
                                <th className="p-3 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: 'rgba(245,245,220,0.4)' }}>Diff</th>
                            </tr>
                        </thead>
                        <tbody>
                            {h.reversedData.map((row, i) => {
                                const total = row.actual || row.forecast || 0;
                                const diff = row.targetBrl ? (total - row.targetBrl) : 0;
                                const isLive = row.type === 'live';
                                const isTarget = row.date === 'Dec/2026' || row.date === 'Dec/2031';

                                return (
                                    <tr key={i} id={isLive ? 'live-row' : undefined} className={`
                                        border-b border-white/[0.03] h-12 transition-colors hover:bg-white/[0.02]
                                        ${isLive ? 'bg-[#34D399]/5 border-[#34D399]/20' : ''}
                                        ${isTarget ? 'bg-[#D4AF37]/5' : ''}
                                    `}>
                                        <td className={`px-3 font-space tabular-nums ${isTarget ? 'text-[#D4AF37] font-bold' : 'text-white/50'}`}>{row.date}</td>
                                        <td className="px-3">
                                            <span className={`px-2 py-0.5 rounded text-data-xs font-space font-semibold uppercase border
                                                ${row.type === 'actual' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    isLive ? 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/20' :
                                                        'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20'}
                                            `}>
                                                {row.type === 'actual' ? 'ACT' : isLive ? 'LIVE' : 'EST'}
                                            </span>
                                        </td>
                                        <td className="px-3 text-right text-white/50">{formatCurrency(row.contribution, 'BRL').replace('R$', '')}</td>
                                        <td className={`px-3 text-right font-medium ${diff >= 0 ? 'text-[#34D399]' : 'text-[#ef4444]'}`}>
                                            {formatCurrency(total, 'BRL')}
                                        </td>
                                        <td className="px-3 text-right text-white/30 font-space tabular-nums">{row.targetBrl ? formatCurrency(row.targetBrl, 'BRL').replace('R$', '') : '—'}</td>
                                        <td className={`px-3 text-right font-medium ${diff >= 0 ? 'text-[#34D399]' : 'text-[#ef4444]'}`}>
                                            {row.targetBrl ? `${diff > 0 ? '+' : ''}${formatCurrency(diff, 'BRL').replace('R$', '')}` : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <StatusModal
                isOpen={h.statusModal.isOpen}
                title={h.statusModal.title}
                message={h.statusModal.message}
                type={h.statusModal.type}
                onClose={() => h.setStatusModal((prev: any) => ({ ...prev, isOpen: false }))}
            />
        </div>
        <PageTutorialOverlay pageId="growth-forecast" steps={FORECAST_TUTORIAL_STEPS} />
        </>
    );
}
