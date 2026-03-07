"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, LabelList } from 'recharts';
import { formatCurrency } from '@/lib/currency';
import actualsData from '../data/forecast_actuals.json';
import { calculateTargetMetric, parseDate, getMonthDiff, calculateFV, calculatePMT } from '@/lib/forecastUtils';
import StatusModal from './StatusModal';
import HardwareDial from './HardwareDial';
import AllocationTargetsBox from './AllocationTargetsBox';

const MilestoneRow = ({ y, isTarget, isDec26, displayValue, target2031, lastInteraction, handleGoal2031Change, formatK }) => {
    const [isEditingTarget, setIsEditingTarget] = useState(false);
    const [tempTarget, setTempTarget] = useState(displayValue.toString());
    const inputRef = useRef(null);

    const handleStartEdit = () => {
        if (isTarget) {
            setIsEditingTarget(true);
            setTempTarget(displayValue.toString());
        }
    };

    const handleFinishEdit = () => {
        setIsEditingTarget(false);
        const parsed = parseInt(tempTarget, 10);
        if (!isNaN(parsed)) {
            handleGoal2031Change(parsed);
        }
    };

    useEffect(() => {
        if (isEditingTarget && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditingTarget]);

    return (
        <div key={y} className={`relative grid grid-cols-[1.5rem_3.5rem_1fr_6rem] sm:grid-cols-[2rem_4rem_1fr_8rem] items-center gap-2 sm:gap-4 p-1.5 rounded-lg transition-colors ${isTarget ? 'bg-white/5 border border-white/10' : ''}`}>
            {/* Node */}
            <div className="flex justify-center z-10">
                <div className={`w-3 h-3 rounded-full transition-all duration-500 ${isTarget && lastInteraction === 'goals' ? 'bg-[#ff7f00] shadow-[0_0_10px_#ff7f00]' : (isTarget ? 'bg-[#05ff9b] shadow-[0_0_10px_#05ff9b]' : 'bg-white/20')}`}></div>
            </div>

            {/* Year Label */}
            <div className={`font-bebas text-lg tracking-wider ${isTarget ? 'text-[#ff7f00]' : (isDec26 ? 'text-[#D4AF37]' : 'text-parchment/50')}`}>
                {y}
            </div>

            {/* Interactive Area */}
            <div className="flex items-center w-full min-w-0 z-30 relative py-2">
                {isTarget ? (
                    <input
                        type="range"
                        min={100000}
                        max={50000000}
                        step={10000}
                        value={displayValue || 100000}
                        onChange={(e) => {
                            e.stopPropagation();
                            handleGoal2031Change(parseInt(e.target.value, 10));
                        }}
                        className="w-full h-2 accent-[#ff7f00] bg-white/10 rounded-lg cursor-pointer hover:accent-[#ff7f00] transition-colors relative z-40"
                        style={{ pointerEvents: 'auto' }}
                    />
                ) : (
                    <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white/10 transition-all duration-1000"
                            style={{ width: `${Math.min(100, (displayValue / target2031) * 100)}%` }}
                        ></div>
                    </div>
                )}
            </div>

            {/* Value Display */}
            <div
                className={`font-mono text-xs sm:text-sm text-right whitespace-nowrap ${isTarget ? 'text-[#ff7f00] font-bold cursor-text hover:text-[#ff9f40]' : 'text-parchment/60'}`}
                onClick={handleStartEdit}
            >
                {isEditingTarget ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={tempTarget}
                        onChange={(e) => setTempTarget(e.target.value)}
                        onBlur={handleFinishEdit}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleFinishEdit();
                            if (e.key === 'Escape') setIsEditingTarget(false);
                        }}
                        className="w-20 bg-black/40 border border-white/20 rounded px-1 outline-none text-right font-mono text-xs sm:text-sm text-[#ff7f00]"
                    />
                ) : (
                    formatK(displayValue, 'BRL')
                )}
            </div>
        </div>
    );
};


