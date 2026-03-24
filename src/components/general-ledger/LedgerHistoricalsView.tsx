import React from 'react';
import { formatCurrency } from '@/lib/currency';
import _LedgerHeroPods from '../LedgerHeroPods';
const LedgerHeroPods = _LedgerHeroPods as any;
import forecastActuals from '../../data/forecast_actuals.json';
import { formatMonthLabel, highlightStyle, actionBtnStyle } from './LedgerChartUtils';
import type { HistoricalSnapshot } from './types';

interface LedgerHistoricalsViewProps {
    combinedSnapshots: HistoricalSnapshot[];
    forecastSettings: { targetROI: number; targetContribution: number };
    showHistoricalsLedger: boolean;
    setShowHistoricalsLedger: (v: boolean) => void;
    onRecordSnapshot?: () => Promise<void>;
    appSettings: Record<string, any>;
    onUpdateAppSettings: (s: Record<string, any>) => void;
    setIsMonthlyCloseModalOpen: (open: boolean) => void;
    handleEditClick: (type: string, month: string, data: any) => void;
    setDeleteMonth: (m: string | null) => void;
}

export default function LedgerHistoricalsView({
    combinedSnapshots, forecastSettings, showHistoricalsLedger, setShowHistoricalsLedger,
    onRecordSnapshot, appSettings, onUpdateAppSettings, setIsMonthlyCloseModalOpen,
    handleEditClick, setDeleteMonth,
}: LedgerHistoricalsViewProps) {

    return (
        <div className="flex flex-col w-full">
            {/* Toolbar */}
            <div className="flex justify-end items-center gap-4 mb-6">
                {onRecordSnapshot && (
                    <button
                        onClick={() => setIsMonthlyCloseModalOpen(true)}
                        className="btn-primary text-[0.9rem] flex items-center gap-2" style={{ padding: '8px 16px', height: '44px' }}
                    >
                        <span>📷</span> Record Monthly Close
                    </button>
                )}
                <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex items-center gap-3" style={{ padding: '8px 16px', height: '44px' }}>
                    <span className="text-xs uppercase tracking-[0.5px]" style={{ color: 'var(--fg-secondary)' }}>Auto Close</span>
                    <div
                        onClick={() => onUpdateAppSettings({ ...appSettings, autoMonthlyCloseEnabled: !appSettings?.autoMonthlyCloseEnabled })}
                        className="rounded-xl relative cursor-pointer" style={{ width: '40px', height: '20px', background: appSettings?.autoMonthlyCloseEnabled ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s ease' }}
                    >
                        <div className="absolute" style={{ width: '16px', height: '16px', background: appSettings?.autoMonthlyCloseEnabled ? '#fff' : 'var(--fg-secondary)', borderRadius: '50%', top: '2px', left: appSettings?.autoMonthlyCloseEnabled ? '22px' : '2px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                    </div>
                </div>
            </div>

            {/* Hero Pods */}
            <div id="ftue-totals-pods">
                <LedgerHeroPods
                    snapshots={combinedSnapshots}
                    forecastActuals={forecastActuals}
                    targetROI={forecastSettings.targetROI}
                    targetContribution={forecastSettings.targetContribution}
                />
            </div>

            {/* Snapshot Ledger Accordion */}
            <div id="ftue-totals-table" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
                <button
                    onClick={() => setShowHistoricalsLedger(!showHistoricalsLedger)}
                    className="w-full flex items-center justify-between border-none cursor-pointer" style={{ padding: '16px 20px', background: 'transparent', borderBottom: showHistoricalsLedger ? '1px solid rgba(255,255,255,0.06)' : 'none', transition: 'all 0.2s ease', }}
                >
                    <div className="flex items-center gap-2.5">
                        <span className="text-sm">📖</span>
                        <span className="text-[13px] font-semibold tracking-[0.3px]" style={{ color: 'rgba(245,245,220,0.7)' }}>General Ledger</span>
                        <span className="text-[11px] font-normal" style={{ color: 'rgba(245,245,220,0.3)' }}>({combinedSnapshots.length} months)</span>
                    </div>
                    <span className="text-xs inline-block" style={{ color: 'rgba(245,245,220,0.35)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: showHistoricalsLedger ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </button>

                <div className="overflow-x-auto" style={{ maxHeight: showHistoricalsLedger ? 'calc(100vh - 12rem)' : '0', overflow: showHistoricalsLedger ? 'auto' : 'hidden', transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead className="sticky top-0 z-10" style={{ background: '#121418', backdropFilter: 'blur(10px)' }}>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <th className="p-4 text-left text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: 'rgba(245,245,220,0.4)' }}>Month</th>
                                <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#D4AF37' }}>NW (BRL)</th>
                                <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#8b5cf6' }}>NW (GBP)</th>
                                <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#10b981' }}>Fixed Inc.</th>
                                <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#3b82f6' }}>Equity</th>
                                <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#ef4444' }}>Real Estate</th>
                                <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#f59e0b' }}>Crypto</th>
                                <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#8b5cf6' }}>Pensions</th>
                                <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#ec4899' }}>Debt</th>
                                <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#34D399' }}>ROI</th>
                                <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: 'rgba(245,245,220,0.4)' }}>FX Rate</th>
                                <th className="p-4 text-center" style={{ width: '80px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...combinedSnapshots].reverse().map((d: any, i: number) => {
                                const impliedRate = d.totalminuspensionsGBP ? d.totalminuspensionsBRL / d.totalminuspensionsGBP : 0;
                                const isLiveRow = !!d.isLive;
                                const totalDebt = d.categories?.Debt || 0;
                                return (
                                    <tr key={i} style={isLiveRow ? highlightStyle : { borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <td style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.7)', fontWeight: isLiveRow ? 700 : 400 }}>
                                            {formatMonthLabel(d.month)} {isLiveRow && <span className="text-[0.65rem] rounded ml-2 font-bold" style={{ background: '#D4AF37', color: '#000', padding: '2px 6px' }}>LIVE</span>}
                                        </td>
                                        <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: '#D4AF37' }}>{(d.networthBRL || d.totalBRL) ? formatCurrency(d.networthBRL || d.totalBRL, 'BRL') : '-'}</td>
                                        <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: '#8b5cf6' }}>{(d.networthGBP || d.totalGBP) ? formatCurrency(d.networthGBP || d.totalGBP, 'GBP') : '-'}</td>
                                        <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.5)' }}>{formatCurrency(d.categories?.FixedIncome || 0, 'BRL')}</td>
                                        <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.5)' }}>{formatCurrency(d.categories?.Equity || 0, 'BRL')}</td>
                                        <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.5)' }}>{formatCurrency(d.categories?.RealEstate || 0, 'BRL')}</td>
                                        <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.5)' }}>{formatCurrency(d.categories?.Crypto || 0, 'BRL')}</td>
                                        <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.5)' }}>{formatCurrency(d.categories?.Pensions || 0, 'BRL')}</td>
                                        <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: '#ec4899' }}>{formatCurrency(-totalDebt, 'BRL')}</td>
                                        <td className="text-right font-space text-[13px] font-semibold" style={{ padding: '14px 16px', color: d.roi >= 0 ? '#34D399' : '#ef4444' }}>{d.roi ? `${d.roi.toFixed(2)}%` : '-'}</td>
                                        <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.4)' }}>{impliedRate ? `R$ ${impliedRate.toFixed(2)}` : '-'}</td>
                                        <td className="text-center whitespace-nowrap" style={{ padding: '14px 8px' }}>
                                            {!isLiveRow && !d.isLive && (
                                                <>
                                                    <button onClick={() => handleEditClick('snapshot', d.month, { networthBRL: d.networthBRL || 0, networthGBP: d.networthGBP || 0, totalminuspensionsBRL: d.totalminuspensionsBRL || 0, totalminuspensionsGBP: d.totalminuspensionsGBP || 0, FixedIncome: d.categories?.FixedIncome || 0, Equity: d.categories?.Equity || 0, RealEstate: d.categories?.RealEstate || 0, Crypto: d.categories?.Crypto || 0, Pensions: d.categories?.Pensions || 0, Debt: d.categories?.Debt || 0 })} style={{ ...actionBtnStyle, color: '#D4AF37' }} title="Edit">✏️</button>
                                                    <button onClick={() => setDeleteMonth(d.month)} style={{ ...actionBtnStyle, color: '#ef4444' }} title="Delete">🗑️</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
