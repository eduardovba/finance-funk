import React from 'react';
import { formatCurrency } from '@/lib/currency';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import _GlowingInvestmentPods from '../GlowingInvestmentPods';
const GlowingInvestmentPods = _GlowingInvestmentPods as any;
import {
    formatMonthLabel, formatYAxis,
    INVESTMENT_COLORS,
    GlowingChartTooltip,
    highlightStyle, actionBtnStyle,
} from './LedgerChartUtils';
import type { InvestmentRow } from './types';

interface LedgerInvestmentsViewProps {
    investmentData: InvestmentRow[];
    showInvestmentLedgerTable: boolean;
    setShowInvestmentLedgerTable: (v: boolean) => void;
    currentMonth: string;
    handleEditClick: (type: string, month: string, data: any) => void;
    setDeleteLedgerMonth: (m: string | null) => void;
}

export default function LedgerInvestmentsView({
    investmentData, showInvestmentLedgerTable, setShowInvestmentLedgerTable,
    currentMonth, handleEditClick, setDeleteLedgerMonth,
}: LedgerInvestmentsViewProps) {

    // Prepare pod data
    const investmentHistoricalData = [...investmentData].slice(0, 12).reverse();
    let currentInvestmentData: any = null;

    if (investmentData.length >= 1) {
        const current = investmentData[0];
        const previous = investmentData.length >= 2 ? investmentData[1] : null;
        const calcDiff = (curr: number, prev: number) => ({
            diff: curr - prev,
            pct: prev !== 0 ? ((curr - prev) / prev) * 100 : 0
        });

        currentInvestmentData = {
            equity: current.equity || 0,
            fixedIncome: current.fixedIncome || 0,
            realEstate: current.realEstate || 0,
            pensions: current.pensions || 0,
            crypto: current.crypto || 0,
            debt: current.debt || 0,
            ...(previous ? {
                equityDiff: calcDiff(current.equity || 0, previous.equity || 0).diff,
                equityDiffPct: calcDiff(current.equity || 0, previous.equity || 0).pct,
                fixedIncomeDiff: calcDiff(current.fixedIncome || 0, previous.fixedIncome || 0).diff,
                fixedIncomeDiffPct: calcDiff(current.fixedIncome || 0, previous.fixedIncome || 0).pct,
                realEstateDiff: calcDiff(current.realEstate || 0, previous.realEstate || 0).diff,
                realEstateDiffPct: calcDiff(current.realEstate || 0, previous.realEstate || 0).pct,
                pensionsDiff: calcDiff(current.pensions || 0, previous.pensions || 0).diff,
                pensionsDiffPct: calcDiff(current.pensions || 0, previous.pensions || 0).pct,
                cryptoDiff: calcDiff(current.crypto || 0, previous.crypto || 0).diff,
                cryptoDiffPct: calcDiff(current.crypto || 0, previous.crypto || 0).pct,
                debtDiff: calcDiff(current.debt || 0, previous.debt || 0).diff,
                debtDiffPct: calcDiff(current.debt || 0, previous.debt || 0).pct,
            } : {
                equityDiff: 0, equityDiffPct: 0, fixedIncomeDiff: 0, fixedIncomeDiffPct: 0,
                realEstateDiff: 0, realEstateDiffPct: 0, pensionsDiff: 0, pensionsDiffPct: 0,
                cryptoDiff: 0, cryptoDiffPct: 0, debtDiff: 0, debtDiffPct: 0,
            })
        };
    }

    const stackOrder = ['equity', 'fixedIncome', 'realEstate', 'pensions', 'crypto', 'debt'];

    return (
        <div className="flex flex-col w-full">
            <div id="ftue-investment-pods">
                <GlowingInvestmentPods data={currentInvestmentData} historicalData={investmentHistoricalData} currency="GBP" />
            </div>

            <div className="flex flex-col gap-8 w-full mt-2">
                {/* Chart */}
                <div id="ftue-investment-chart" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'rgba(245,245,220,0.8)', fontWeight: 600 }}>Monthly Investments (Capital Injection)</h3>
                    </div>
                    <div style={{ height: '400px', width: '100%' }}>
                        <ResponsiveContainer>
                            <ComposedChart
                                data={[...investmentData].reverse().map(d => {
                                    let topmost = '';
                                    for (let i = stackOrder.length - 1; i >= 0; i--) {
                                        if ((d as any)[stackOrder[i]] > 0) { topmost = stackOrder[i]; break; }
                                    }
                                    return { ...d, _topmostBar: topmost };
                                })}
                                barCategoryGap="25%"
                            >
                                <defs>
                                    {Object.entries(INVESTMENT_COLORS).map(([key, { color }]) => (
                                        <linearGradient key={key} id={`inv-bar-grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                                            <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                <XAxis dataKey="month" stroke="transparent" tick={{ fill: 'rgba(245,245,220,0.35)', fontSize: 11, fontWeight: 500 }} tickFormatter={formatMonthLabel} tickLine={false} axisLine={false} />
                                <YAxis stroke="transparent" tick={{ fill: 'rgba(245,245,220,0.3)', fontSize: 11 }} tickFormatter={formatYAxis} tickLine={false} axisLine={false} />
                                <Tooltip content={<GlowingChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }} />
                                <Legend content={({ payload }: any) => {
                                    if (!payload) return null;
                                    return (
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '16px', flexWrap: 'wrap' }}>
                                            {payload.filter((e: any) => e.dataKey !== 'total').map((entry: any, index: number) => {
                                                const resolvedColor = INVESTMENT_COLORS[entry.dataKey]?.color || entry.color;
                                                return (
                                                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: resolvedColor, boxShadow: `0 0 8px ${resolvedColor}60` }} />
                                                        <span style={{ fontSize: '11px', color: 'rgba(245,245,220,0.5)', fontWeight: 500, letterSpacing: '0.3px' }}>{entry.value}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                }} />
                                {stackOrder.map(key => {
                                    const name = INVESTMENT_COLORS[key]?.label || key;
                                    return (
                                        <Bar
                                            key={key} dataKey={key} name={name} stackId="a"
                                            fill={`url(#inv-bar-grad-${key})`}
                                            shape={(props: any) => {
                                                const { fill, x, y, width, height, payload } = props;
                                                const r = 6;
                                                if (!width || !height || height <= 0) return <g />;
                                                let topKey = '';
                                                for (let i = stackOrder.length - 1; i >= 0; i--) {
                                                    if ((payload[stackOrder[i]] || 0) > 0) { topKey = stackOrder[i]; break; }
                                                }
                                                const isTop = topKey === key;
                                                if (isTop && height > r) {
                                                    return <path d={`M${x},${y+height} L${x},${y+r} A${r},${r} 0 0,1 ${x+r},${y} L${x+width-r},${y} A${r},${r} 0 0,1 ${x+width},${y+r} L${x+width},${y+height} Z`} fill={fill} />;
                                                }
                                                return <rect x={x} y={y} width={width} height={height} fill={fill} />;
                                            }}
                                        />
                                    );
                                })}
                                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                                <Line type="monotone" dataKey="total" name="Net Monthly" stroke="#fff" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: '#fff', stroke: '#121418', strokeWidth: 2 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Investment Ledger Accordion */}
                <div id="ftue-investment-table" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)]" style={{ overflow: 'hidden' }}>
                    <button
                        onClick={() => setShowInvestmentLedgerTable(!showInvestmentLedgerTable)}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
                            borderBottom: showInvestmentLedgerTable ? '1px solid rgba(255,255,255,0.06)' : 'none', transition: 'all 0.2s ease',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '14px' }}>💰</span>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(245,245,220,0.7)', letterSpacing: '0.3px' }}>Investment Ledger</span>
                            <span style={{ fontSize: '11px', color: 'rgba(245,245,220,0.3)', fontWeight: 400 }}>({investmentData.length} months)</span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'rgba(245,245,220,0.35)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: showInvestmentLedgerTable ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>▼</span>
                    </button>

                    <div style={{ maxHeight: showInvestmentLedgerTable ? 'calc(100vh - 12rem)' : '0', overflow: showInvestmentLedgerTable ? 'auto' : 'hidden', transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead className="sticky top-0 z-10" style={{ background: '#121418', backdropFilter: 'blur(10px)' }}>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <th style={{ padding: '16px', textAlign: 'left', color: 'rgba(245,245,220,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Month</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: '#3b82f6', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Equity</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: '#10b981', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Fixed Inc.</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: '#ef4444', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Real Estate</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: '#8b5cf6', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Pensions</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: '#f59e0b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Crypto</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: '#ec4899', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Debt</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: '#fff', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Total</th>
                                    <th style={{ padding: '16px', textAlign: 'center', width: '60px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {investmentData.map((d: any) => {
                                    const total = d.equity + d.pensions + d.realEstate + d.crypto + d.fixedIncome + d.debt;
                                    const isLiveRow = d.month === currentMonth && !d.isHistorical;
                                    return (
                                        <tr key={`${d.month}-${d.isHistorical ? 'rec' : 'live'}`} style={isLiveRow ? highlightStyle : { borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.7)', fontWeight: isLiveRow ? 700 : 400 }}>
                                                {formatMonthLabel(d.month)} {isLiveRow && <span style={{ fontSize: '0.65rem', background: '#D4AF37', color: '#000', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', fontWeight: 700 }}>LIVE</span>}
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.equity, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.fixedIncome, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.realEstate, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.pensions, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.crypto, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.debt, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: total >= 0 ? 'var(--vu-green)' : '#ef4444', fontWeight: 600, fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(total, 'GBP')}</td>
                                            <td style={{ padding: '14px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                {!isLiveRow && d.isHistorical && (
                                                    <>
                                                        <button onClick={() => handleEditClick('investments', d.month, { equity: d.equity, pensions: d.pensions, realEstate: d.realEstate, crypto: d.crypto, fixedIncome: d.fixedIncome, debt: d.debt })} style={{ ...actionBtnStyle, color: '#D4AF37' }} title="Edit">✏️</button>
                                                        <button onClick={() => setDeleteLedgerMonth(d.month)} style={{ ...actionBtnStyle, color: '#ef4444' }} title="Delete">🗑️</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'rgba(255,255,255,0.03)', fontWeight: 700 }}>
                                    <td style={{ padding: '16px', color: 'rgba(245,245,220,0.6)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>TOTAL</td>
                                    <td style={{ padding: '16px', textAlign: 'right', color: '#3b82f6', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.equity, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right', color: '#10b981', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.fixedIncome, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right', color: '#ef4444', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.realEstate, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right', color: '#8b5cf6', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.pensions, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right', color: '#f59e0b', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.crypto, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right', color: '#ec4899', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.debt, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right', color: investmentData.reduce((acc, d) => acc + d.equity + d.pensions + d.realEstate + d.crypto + d.fixedIncome + d.debt, 0) >= 0 ? 'var(--vu-green)' : '#ef4444', fontFamily: 'monospace', fontSize: '13px' }}>
                                        {formatCurrency(investmentData.reduce((acc, d) => acc + d.equity + d.pensions + d.realEstate + d.crypto + d.fixedIncome + d.debt, 0), 'GBP')}
                                    </td>
                                    <td style={{ padding: '16px' }}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
