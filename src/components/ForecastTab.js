"use client";

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, LabelList } from 'recharts';
import { formatCurrency } from '@/lib/currency';
import actualsData from '../data/forecast_actuals.json';
import { calculateTargetMetric, parseDate, getMonthDiff, calculateFV } from '@/lib/forecastUtils';

export default function ForecastTab({ currentPortfolioValueBrl, currentPortfolioValueGbp, liveContributionBrl, liveContributionGbp }) {
    // Helper to format input values with commas
    const formatInput = (val) => {
        if (!val) return '';
        return new Intl.NumberFormat('pt-BR').format(val);
    };

    // State with LocalStorage Persistence
    const [monthlyContribution, setMonthlyContribution] = useState(12000);
    const [annualInterestRate, setAnnualInterestRate] = useState(10);
    const [portfolioGoalDec31, setPortfolioGoalDec31] = useState(10000000);
    const [portfolioGoalDec26, setPortfolioGoalDec26] = useState(3000000); // Default ~3M for 2026
    const [forecastData, setForecastData] = useState([]);

    // Derived Target Metrics (Calculated automatically)
    const [targetMetrics, setTargetMetrics] = useState({ requiredMonthlyState: 0, requiredRate: 0 });

    // Input States (Formatted)
    const [contributionInput, setContributionInput] = useState("");
    const [goalDec31Input, setGoalDec31Input] = useState("");
    const [goalDec26Input, setGoalDec26Input] = useState("");

    // Load from API on Mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/forecast-settings');
                if (res.ok) {
                    const data = await res.json();
                    setMonthlyContribution(data.monthlyContribution || 12000);
                    setAnnualInterestRate(data.annualInterestRate || 10);
                    setPortfolioGoalDec31(data.portfolioGoalDec31 || 10000000);
                    setPortfolioGoalDec26(data.portfolioGoalDec26 || 3000000);
                }
            } catch (err) {
                console.error("Failed to load forecast settings", err);
            }
        };
        fetchSettings();
    }, []);

    // Sync Input State with Actual State (No auto-save to localStorage anymore)
    useEffect(() => {
        setContributionInput(formatInput(monthlyContribution));
    }, [monthlyContribution]);

    useEffect(() => {
        setGoalDec31Input(formatInput(portfolioGoalDec31));
    }, [portfolioGoalDec31]);

    useEffect(() => {
        setGoalDec26Input(formatInput(portfolioGoalDec26));
    }, [portfolioGoalDec26]);


    const handleContributionChange = (e) => {
        const val = e.target.value;
        const rawValue = val.replace(/[^0-9]/g, '');
        const numberValue = parseInt(rawValue) || 0;
        setMonthlyContribution(numberValue);
    };

    const handleGoalDec31Change = (e) => {
        const val = e.target.value;
        const rawValue = val.replace(/[^0-9]/g, '');
        const numberValue = parseInt(rawValue) || 0;
        setPortfolioGoalDec31(numberValue);
    };

    const handleGoalDec26Change = (e) => {
        const val = e.target.value;
        const rawValue = val.replace(/[^0-9]/g, '');
        const numberValue = parseInt(rawValue) || 0;
        setPortfolioGoalDec26(numberValue);
    };

    const handleSaveSettings = async () => {
        try {
            const res = await fetch('/api/forecast-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    monthlyContribution,
                    annualInterestRate,
                    portfolioGoalDec26,
                    portfolioGoalDec31
                })
            });
            if (res.ok) {
                // Optional: Show success toast
                alert("Settings Saved!");
            } else {
                alert("Failed to save.");
            }
        } catch (e) {
            console.error("Save failed", e);
            alert("Error saving settings.");
        }
    };

    const lastActualDate = actualsData[actualsData.length - 1]?.date;
    const firstActualDate = actualsData[0]?.date;
    const firstActualValueBrl = actualsData[0]?.actualBRL || 0;

    const lastDateObj = parseDate(lastActualDate);
    const firstDateObj = parseDate(firstActualDate);

    // Calculate Forecast & Target Line
    useEffect(() => {
        // Use shared utility to solve for target metrics
        const { target, requiredRate, requiredPMT } = calculateTargetMetric(
            new Date(), // Date doesn't matter for the solver constants, just the settings
            { portfolioGoalDec26, portfolioGoalDec31 },
            actualsData
        );

        const foundR = requiredRate;
        const foundPMT = requiredPMT;

        setTargetMetrics({
            requiredMonthlyState: foundPMT,
            requiredRate: (Math.pow(1 + foundR, 12) - 1) * 100
        });



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
        // Calc target value for each point based on foundR and foundPMT, starting from Jan 22

        const finalData = combinedData.map((pt) => {
            const ptDate = parseDate(pt.date);
            const monthsSinceStart = getMonthDiff(firstDateObj, ptDate);

            // Calculate perfect target value
            const targetVal = calculateFV(firstActualValueBrl, foundR, monthsSinceStart, foundPMT);

            return {
                ...pt,
                targetBrl: Math.round(targetVal || 0)
            };
        });

        setForecastData(finalData);

    }, [monthlyContribution, annualInterestRate, currentPortfolioValueBrl, currentPortfolioValueGbp, lastActualDate, firstActualValueBrl, portfolioGoalDec26, portfolioGoalDec31]);

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

    const totalMonthsForecast = forecastData.filter(d => d.type === 'forecast').length;
    const totalContributedBrl = monthlyContribution * totalMonthsForecast;
    const totalContributedGbp = (monthlyContribution / ((currentPortfolioValueBrl && currentPortfolioValueGbp) ? currentPortfolioValueBrl / currentPortfolioValueGbp : 7.0)) * totalMonthsForecast;

    const projectedGrowthBrl = finalValueBrl - (currentPortfolioValueBrl || 0) - totalContributedBrl;
    const projectedGrowthGbp = finalValueGbp - (currentPortfolioValueGbp || 0) - totalContributedGbp;

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <h2 className="text-gradient" style={{ fontSize: '2.2rem', marginBottom: '32px', textAlign: 'center' }}>Portfolio Forecast</h2>

            {/* Controls & Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '32px', marginBottom: '48px' }}>

                {/* Controls */}
                <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.2rem', margin: 0 }}>⚙️ Projection Settings</h3>
                        <button
                            onClick={handleSaveSettings}
                            className="btn-primary"
                            style={{ padding: '6px 16px', fontSize: '0.9rem' }}
                        >
                            Set Targets
                        </button>
                    </div>

                    <div>
                        <label style={{ display: 'block', color: 'var(--fg-secondary)', marginBottom: '8px', fontSize: '0.9rem' }}>
                            Monthly Contribution (BRL)
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                            <span style={{ color: 'var(--fg-secondary)', marginRight: '8px' }}>R$</span>
                            <input
                                type="text"
                                value={contributionInput}
                                onChange={handleContributionChange}
                                style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', fontSize: '1.1rem', width: '100%', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', color: 'var(--fg-secondary)', marginBottom: '8px', fontSize: '0.9rem' }}>
                            Annual Expected Return (%)
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                            <input
                                type="number"
                                value={annualInterestRate}
                                onChange={(e) => setAnnualInterestRate(parseFloat(e.target.value) || 0)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', fontSize: '1.1rem', width: '100%', outline: 'none' }}
                            />
                            <span style={{ color: 'var(--fg-secondary)', marginLeft: '8px' }}>%</span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', color: 'var(--fg-secondary)', marginBottom: '8px', fontSize: '0.9rem' }}>
                                Goal (Dec 2026)
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                                <span style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem', marginRight: '4px' }}>R$</span>
                                <input
                                    type="text"
                                    value={goalDec26Input}
                                    onChange={handleGoalDec26Change}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', fontSize: '1rem', width: '100%', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', color: 'var(--fg-secondary)', marginBottom: '8px', fontSize: '0.9rem' }}>
                                Goal (Dec 2031)
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                                <span style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem', marginRight: '4px' }}>R$</span>
                                <input
                                    type="text"
                                    value={goalDec31Input}
                                    onChange={handleGoalDec31Change}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', fontSize: '1rem', width: '100%', outline: 'none' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="glass-card" style={{ padding: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'center' }}>
                    <div>
                        <div style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Projected Value (Dec 2031)</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
                            <div className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: '700' }}>
                                {formatK(finalValueBrl, 'BRL')}
                            </div>
                            <div style={{ fontSize: '1.8rem', fontWeight: '600', color: 'var(--fg-secondary)' }}>
                                {formatK(finalValueGbp, 'GBP')}
                            </div>
                        </div>

                        <div style={{ fontSize: '0.9rem', color: 'var(--fg-secondary)', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div>
                                Goal '26: {formatK(portfolioGoalDec26, 'BRL')} <span style={{ color: projectedDec26Brl >= portfolioGoalDec26 ? 'var(--accent-color)' : 'var(--error)' }}>
                                    ({((projectedDec26Brl / portfolioGoalDec26) * 100).toFixed(1)}%)
                                </span>
                            </div>
                            <div>
                                Goal '31: {formatK(portfolioGoalDec31, 'BRL')} <span style={{ color: finalValueBrl >= portfolioGoalDec31 ? 'var(--accent-color)' : 'var(--error)' }}>
                                    ({((finalValueBrl / portfolioGoalDec31) * 100).toFixed(1)}%)
                                </span>
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--fg-secondary)', fontStyle: 'italic' }}>
                                To hit goals: {formatCurrency(targetMetrics.requiredMonthlyState, 'BRL')}/mo @ {targetMetrics.requiredRate.toFixed(1)}% APY
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '32px' }}>
                        <div>
                            <div style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Current Portfolio</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>
                                {formatCurrency(currentPortfolioValueBrl || 0, 'BRL')} <span style={{ fontSize: '0.9rem', color: 'var(--fg-secondary)' }}>({formatCurrency(currentPortfolioValueGbp || 0, 'GBP')})</span>
                            </div>
                        </div>
                        <div>
                            <div style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Future Contributions</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{formatCurrency(totalContributedBrl, 'BRL')}</div>
                        </div>
                        <div>
                            <div style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Estimated Growth (Interest)</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--accent-color)' }}>+{formatCurrency(projectedGrowthBrl, 'BRL')}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="glass-card" style={{ padding: '32px', height: '600px', marginBottom: '48px' }}>
                <h3 style={{ margin: '0 0 24px 0', fontSize: '1.3rem' }}>📈 Wealth Trajectory (BRL vs GBP)</h3>
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
                                stroke="#10b981"
                                fontSize={12}
                                tickFormatter={(val) => `R$${(val / 1000000).toFixed(1)}M`}
                                domain={['auto', 'auto']}
                            />
                            {/* Right Axis: GBP */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="#a855f7"
                                fontSize={12}
                                tickFormatter={(val) => `£${(val / 1000).toFixed(0)}k`}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                formatter={(val, name) => {
                                    if (name && (name.includes('BRL') || name === 'Actual Portfolio' || name === 'Forecast')) return formatCurrency(val, 'BRL');
                                    if (name === 'Target Line') return formatCurrency(val, 'BRL');
                                    return formatCurrency(val, 'GBP');
                                }}
                                labelStyle={{ color: 'var(--fg-secondary)' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <ReferenceLine yAxisId="left" y={portfolioGoalDec31} label={`Goal '31`} stroke="#9ca3af" strokeDasharray="3 3" />
                            <ReferenceLine yAxisId="left" y={portfolioGoalDec26} label={`Goal '26`} stroke="#9ca3af" strokeDasharray="3 3" />

                            {/* Target Line (Gray, Dashed) */}
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="targetBrl"
                                name="Target Line"
                                stroke="#9ca3af"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                                connectNulls
                            />

                            {/* BRL Lines */}
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="actual"
                                name="Actual (BRL)"
                                stroke="#10b981"
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
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.3rem' }}>📜 Forecast Ledger</h3>
                    <button
                        onClick={() => {
                            document.getElementById('live-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                        📍 Scroll to LIVE
                    </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            {/* Group Headers */}
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <th colSpan="2"></th>
                                <th colSpan="4" style={{ padding: '12px', textAlign: 'center', color: 'var(--accent-color)', fontWeight: '600', letterSpacing: '1px', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    🇧🇷 BRL PORTFOLIO
                                </th>
                                <th colSpan="1" style={{ padding: '12px', textAlign: 'center', color: '#a855f7', fontWeight: '600', letterSpacing: '1px', borderBottom: '1px solid rgba(168, 85, 247, 0.2)', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                                    🇬🇧 GBP PORTFOLIO
                                </th>
                            </tr>
                            {/* Column Headers */}
                            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--fg-secondary)', fontWeight: '500' }}>Date</th>
                                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--fg-secondary)', fontWeight: '500' }}>Type</th>

                                <th style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: '500' }}>Contr.</th>
                                <th style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: '500' }}>Total</th>
                                <th style={{ padding: '12px', textAlign: 'right', color: '#facc15', fontWeight: '500' }}>Target</th>
                                <th style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: '500' }}>Diff</th>

                                <th style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: '500', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>Total</th>
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
                                                    row.type === 'live' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                                                color: row.type === 'actual' ? '#3b82f6' :
                                                    row.type === 'live' ? '#10b981' : '#facc15',
                                                fontSize: '0.7rem',
                                                textTransform: 'uppercase',
                                                fontWeight: '600',
                                                border: row.type === 'actual' ? '1px solid rgba(59, 130, 246, 0.2)' :
                                                    row.type === 'live' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(234, 179, 8, 0.2)'
                                            }}>
                                                {row.type === 'actual' ? 'ACT' : row.type === 'live' ? 'LIVE' : 'EST'}
                                            </span>
                                        </td>

                                        {/* BRL Columns */}
                                        <td style={{ padding: '0 12px', textAlign: 'right', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>
                                            {formatCurrency(row.contribution, 'BRL').replace('R$', '')}
                                        </td>
                                        <td style={{ padding: '0 12px', textAlign: 'right', fontWeight: '500', fontSize: '0.9rem', color: (row.actual || row.forecast) >= row.targetBrl ? '#10b981' : '#ef4444' }}>
                                            {formatCurrency(row.actual || row.forecast, 'BRL')}
                                        </td>
                                        <td style={{ padding: '0 12px', textAlign: 'right', color: isTargetRow ? '#facc15' : 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: isTargetRow ? 'bold' : 'normal' }}>
                                            {formatCurrency(row.targetBrl, 'BRL').replace('R$', '')}
                                        </td>
                                        <td style={{ padding: '0 12px', textAlign: 'right', fontSize: '0.85rem', fontWeight: '500', color: (row.actual || row.forecast) - row.targetBrl >= 0 ? '#10b981' : '#ef4444' }}>
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
    );
}
