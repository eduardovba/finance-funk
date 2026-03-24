import React from 'react';
import { formatCurrency } from '@/lib/currency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import _GlowingIncomePods from '../GlowingIncomePods';
const GlowingIncomePods = _GlowingIncomePods as any;
import {
    formatMonthLabel, formatYAxis,
    INCOME_COLORS,
    GlowingChartTooltip, CustomLegend, RoundedTopBar,
    highlightStyle, actionBtnStyle,
} from './LedgerChartUtils';
import type { IncomeRow } from './types';

interface LedgerIncomeViewProps {
    incomeData: IncomeRow[];
    showExtraordinary: boolean;
    setShowExtraordinary: (v: boolean) => void;
    showLedgerTable: boolean;
    setShowLedgerTable: (v: boolean) => void;
    currentMonth: string;
    handleEditClick: (type: string, month: string, data: any) => void;
    setDeleteLedgerMonth: (m: string | null) => void;
}

export default function LedgerIncomeView({
    incomeData, showExtraordinary, setShowExtraordinary,
    showLedgerTable, setShowLedgerTable,
    currentMonth, handleEditClick, setDeleteLedgerMonth,
}: LedgerIncomeViewProps) {

    // Prepare pod data
    const historicalData = [...incomeData].slice(0, 12).reverse();
    let currentMonthData: any = null;

    if (incomeData.length >= 1) {
        const current = incomeData[0];
        const previous = incomeData.length >= 2 ? incomeData[1] : null;
        const calcDiff = (curr: number, prev: number) => ({
            diff: curr - prev,
            pct: prev !== 0 ? ((curr - prev) / prev) * 100 : 0
        });

        currentMonthData = {
            salary: current.salary || 0,
            realEstate: current.realEstate || 0,
            equity: current.equity || 0,
            fixedIncome: current.fixedIncome || 0,
            ...(previous ? {
                salaryDiff: calcDiff(current.salary || 0, previous.salary || 0).diff,
                salaryDiffPct: calcDiff(current.salary || 0, previous.salary || 0).pct,
                realEstateDiff: calcDiff(current.realEstate || 0, previous.realEstate || 0).diff,
                realEstateDiffPct: calcDiff(current.realEstate || 0, previous.realEstate || 0).pct,
                equityDiff: calcDiff(current.equity || 0, previous.equity || 0).diff,
                equityDiffPct: calcDiff(current.equity || 0, previous.equity || 0).pct,
                fixedIncomeDiff: calcDiff(current.fixedIncome || 0, previous.fixedIncome || 0).diff,
                fixedIncomeDiffPct: calcDiff(current.fixedIncome || 0, previous.fixedIncome || 0).pct,
            } : {
                salaryDiff: 0, salaryDiffPct: 0,
                realEstateDiff: 0, realEstateDiffPct: 0,
                equityDiff: 0, equityDiffPct: 0,
                fixedIncomeDiff: 0, fixedIncomeDiffPct: 0,
            })
        };
    }

    return (
        <div className="flex flex-col w-full">
            <div id="ftue-income-pods">
                <GlowingIncomePods data={currentMonthData} historicalData={historicalData} currency="GBP" />
            </div>

            <div className="flex flex-col gap-8 w-full mt-2">
                {/* Chart */}
                <div id="ftue-income-chart" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold tracking-[0.3px]" style={{ margin: 0, color: 'rgba(245,245,220,0.8)' }}>Monthly Income</h3>
                        <div className="flex items-center gap-3">
                            <span className="text-xs tracking-[0.3px]" style={{ color: 'rgba(245,245,220,0.4)' }}>Extraordinary</span>
                            <div
                                onClick={() => setShowExtraordinary(!showExtraordinary)}
                                className="rounded-xl relative cursor-pointer" style={{ width: '40px', height: '20px', background: showExtraordinary ? '#D4AF37' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s ease', boxShadow: showExtraordinary ? '0 0 12px rgba(212,175,55,0.3)' : 'none' }}
                            >
                                <div className="absolute" style={{ width: '16px', height: '16px', background: showExtraordinary ? '#fff' : 'var(--fg-secondary)', borderRadius: '50%', top: '2px', left: showExtraordinary ? '22px' : '2px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                            </div>
                        </div>
                    </div>
                    <div className="w-full" style={{ height: '400px' }}>
                        <ResponsiveContainer>
                            <BarChart
                                data={[...incomeData].reverse().map(d => {
                                    let topmost = '';
                                    if (showExtraordinary && (d as any).extraordinary > 0) topmost = 'extraordinary';
                                    else if (d.fixedIncome > 0) topmost = 'fixedIncome';
                                    else if (d.equity > 0) topmost = 'equity';
                                    else if (d.realEstate > 0) topmost = 'realEstate';
                                    else if (d.salary > 0) topmost = 'salary';
                                    return { ...d, _topmostBar: topmost };
                                })}
                                barCategoryGap="25%"
                            >
                                <defs>
                                    {Object.entries(INCOME_COLORS).map(([key, { color }]) => (
                                        <linearGradient key={key} id={`bar-grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                                            <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                <XAxis dataKey="month" stroke="transparent" tick={{ fill: 'rgba(245,245,220,0.35)', fontSize: 11, fontWeight: 500 }} tickFormatter={formatMonthLabel} tickLine={false} axisLine={false} />
                                <YAxis stroke="transparent" tick={{ fill: 'rgba(245,245,220,0.3)', fontSize: 11 }} tickFormatter={formatYAxis} tickLine={false} axisLine={false} />
                                <Tooltip content={<GlowingChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }} />
                                <Legend content={<CustomLegend />} />
                                {[
                                    { key: 'salary', name: 'Salary' },
                                    { key: 'realEstate', name: 'Real Estate' },
                                    { key: 'equity', name: 'Equity' },
                                    { key: 'fixedIncome', name: 'Interest' },
                                    ...(showExtraordinary ? [{ key: 'extraordinary', name: 'Extraordinary' }] : [])
                                ].map(barDef => (
                                    <Bar key={barDef.key} dataKey={barDef.key} name={barDef.name} stackId="a" fill={`url(#bar-grad-${barDef.key})`} shape={RoundedTopBar(barDef.key)} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revenue Ledger Accordion */}
                <div id="ftue-income-table" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
                    <button
                        onClick={() => setShowLedgerTable(!showLedgerTable)}
                        className="w-full flex items-center justify-between border-none cursor-pointer" style={{ padding: '16px 20px', background: 'transparent', borderBottom: showLedgerTable ? '1px solid rgba(255,255,255,0.06)' : 'none', transition: 'all 0.2s ease', }}
                    >
                        <div className="flex items-center gap-2.5">
                            <span className="text-sm">📋</span>
                            <span className="text-[13px] font-semibold tracking-[0.3px]" style={{ color: 'rgba(245,245,220,0.7)' }}>Income Ledger</span>
                            <span className="text-[11px] font-normal" style={{ color: 'rgba(245,245,220,0.3)' }}>({incomeData.length} months)</span>
                        </div>
                        <span className="text-xs inline-block" style={{ color: 'rgba(245,245,220,0.35)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: showLedgerTable ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    </button>

                    <div style={{ maxHeight: showLedgerTable ? 'calc(100vh - 12rem)' : '0', overflow: showLedgerTable ? 'auto' : 'hidden', transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                            <thead className="sticky top-0 z-10" style={{ background: '#121418', backdropFilter: 'blur(10px)' }}>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <th className="p-4 text-left text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: 'rgba(245,245,220,0.4)' }}>Month</th>
                                    <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#3b82f6' }}>Salary</th>
                                    <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#D4AF37' }}>Extraordinary</th>
                                    <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#10b981' }}>Real Estate</th>
                                    <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#a855f7' }}>Equity</th>
                                    <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-semibold" style={{ color: '#f59e0b' }}>Interest</th>
                                    <th className="p-4 text-right text-[11px] uppercase tracking-[1px] font-bold" style={{ color: '#fff' }}>Total</th>
                                    <th className="p-4 text-center" style={{ width: '60px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {incomeData.map((d: any) => {
                                    const total = d.salary + d.extraordinary + d.realEstate + d.equity + d.fixedIncome;
                                    const isLiveRow = d.month === currentMonth && !d.isHistorical;
                                    return (
                                        <tr key={`${d.month}-${d.isHistorical ? 'rec' : 'live'}`} style={isLiveRow ? highlightStyle : { borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.7)', fontWeight: isLiveRow ? 700 : 400 }}>
                                                {formatMonthLabel(d.month)} {isLiveRow && <span className="text-[0.65rem] rounded ml-2 font-bold" style={{ background: '#D4AF37', color: '#000', padding: '2px 6px' }}>LIVE</span>}
                                            </td>
                                            <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.5)' }}>{formatCurrency(d.salary, 'GBP')}</td>
                                            <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.5)' }}>{formatCurrency(d.extraordinary, 'GBP')}</td>
                                            <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.5)' }}>{formatCurrency(d.realEstate, 'GBP')}</td>
                                            <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.5)' }}>{formatCurrency(d.equity, 'GBP')}</td>
                                            <td className="text-right font-space text-[13px]" style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.5)' }}>{formatCurrency(d.fixedIncome, 'GBP')}</td>
                                            <td className="text-right font-semibold font-space text-[13px]" style={{ padding: '14px 16px', color: total >= 0 ? 'var(--vu-green)' : '#ef4444' }}>{formatCurrency(total, 'GBP')}</td>
                                            <td className="text-center whitespace-nowrap" style={{ padding: '14px 8px' }}>
                                                {!isLiveRow && d.isHistorical && (
                                                    <>
                                                        <button onClick={() => handleEditClick('income', d.month, { salarySavings: d.salary, extraordinary: d.extraordinary, realEstate: d.realEstate, equity: d.equity, fixedIncome: d.fixedIncome })} style={{ ...actionBtnStyle, color: '#D4AF37' }} title="Edit">✏️</button>
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
                                    <td className="p-4 text-right font-space text-[13px]" style={{ color: '#3b82f6' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + d.salary, 0), 'GBP')}</td>
                                    <td className="p-4 text-right font-space text-[13px]" style={{ color: '#D4AF37' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + (d.extraordinary || 0), 0), 'GBP')}</td>
                                    <td className="p-4 text-right font-space text-[13px]" style={{ color: '#10b981' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + d.realEstate, 0), 'GBP')}</td>
                                    <td className="p-4 text-right font-space text-[13px]" style={{ color: '#a855f7' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + d.equity, 0), 'GBP')}</td>
                                    <td className="p-4 text-right font-space text-[13px]" style={{ color: '#f59e0b' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + d.fixedIncome, 0), 'GBP')}</td>
                                    <td className="p-4 text-right font-space text-[13px]" style={{ color: incomeData.reduce((acc, d) => acc + d.salary + (d.extraordinary || 0) + d.realEstate + d.equity + d.fixedIncome, 0) >= 0 ? 'var(--vu-green)' : '#ef4444' }}>
                                        {formatCurrency(incomeData.reduce((acc, d) => acc + d.salary + (d.extraordinary || 0) + d.realEstate + d.equity + d.fixedIncome, 0), 'GBP')}
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