export default function PlanningTab({ currentPortfolioValueBrl, currentPortfolioValueGbp, liveContributionBrl, liveContributionGbp, masterMixData, allocationTargets, onTargetsSaved }) {
    // Helper to format input values for the dials
    const formatSmallBrl = (val) => `R$ ${(val / 1000).toFixed(0)}k`;
    const formatLargeBrl = (val) => `R$ ${(val / 1000000).toFixed(1)}M`;
    const formatPercent = (val) => `${val}%`;

    // State with LocalStorage Persistence
    const [monthlyContribution, setMonthlyContribution] = useState(12000);
    const [annualInterestRate, setAnnualInterestRate] = useState(10);

    // Focus exclusively on a single 2031 macro goal
    const [target2031, setTarget2031] = useState(10000000);

    // Track if a manual override was made to a goal, blocking auto-recalc temporarily
    const [lastInteraction, setLastInteraction] = useState('inputs'); // 'inputs' | 'goals' 

    // Projection Anchor: 'live' (Current Month) or 'historical' (Start of Dataset)
    const [anchorMode, setAnchorMode] = useState('historical');

    const [forecastData, setForecastData] = useState([]);

    // Derived Target Metrics
    const [targetMetrics, setTargetMetrics] = useState({ requiredMonthlyState: 0, requiredRate: 0 });

    // Status Modal State
    const [statusModal, setStatusModal] = useState({ isOpen: false, title: '', message: '', type: 'success' });

    // Load from API on Mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/forecast-settings');
                if (res.ok) {
                    const data = await res.json();
                    setMonthlyContribution(data.monthlyContribution || 12000);
                    setAnnualInterestRate(data.annualInterestRate || 10);
                    // Always default to historical for "standard view" on mount 
                    // unless we want to allow the saved preference to override.
                    // The user specifically asked for Historical to be the standard view.
                    setAnchorMode('historical');
                    if (data.yearlyGoals && data.yearlyGoals[2031]) {
                        setTarget2031(data.yearlyGoals[2031]);
                    }
                }
            } catch (err) {
                console.error("Failed to load forecast settings", err);
            }
        };
        fetchSettings();
    }, []);

    const handleSaveSettings = async () => {
        try {
            const res = await fetch('/api/forecast-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    monthlyContribution,
                    annualInterestRate,
                    anchorMode,
                    yearlyGoals: { 2031: target2031 }
                })
            });
            if (res.ok) {
                setStatusModal({
                    isOpen: true,
                    title: 'Settings Updated',
                    message: 'Your projection settings and targets have been saved successfully.',
                    type: 'success'
                });
            } else {
                setStatusModal({
                    isOpen: true,
                    title: 'Save Failed',
                    message: 'Could not save settings. Please try again.',
                    type: 'error'
                });
            }
        } catch (e) {
            console.error("Save failed", e);
            setStatusModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred while saving. Please check your connection.',
                type: 'error'
            });
        }
    };

    const lastActualDate = actualsData[actualsData.length - 1]?.date;
    const firstActualDate = actualsData[0]?.date;
    const firstActualValueBrl = actualsData[0]?.actualBRL || 0;

    const lastDateObj = useMemo(() => parseDate(lastActualDate), [lastActualDate]);
    const firstDateObj = useMemo(() => parseDate(firstActualDate), [firstActualDate]);

    // Auto-calculate Baseline 2031 Goal strictly from formula when Inputs override
    useEffect(() => {
        if (lastInteraction !== 'inputs') return;

        const currentYear = new Date().getFullYear();
        if (currentYear > 2031) return;

        const startValue = anchorMode === 'live' ? (currentPortfolioValueBrl || 0) : (firstActualValueBrl || 0);
        const anchorDate = anchorMode === 'live' ? (lastDateObj || new Date()) : (firstDateObj || new Date());

        const rate = annualInterestRate / 100 / 12;
        const targetDate = new Date(2031, 11, 1); // Dec 1st of 2031

        const months = getMonthDiff(anchorDate, targetDate);
        const rawVal = calculateFV(startValue, rate, months, monthlyContribution);

        // Snap to nearest 10k
        const nextTarget = Math.max(0, Math.round(rawVal / 10000) * 10000);
        if (!isNaN(nextTarget) && isFinite(nextTarget)) {
            setTarget2031(nextTarget);
        }

        // Also update required metrics display safely
        setTargetMetrics({ requiredMonthlyState: monthlyContribution, requiredRate: annualInterestRate });
    }, [monthlyContribution, annualInterestRate, currentPortfolioValueBrl, firstActualValueBrl, lastDateObj, firstDateObj, anchorMode, lastInteraction]);

    // Handle Bidirectional Sync from 2031 Goal Dial back to Inputs
    const handleGoal2031Change = (newValue) => {
        const validNewValue = isNaN(newValue) ? 10000000 : newValue;
        setLastInteraction('goals');
        setTarget2031(validNewValue);

        const startValue = anchorMode === 'live' ? (currentPortfolioValueBrl || 0) : (firstActualValueBrl || 0);
        const anchorDate = anchorMode === 'live' ? (lastDateObj || new Date()) : (firstDateObj || new Date());

        const rate = annualInterestRate / 100 / 12;
        const targetDate = new Date(2031, 11, 1);
        const months = getMonthDiff(anchorDate, targetDate);

        // Reverse Calculate required PMT
        let newPMT = calculatePMT(validNewValue, startValue, rate, months);
        if (isNaN(newPMT) || !isFinite(newPMT)) newPMT = 0;
        newPMT = Math.max(0, Math.round(newPMT / 50) * 50); // Snap to nearest 50

        setMonthlyContribution(newPMT);
        setTargetMetrics({ requiredMonthlyState: newPMT, requiredRate: annualInterestRate });
    };

    // Calculate Forecast & Target Line for Chart
    useEffect(() => {
        // --- 2. Build Chart Data ---

        // Prepare Actuals
        // Prepare Actuals
        const now = new Date();
        const currentMonthStr = `${now.toLocaleString('default', { month: 'short' })}/${now.getFullYear()}`; // e.g., Feb/2026

        // Filter out the current month from actuals if it exists (so we can replace it with LIVE)
        const pastActuals = actualsData.filter(d => d.date !== currentMonthStr);

        let cleanActuals = pastActuals.map(d => ({
            date: d.date,
            actual: d.actualBRL,
            actualGbp: d.actualGBP || 0,
            forecast: null,
            forecastGbp: null,
            type: 'actual',
            contribution: d.contribution || 0,
            contributionGbp: d.contributionGBP || 0,
            interest: d.interest || 0,
            interestGbp: d.interestGBP || 0
            // Target will be added in loop
        }));

        // Add LIVE row
        const lastPastActual = pastActuals[pastActuals.length - 1];
        const lastPastBrl = lastPastActual ? lastPastActual.actualBRL : 0;
        const lastPastGbp = lastPastActual ? lastPastActual.actualGBP : 0;

        const liveBrl = currentPortfolioValueBrl || 0;
        const liveGbp = currentPortfolioValueGbp || 0;

        const liveRow = {
            date: currentMonthStr,
            actual: liveBrl,
            actualGbp: liveGbp,
            forecast: null,
            forecastGbp: null,
            type: 'live',
            contribution: liveContributionBrl !== undefined ? liveContributionBrl : (liveBrl - lastPastBrl),
            contributionGbp: liveContributionGbp !== undefined ? liveContributionGbp : (liveGbp - lastPastGbp),
            interest: 0, // Not separating interest for live row
            interestGbp: 0
        };

        cleanActuals.push(liveRow);

        // Validate start values
        let currentValueBrl = currentPortfolioValueBrl;
        if (!currentValueBrl || isNaN(currentValueBrl)) {
            currentValueBrl = actualsData.length > 0 ? actualsData[actualsData.length - 1].actualBRL : 0;
        }

        let currentValueGbp = currentPortfolioValueGbp;
        if (!currentValueGbp || isNaN(currentValueGbp)) {
            currentValueGbp = actualsData.length > 0 ? actualsData[actualsData.length - 1].actualGBP : 0;
        }

        // Calculate implied exchange rate from current values, or default
        const impliedRate = (currentValueBrl && currentValueGbp) ? currentValueBrl / currentValueGbp : 7.0;

        // Rate
        const monthlyRate = annualInterestRate / 100 / 12;

        // Generate Forecast until Dec 2031
        const forecastPoints = [];
        let nextDate = new Date(lastDateObj);
        nextDate.setMonth(nextDate.getMonth() + 1); // Start next month
        const endDate = new Date(2031, 11, 1);

        let accumulatedValueBrl = currentValueBrl;
        let accumulatedValueGbp = currentValueGbp;

        // Estimate monthly contribution in GBP based on implied rate
        const monthlyContributionGbp = monthlyContribution / impliedRate;

        while (nextDate <= endDate) {
            // Apply Interest
            const interestEarnedBrl = accumulatedValueBrl * monthlyRate;
            accumulatedValueBrl += interestEarnedBrl;
            accumulatedValueBrl += monthlyContribution;

            const interestEarnedGbp = accumulatedValueGbp * monthlyRate;
            accumulatedValueGbp += interestEarnedGbp;
            accumulatedValueGbp += monthlyContributionGbp;

            const mmm = nextDate.toLocaleString('default', { month: 'short' });
            const yyyy = nextDate.getFullYear();
            const dateStr = `${mmm}/${yyyy}`;

            forecastPoints.push({
                date: dateStr,
                actual: null,
                actualGbp: null,
                forecast: Math.round(accumulatedValueBrl),
                forecastGbp: Math.round(accumulatedValueGbp),
                type: 'forecast',
                contribution: monthlyContribution,
                contributionGbp: monthlyContributionGbp,
                interest: interestEarnedBrl,
                interestGbp: interestEarnedGbp
                // Target added later
            });

            nextDate.setMonth(nextDate.getMonth() + 1);
        }

        const combinedData = [...cleanActuals, ...forecastPoints];

        // --- 3. Map Target Line to Combined Data ---
        const activeRate = annualInterestRate / 100 / 12;
        const anchorDate = anchorMode === 'live' ? lastDateObj : firstDateObj;
        const startValue = anchorMode === 'live' ? currentPortfolioValueBrl : firstActualValueBrl;

        const finalData = combinedData.map((pt) => {
            const ptDate = parseDate(pt.date);

            // If anchorMode is live, the target line only starts from the live month onwards
            if (anchorMode === 'live' && ptDate < anchorDate) {
                return { ...pt, targetBrl: null };
            }

            const monthsSinceStart = getMonthDiff(anchorDate, ptDate);

            // Calculate perfect target value based on current sync state
            const targetVal = calculateFV(startValue, activeRate, monthsSinceStart, targetMetrics.requiredMonthlyState);

            return {
                ...pt,
                targetBrl: Math.round(targetVal || 0)
            };
        });

        setForecastData(finalData);

    }, [monthlyContribution, annualInterestRate, currentPortfolioValueBrl, currentPortfolioValueGbp, lastActualDate, firstActualValueBrl, firstDateObj, lastDateObj, anchorMode, targetMetrics.requiredMonthlyState]);

    // Helper to format large numbers
    const formatK = (val, currency = 'BRL') => {
        const prefix = currency === 'BRL' ? 'R$' : '£';
        if (val >= 1000000) return `${prefix} ${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${prefix} ${(val / 1000).toFixed(0)}k`;
        return val;
    };

    // Sort data for table (Newest First)
    const reversedData = [...forecastData].reverse();

    // Projections
    const finalValueBrl = forecastData.length > 0 ? (forecastData[forecastData.length - 1].forecast || forecastData[forecastData.length - 1].actual) : 0;
    const finalValueGbp = forecastData.length > 0 ? (forecastData[forecastData.length - 1].forecastGbp || forecastData[forecastData.length - 1].actualGbp) : 0;

    // Find Dec 2026 value
    const valDec26 = forecastData.find(d => d.date === 'Dec/2026');
    const projectedDec26Brl = valDec26 ? (valDec26.forecast || valDec26.actual) : 0;

    // Yearly goals for derived summary
    const goal26 = forecastData.find(d => d.date === 'Dec/2026')?.forecast || 3000000;
    const goal31 = target2031;

    const totalMonthsForecast = forecastData.filter(d => d.type === 'forecast').length;
    const totalContributedBrl = monthlyContribution * totalMonthsForecast;
    const totalContributedGbp = (monthlyContribution / ((currentPortfolioValueBrl && currentPortfolioValueGbp) ? currentPortfolioValueBrl / currentPortfolioValueGbp : 7.0)) * totalMonthsForecast;

    const projectedGrowthBrl = finalValueBrl - (currentPortfolioValueBrl || 0) - totalContributedBrl;
    const projectedGrowthGbp = finalValueGbp - (currentPortfolioValueGbp || 0) - totalContributedGbp;

    return (
        <div className="w-full max-w-[1800px] mx-auto pb-12">
            <h2 className="text-[#D4AF37] text-4xl m-0 mb-8 font-bebas tracking-widest drop-shadow-[0_0_12px_rgba(212,175,55,0.6)] uppercase text-center">
                Long-Term Planning
            </h2>

            {/* 2-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 items-start">

                {/* Left Column: Projection Settings & Summary */}

                {/* Controls - Photorealistic Hardware Panel */}
                <div
                    className="relative rounded-2xl p-6 lg:p-8 flex flex-col gap-6"
                    style={{
                        background: '#130a21', // Minimal flat dark
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05), 0 10px 30px rgba(0,0,0,0.5)'
                    }}
                >
                    <div className="flex justify-between items-center pb-2 relative z-10 border-b border-white/5 mb-4">
                        <h3 className="font-bebas text-2xl tracking-widest text-parchment m-0 flex items-center gap-2">
                            PROJECTION SETTINGS
                        </h3>

                        {/* Anchor Mode Toggle */}
                        <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                            <button
                                onClick={() => { setAnchorMode('historical'); setLastInteraction('inputs'); }}
                                className={`px-3 py-1 text-xs font-mono font-bold tracking-wider rounded-md transition-all ${anchorMode === 'historical'
                                    ? 'bg-white/10 text-parchment shadow-sm'
                                    : 'text-parchment/40 hover:text-parchment/70'
                                    }`}
                                title="Start projections from the beginning of the dataset"
                            >
                                HISTORICAL
                            </button>
                            <button
                                onClick={() => { setAnchorMode('live'); setLastInteraction('inputs'); }}
                                className={`px-3 py-1 text-xs font-mono font-bold tracking-wider rounded-md transition-all ${anchorMode === 'live'
                                    ? 'bg-vu-green/20 text-vu-green shadow-sm'
                                    : 'text-parchment/40 hover:text-parchment/70'
                                    }`}
                                title="Start projections from the current live month"
                            >
                                LIVE
                            </button>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-col sm:flex-row gap-6 lg:gap-8 mt-2 lg:mt-4 items-center sm:items-stretch">

                        {/* Dials Column */}
                        <div className="flex flex-row sm:flex-col gap-6 lg:gap-8 justify-center items-center shrink-0 w-full sm:w-auto">
                            {/* Monthly Contribution - Primary Dial */}
                            <HardwareDial
                                label="MONTHLY GAIN"
                                subtitle=""
                                value={monthlyContribution}
                                min={0}
                                max={50000}
                                step={1000}
                                onChange={(val) => { setLastInteraction('inputs'); setMonthlyContribution(val); }}
                                formatValue={formatSmallBrl}
                                size={120}
                                glowColor="#05ff9b"
                            />

                            {/* Annual Return - Secondary Dial */}
                            <HardwareDial
                                label="EXPECTED YIELD"
                                value={annualInterestRate}
                                min={0}
                                max={25}
                                step={0.5}
                                onChange={(val) => { setLastInteraction('inputs'); setAnnualInterestRate(val); }}
                                formatValue={formatPercent}
                                size={90}
                                glowColor="#05ff9b"
                            />
                        </div>

                        {/* Divider */}
                        <div className="w-full h-px sm:w-px sm:h-auto bg-white/10 shrink-0"></div>

                        {/* Interactive Yearly Milestones Timeline Column */}
                        <div className="flex-1 flex flex-col w-full min-w-0">
                            <h4 className="font-mono text-xs text-parchment/60 uppercase tracking-widest mb-4 text-center sm:text-left">Yearly Milestones (Bidirectional)</h4>

                            <div className="flex flex-col gap-4 relative pr-1">
                                {/* Vertical Timeline Line */}
                                <div className="absolute left-4 sm:left-6 top-2 bottom-2 w-0.5 bg-white/5"></div>

                                {[2026, 2027, 2028, 2029, 2030, 2031].map((y) => {
                                    if (y < new Date().getFullYear()) return null;

                                    const isTarget = y === 2031;
                                    const isDec26 = y === 2026;

                                    const yearData = forecastData.find(d => d.date === `Dec/${y}`);
                                    const expectedValue = yearData ? (yearData.forecast || yearData.actual) : 0;
                                    const displayValue = isTarget ? target2031 : expectedValue;
                                    return (
                                        <MilestoneRow
                                            key={y}
                                            y={y}
                                            isTarget={isTarget}
                                            isDec26={isDec26}
                                            displayValue={displayValue}
                                            target2031={target2031}
                                            lastInteraction={lastInteraction}
                                            handleGoal2031Change={handleGoal2031Change}
                                            formatK={formatK}
                                        />
                                    );
                                })}
                            </div>

                            <div className="mt-auto pt-6 border-t border-white/5 flex justify-center sm:justify-end">
                                <button
                                    onClick={handleSaveSettings}
                                    className="relative group bg-gradient-to-b from-[#333] to-[#111] border border-white/10 rounded-lg px-8 py-2.5 overflow-hidden shadow-xl transition-all hover:scale-105 active:scale-95"
                                >
                                    <div className="absolute inset-0 bg-[#D4AF37]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <span className="relative font-bebas tracking-[0.2em] text-[#D4AF37] text-lg">
                                        SAVE TARGETS
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Divider separating Settings from Stats */}
                    <div className="mt-4 pt-6 border-t border-white/10">

                        {/* Summary Stats - Integrated into the Settings Box */}
                        <div className="relative">
                            {/* Top Row: Main Highlights */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-white/5">
                                <div className="flex flex-col">
                                    <span className="font-mono text-[10px] text-parchment/40 uppercase tracking-[0.2em] mb-1">Projected Total (2031)</span>
                                    <div className="font-bebas text-4xl lg:text-5xl text-[#D4AF37] tracking-widest drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)]">
                                        {formatK(finalValueBrl, 'BRL')}
                                    </div>
                                    <div className="font-mono text-lg text-parchment/50">
                                        {formatK(finalValueGbp, 'GBP')}
                                    </div>
                                </div>

                                <div className="flex flex-col justify-center sm:items-end">
                                    <span className="font-mono text-[10px] text-parchment/40 uppercase tracking-[0.2em] mb-1">Goal vs. Reality</span>
                                    <div className="flex items-center gap-3">
                                        <div className={`font-bebas text-3xl tracking-widest ${finalValueBrl >= target2031 ? 'text-vu-green' : 'text-red-400'}`}>
                                            {((finalValueBrl / target2031) * 100).toFixed(1)}%
                                        </div>
                                        <div className="h-10 w-[2px] bg-white/5"></div>
                                        <div className="text-right">
                                            <div className="font-mono text-xs text-parchment/70 uppercase">Dec '26 Milestone</div>
                                            <div className="font-bebas text-xl text-[#D4AF37] tracking-wide">{formatK(goal26, 'BRL')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Row: Breakdown */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                                <div className="space-y-1">
                                    <span className="font-mono text-[9px] text-parchment/30 uppercase tracking-widest">Initial Capital</span>
                                    <div className="font-mono text-sm text-parchment/80">{formatCurrency(currentPortfolioValueBrl || 0, 'BRL')}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="font-mono text-[9px] text-parchment/30 uppercase tracking-widest">Total Deposits</span>
                                    <div className="font-mono text-sm text-parchment/80">+{formatCurrency(totalContributedBrl, 'BRL')}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="font-mono text-[9px] text-vu-green/50 uppercase tracking-widest">Estimated Growth</span>
                                    <div className="font-mono text-sm text-vu-green font-bold">+{formatCurrency(projectedGrowthBrl, 'BRL')}</div>
                                </div>
                            </div>

                            {/* Math Readout Footer */}
                            <div className="mt-auto pt-4 flex items-center gap-3">
                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                                <div className="font-mono text-[10px] text-parchment/40 italic flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]/50 animate-pulse"></div>
                                    Formula: Dec'31 PMT Solver Active
                                </div>
                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                            </div>
                        </div>
                    </div> {/* Closes the Settings vs Stats divider */}
                </div> {/* Closes the Projection Settings Left Column Box */}

                {/* Right Column: Allocation Targets Box */}
                <div className="flex flex-col">
                    <AllocationTargetsBox
                        masterMixData={masterMixData}
                        allocationTargets={allocationTargets}
                        onTargetsSaved={onTargetsSaved}
                    />
                </div>

            </div> {/* Closes the 2-Column Grid */}

            {/* Chart & Table Side-by-Side Wrapper at xl */}
            <div className="flex flex-col xl:flex-row gap-8 mb-12 items-start w-full">

                {/* Chart Panel */}
                <div className="flex-1 min-w-0 bg-[#1A0F2E] border-t border-l border-t-[#D4AF37]/40 border-l-[#D4AF37]/40 border-b-2 border-r-2 border-b-black/60 border-r-black/60 shadow-[0_15px_30px_rgba(0,0,0,0.6)] rounded-2xl p-6 lg:p-8 xl:sticky xl:top-24">
                    <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                        <LineChart color="#D4AF37" size={24} />
                        <h3 className="font-bebas text-2xl tracking-widest text-[#D4AF37] m-0">Wealth Trajectory</h3>
                    </div>
                    {/* Recharts sometimes fails if container dims are 0 initially. width=99% hack helps. */}
                    <div style={{ width: '100%', height: '500px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={forecastData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="var(--fg-secondary)"
                                    fontSize={12}
                                    tickMargin={10}
                                    interval={11}
                                />
                                {/* Left Axis: BRL */}
                                <YAxis
                                    yAxisId="left"
                                    stroke="rgba(255,255,255,0.4)"
                                    fontSize={12}
                                    fontFamily="Space Mono, monospace"
                                    tickFormatter={(val) => `R$${(val / 1000000).toFixed(1)}M`}
                                    domain={['auto', 'auto']}
                                />
                                {/* Right Axis: GBP */}
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="rgba(255,255,255,0.4)"
                                    fontSize={12}
                                    fontFamily="Space Mono, monospace"
                                    tickFormatter={(val) => `£${(val / 1000).toFixed(0)}k`}
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#170d2b', borderColor: 'rgba(212,175,55,0.3)', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', fontFamily: 'Space Mono, monospace', fontSize: '0.8rem' }}
                                    formatter={(val, name) => {
                                        if (name && (name.includes('BRL') || name === 'Actual Portfolio' || name === 'Forecast')) return formatCurrency(val, 'BRL');
                                        if (name === 'Target Line') return formatCurrency(val, 'BRL');
                                        return formatCurrency(val, 'GBP');
                                    }}
                                    labelStyle={{ color: 'var(--fg-secondary)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <ReferenceLine yAxisId="left" y={target2031} label={`Goal '31`} stroke="#ff7f00" strokeOpacity={0.5} strokeDasharray="3 3" />

                                {/* Target Line */}
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="targetBrl"
                                    name="Target Line"
                                    stroke="#ff7f00"
                                    strokeWidth={2}
                                    strokeDasharray="3 3"
                                    dot={false}
                                    connectNulls
                                />

                                {/* BRL Lines */}
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="actual"
                                    name="Actual (BRL)"
                                    stroke="var(--vu-green)"
                                    strokeWidth={3}
                                    dot={false}
                                    connectNulls
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="forecast"
                                    name="Forecast (BRL)"
                                    stroke="#34d399"
                                    strokeWidth={3}
                                    strokeDasharray="5 5"
                                    dot={false}
                                    connectNulls
                                >
                                    <LabelList
                                        dataKey="forecast"
                                        position="top"
                                        content={({ x, y, value, index }) => {
                                            if (index === forecastData.length - 1) {
                                                return (
                                                    <text x={x} y={y} dy={-10} fill="#34d399" fontSize={12} fontWeight="bold" textAnchor="middle">
                                                        {formatK(value, 'BRL')}
                                                    </text>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                </Line>

                                {/* GBP Lines */}
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="actualGbp"
                                    name="Actual (GBP)"
                                    stroke="#a855f7"
                                    strokeWidth={3}
                                    dot={false}
                                    connectNulls
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="forecastGbp"
                                    name="Forecast (GBP)"
                                    stroke="#d8b4fe"
                                    strokeWidth={3}
                                    strokeDasharray="5 5"
                                    dot={false}
                                    connectNulls
                                >
                                    <LabelList
                                        dataKey="forecastGbp"
                                        position="top"
                                        content={({ x, y, value, index }) => {
                                            if (index === forecastData.length - 1) {
                                                return (
                                                    <text x={x} y={y} dy={-10} fill="#d8b4fe" fontSize={12} fontWeight="bold" textAnchor="middle">
                                                        {formatK(value, 'GBP')}
                                                    </text>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                </Line>
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Ledger Table */}
                <div className="w-full xl:w-[500px] shrink-0 bg-[#1A0F2E] border-t border-l border-t-[#D4AF37]/40 border-l-[#D4AF37]/40 border-b-2 border-r-2 border-b-black/60 border-r-black/60 shadow-[0_15px_30px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                        <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] m-0">📜 Planning Ledger</h3>
                        <button
                            onClick={() => {
                                document.getElementById('live-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            className="bg-black/50 border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/20 font-mono text-xs tracking-wider px-3 py-1.5 rounded shadow-inner transition-colors"
                        >
                            📍 JUMP TO LIVE
                        </button>
                    </div>
                    <div className="overflow-x-auto overflow-y-auto max-h-[600px] xl:max-h-[calc(100vh-14rem)]">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                            <thead className="sticky top-0 z-10 bg-[#120a20] shadow-md border-b border-white/10">
                                {/* Group Headers */}
                                <tr>
                                    <th colSpan="2"></th>
                                    <th colSpan="4" style={{ padding: '8px', textAlign: 'center', color: 'var(--accent-color)', fontWeight: '600', letterSpacing: '1px', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                        🇧🇷 BRL
                                    </th>
                                    <th colSpan="1" style={{ padding: '8px', textAlign: 'center', color: '#a855f7', fontWeight: '600', letterSpacing: '1px', borderBottom: '1px solid rgba(168, 85, 247, 0.2)', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                                        🇬🇧 GBP
                                    </th>
                                </tr>
                                {/* Column Headers */}
                                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ padding: '8px', textAlign: 'left', color: 'var(--fg-secondary)', fontWeight: '500' }}>Date</th>
                                    <th style={{ padding: '8px', textAlign: 'left', color: 'var(--fg-secondary)', fontWeight: '500' }}>Type</th>

                                    <th style={{ padding: '8px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: '500' }}>Contr.</th>
                                    <th style={{ padding: '8px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: '500' }}>Total</th>
                                    <th style={{ padding: '8px', textAlign: 'right', color: '#D4AF37', fontWeight: '500' }}>Target</th>
                                    <th style={{ padding: '8px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: '500' }}>Diff</th>

                                    <th style={{ padding: '8px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: '500', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reversedData.map((row, index) => {
                                    const isTargetRow = row.date === 'Dec/2026' || row.date === 'Dec/2031';
                                    return (
                                        <tr key={index} id={row.type === 'live' ? 'live-row' : undefined} style={{
                                            borderBottom: row.type === 'live' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255,255,255,0.03)',
                                            height: '50px',
                                            backgroundColor: row.type === 'live' ? 'rgba(16, 185, 129, 0.1)' :
                                                isTargetRow ? 'rgba(250, 204, 21, 0.1)' : 'transparent'
                                        }}>
                                            <td style={{ padding: '0 12px', fontFamily: 'var(--font-mono)', color: isTargetRow ? '#facc15' : 'var(--fg-secondary)', fontWeight: isTargetRow ? 'bold' : 'normal' }}>{row.date}</td>
                                            <td style={{ padding: '0 12px' }}>
                                                <span style={{
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    backgroundColor: row.type === 'actual' ? 'rgba(59, 130, 246, 0.1)' :
                                                        row.type === 'live' ? 'rgba(5, 255, 155, 0.1)' : 'rgba(212, 175, 55, 0.1)',
                                                    color: row.type === 'actual' ? '#3b82f6' :
                                                        row.type === 'live' ? '#05ff9b' : '#D4AF37',
                                                    fontSize: '0.7rem',
                                                    textTransform: 'uppercase',
                                                    fontWeight: '600',
                                                    border: row.type === 'actual' ? '1px solid rgba(59, 130, 246, 0.2)' :
                                                        row.type === 'live' ? '1px solid rgba(5, 255, 155, 0.3)' : '1px solid rgba(212, 175, 55, 0.2)'
                                                }}>
                                                    {row.type === 'actual' ? 'ACT' : row.type === 'live' ? 'LIVE' : 'EST'}
                                                </span>
                                            </td>

                                            {/* BRL Columns */}
                                            <td style={{ padding: '0 12px', textAlign: 'right', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>
                                                {formatCurrency(row.contribution, 'BRL').replace('R$', '')}
                                            </td>
                                            <td style={{ padding: '0 12px', textAlign: 'right', fontWeight: '500', fontSize: '0.9rem', color: (row.actual || row.forecast) >= row.targetBrl ? 'var(--vu-green)' : '#ff4d4d' }}>
                                                {formatCurrency(row.actual || row.forecast, 'BRL')}
                                            </td>
                                            <td style={{ padding: '0 12px', textAlign: 'right', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                                                {formatCurrency(row.targetBrl, 'BRL').replace('R$', '')}
                                            </td>
                                            <td style={{ padding: '0 12px', textAlign: 'right', fontSize: '0.85rem', fontWeight: '500', color: (row.actual || row.forecast) - row.targetBrl >= 0 ? 'var(--vu-green)' : '#ff4d4d' }}>
                                                {((row.actual || row.forecast) - row.targetBrl) > 0 ? '+' : ''}{formatCurrency((row.actual || row.forecast) - row.targetBrl, 'BRL').replace('R$', '')}
                                            </td>

                                            <td style={{ padding: '0 12px', textAlign: 'right', fontWeight: '500', fontSize: '0.9rem', color: '#e9d5ff', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                                                {formatCurrency(row.actualGbp || row.forecastGbp, 'GBP')}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <StatusModal
                isOpen={statusModal.isOpen}
                title={statusModal.title}
                message={statusModal.message}
                type={statusModal.type}
                onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
