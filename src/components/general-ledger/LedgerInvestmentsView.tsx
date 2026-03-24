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
                <div id="ftue-investment-chart" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold" style={{ margin: 0, color: 'rgba(245,245,220,0.8)' }}>Monthly Investments (Capital Injection)</h3>
                    </div>
                    <div className="w-full" style={{ height: '400px' }}>
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
                                        <div className="flex justify-center gap-5 mt-4 flex-wrap">
                                            {payload.filter((e: any) => e.dataKey !== 'total').map((entry: any, index: number) => {
                                                const resolvedColor = INVESTMENT_COLORS[entry.dataKey]?.color || entry.color;
                                                return (
                                                    <div key={index} className="flex items-center gap-1.5">
                                                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: resolvedColor, boxShadow: `0 0 8px ${resolvedColor}60` }} />
                                                        <span className="text-[11px] font-medium tracking-[0.3px]" style={{ color: 'rgba(245,245,220,0.5)' }}>{entry.value}</span>
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
                <div id="ftue-investment-table" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
                    <button
                        onClick={() => setShowInvestmentLedgerTable(!showInvestmentLedgerTable)}
                        className="w-full flex items-center justify-between border-none cursor-pointer" style={{ padding: '16px 20px', background: 'transparent', borderBottom: showInvestmentLedgerTable ? '1px solid rgba(255,255,255,0.06)' : 'none', transition: 'all 0.2s ease', }}
                    >
                        <div className="flex items-center gap-2.5">
                            <span className="text-sm">💰</span>
                            <span className="text-[13px] font-semibold tracking-[0.3px]" style={{ color: 'rgba(245,245,220,0.7)' }}>Investment Ledger</span>
                            <span className="text-[11px] font-normal" style={{ color: 'rgba(245,245,220,0.3)' }}>({investmentData.length} months)</span>
                        </div>
                        <span className="text-xs inline-block" style={{ color: 'rgba(245,245,220,0.35)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: showInvestmentLedgerTable ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    </button>

                    <div style={{ maxHeight: showInvestmentLedgerTable ? 'calc(100vh - 12rem)' : '0', overflow: showInvestmentLedgerTable ? 'auto' : 'hidden', transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                            <thead className="sticky top-0 z-10" style={{ background: '#121418', backdropFilter: 'blur(10px)' }}>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <th className="p-4 text-left text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: 'rgba(245,245,220,0.4)' }}>Month</th>
                                    <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#3b82f6' }}>Equity</th>
                                    <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#10b981' }}>Fixed Inc.</th>
                                    <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#ef4444' }}>Real Estate</th>
                                    <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#8b5cf6' }}>Pensions</th>
                                    <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#f59e0b' }}>Crypto</th>
                                    <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#ec4899' }}>Debt</th>
                                    <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-bold" style={{ color: '#fff' }}>Total</th>
                                    <th className="p-4 text-center" style={{ width: '60px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {investmentData.map((d: any) => {
                                    const total = d.equity + d.pensions + d.realEstate + d.crypto + d.fixedIncome + d.debt;
                                    const isLiveRow = d.month === currentMonth && !d.isHistorical;
                                    return (
                                        <tr key={`${d.month}-${d.isHistorical ? 'rec' : 'live'}`} style={isLiveRow ? highlightStyle : { borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.7)', fontWeight: isLiveRow ? 700 : 400 }}>
                                                {formatMonthLabel(d.month)} {isLiveRow && <span className="text-[0.65rem] rounded ml-2 font-bold" style={{ background: '#D4AF37', color: '#000', padding: '2px 6px' }}>LIVE</span>}
                                            </td>
                                            <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.5)' }}>{formatCurrency(d.equity, 'GBP')}</td>
                                            <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.5)' }}>{formatCurrency(d.fixedIncome, 'GBP')}</td>
                                            <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.5)' }}>{formatCurrency(d.realEstate, 'GBP')}</td>
                                            <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.5)' }}>{formatCurrency(d.pensions, 'GBP')}</td>
                                            <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.5)' }}>{formatCurrency(d.crypto, 'GBP')}</td>
                                            <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.5)' }}>{formatCurrency(d.debt, 'GBP')}</td>
                                            <td className="text-right font-semibold font-space text-[13px]" style={{ padding: '14px 16px', color: total >= 0 ? 'var(--vu-green)' : '#ef4444' }}>{formatCurrency(total, 'GBP')}</td>
                                            <td className="text-center whitespace-nowrap" style={{ padding: '14px 8px' }}>
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
                                <tr className="font-bold" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <td className="p-4 text-[11px] uppercase tracking-[1px]" style={{ color: 'rgba(245,245,220,0.6)' }}>TOTAL</td>
                                    <td className="p-4 text-right font-space text-[13px]" style={{ color: '#3b82f6' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.equity, 0), 'GBP')}</td>
                                    <td className="p-4 text-right font-space text-[13px]" style={{ color: '#10b981' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.fixedIncome, 0), 'GBP')}</td>
                                    <td className="p-4 text-right font-space text-[13px]" style={{ color: '#ef4444' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.realEstate, 0), 'GBP')}</td>
                                    <td className="p-4 text-right font-space text-[13px]" style={{ color: '#8b5cf6' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.pensions, 0), 'GBP')}</td>
                                    <td className="p-4 text-right font-space text-[13px]" style={{ color: '#f59e0b' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.crypto, 0), 'GBP')}</td>
                                    <td className="p-4 text-right font-space text-[13px]" style={{ color: '#ec4899' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.debt, 0), 'GBP')}</td>
                                    <td className="p-4 text-right font-space text-[13px]" style={{ color: investmentData.reduce((acc, d) => acc + d.equity + d.pensions + d.realEstate + d.crypto + d.fixedIncome + d.debt, 0) >= 0 ? 'var(--vu-green)' : '#ef4444' }}>
                                        {formatCurrency(investmentData.reduce((acc, d) => acc + d.equity + d.pensions + d.realEstate + d.crypto + d.fixedIncome + d.debt, 0), 'GBP')}
                                    </td>
                                    <td className="p-4"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
