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
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                {onRecordSnapshot && (
                    <button
                        onClick={() => setIsMonthlyCloseModalOpen(true)}
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.9rem', height: '44px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <span>📷</span> Record Monthly Close
                    </button>
                )}
                <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)]" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', height: '44px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Auto Close</span>
                    <div
                        onClick={() => onUpdateAppSettings({ ...appSettings, autoMonthlyCloseEnabled: !appSettings?.autoMonthlyCloseEnabled })}
                        style={{
                            width: '40px', height: '20px',
                            background: appSettings?.autoMonthlyCloseEnabled ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                            borderRadius: '10px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s ease'
                        }}
                    >
                        <div style={{
                            width: '16px', height: '16px',
                            background: appSettings?.autoMonthlyCloseEnabled ? '#fff' : 'var(--fg-secondary)',
                            borderRadius: '50%', position: 'absolute', top: '2px',
                            left: appSettings?.autoMonthlyCloseEnabled ? '22px' : '2px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
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
            <div id="ftue-totals-table" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)]" style={{ overflow: 'hidden' }}>
                <button
                    onClick={() => setShowHistoricalsLedger(!showHistoricalsLedger)}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
                        borderBottom: showHistoricalsLedger ? '1px solid rgba(255,255,255,0.06)' : 'none', transition: 'all 0.2s ease',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '14px' }}>📖</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(245,245,220,0.7)', letterSpacing: '0.3px' }}>General Ledger</span>
                        <span style={{ fontSize: '11px', color: 'rgba(245,245,220,0.3)', fontWeight: 400 }}>({combinedSnapshots.length} months)</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'rgba(245,245,220,0.35)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: showHistoricalsLedger ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>▼</span>
                </button>

                <div style={{ maxHeight: showHistoricalsLedger ? 'calc(100vh - 12rem)' : '0', overflow: showHistoricalsLedger ? 'auto' : 'hidden', transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead className="sticky top-0 z-10" style={{ background: '#121418', backdropFilter: 'blur(10px)' }}>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <th style={{ padding: '16px', textAlign: 'left', color: 'rgba(245,245,220,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Month</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: '#D4AF37', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>NW (BRL)</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: '#8b5cf6', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>NW (GBP)</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: '#10b981', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Fixed Inc.</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: '#3b82f6', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Equity</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: '#ef4444', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Real Estate</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: '#f59e0b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Crypto</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: '#8b5cf6', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Pensions</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: '#ec4899', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Debt</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: '#34D399', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>ROI</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: 'rgba(245,245,220,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>FX Rate</th>
                                <th style={{ padding: '16px', textAlign: 'center', width: '80px' }}></th>
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
                                            {formatMonthLabel(d.month)} {isLiveRow && <span style={{ fontSize: '0.65rem', background: '#D4AF37', color: '#000', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', fontWeight: 700 }}>LIVE</span>}
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: '#D4AF37', fontFamily: 'monospace', fontSize: '13px' }}>{(d.networthBRL || d.totalBRL) ? formatCurrency(d.networthBRL || d.totalBRL, 'BRL') : '-'}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: '#8b5cf6', fontFamily: 'monospace', fontSize: '13px' }}>{(d.networthGBP || d.totalGBP) ? formatCurrency(d.networthGBP || d.totalGBP, 'GBP') : '-'}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.categories?.FixedIncome || 0, 'BRL')}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.categories?.Equity || 0, 'BRL')}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.categories?.RealEstate || 0, 'BRL')}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.categories?.Crypto || 0, 'BRL')}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.categories?.Pensions || 0, 'BRL')}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: '#ec4899', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(-totalDebt, 'BRL')}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: d.roi >= 0 ? '#34D399' : '#ef4444', fontFamily: 'monospace', fontSize: '13px', fontWeight: 600 }}>{d.roi ? `${d.roi.toFixed(2)}%` : '-'}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.4)', fontFamily: 'monospace', fontSize: '13px' }}>{impliedRate ? `R$ ${impliedRate.toFixed(2)}` : '-'}</td>
                                        <td style={{ padding: '14px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
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
