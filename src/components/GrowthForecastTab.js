"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList, Legend } from 'recharts';
import { formatCurrency, SUPPORTED_CURRENCIES } from '@/lib/currency';
import { usePortfolio } from '@/context/PortfolioContext';
import actualsData from '../data/forecast_actuals.json';
import { parseDate, getMonthDiff, calculateFV, calculatePMT } from '@/lib/forecastUtils';
import StatusModal from './StatusModal';
import GoalProgressRing from './GoalProgressRing';
import GrowthWaterfall from './GrowthWaterfall';
import SmartInsights from './SmartInsights';
import { Lock, Unlock, Save, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, MapPin, Calendar, Plus, Trash2 } from 'lucide-react';
import PageTutorialOverlay from './ftue/PageTutorialOverlay';

const FORECAST_TUTORIAL_STEPS = [
    { type: 'spotlight', targetId: 'ftue-forecast-projection', title: 'Strategic Growth Projections', message: "Your core goal progress visual and your projected net worth. Compare current trajectory against projections and final goals.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-forecast-scenario', title: 'Scenario Modeling', message: "Tweak monthly contributions, expected returns, and your time horizon. Watch the projection adjust instantly. Lock a scenario to save a snapshot.", position: 'top' },
    { type: 'spotlight', targetId: 'ftue-forecast-container', title: 'Strategy vs. Reality', message: "Compare your locked projections against actual portfolio performance. Revisit and adjust your strategy to ensure you remain on your chosen path.", position: 'top' },
];

// ─── Inline editable value ───
function EditableValue({ value, onChange, min = 0, max = 100000000, step = 1, formatDisplay, suffix = '' }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const inputRef = useRef(null);

    const handleStartEdit = () => {
        setDraft(String(value));
        setEditing(true);
        setTimeout(() => inputRef.current?.select(), 50);
    };

    const handleCommit = () => {
        let v = parseFloat(draft.replace(/[^0-9.]/g, ''));
        if (isNaN(v)) v = value;
        v = Math.max(min, Math.min(max, v));
        onChange(v);
        setEditing(false);
    };

    if (editing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={handleCommit}
                onKeyDown={e => { if (e.key === 'Enter') handleCommit(); if (e.key === 'Escape') setEditing(false); }}
                className="bg-transparent border-b border-[#D4AF37]/50 text-[#D4AF37] font-mono text-sm font-bold outline-none w-24 text-right"
                autoFocus
            />
        );
    }

    return (
        <span
            onClick={handleStartEdit}
            className="font-mono text-sm text-[#D4AF37] font-bold cursor-pointer hover:text-[#D4AF37]/80 transition-colors border-b border-transparent hover:border-[#D4AF37]/30"
            title="Click to type a value"
        >
            {formatDisplay ? formatDisplay(value) : value}{suffix}
        </span>
    );
}
// ─── Calendar-style month picker ───
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function MonthCombobox({ value, onChange, placeholder = "Select month..." }) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Parse value like "Jan/2022" into year
    const parsedYear = value ? parseInt(value.split('/')[1]) : new Date().getFullYear();
    const parsedMonth = value ? MONTH_LABELS.indexOf(value.split('/')[0]) : -1;
    const [viewYear, setViewYear] = useState(parsedYear || new Date().getFullYear());

    useEffect(() => {
        if (value) {
            const y = parseInt(value.split('/')[1]);
            if (!isNaN(y)) setViewYear(y);
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectMonth = (monthIdx) => {
        const label = `${MONTH_LABELS[monthIdx]}/${viewYear}`;
        onChange(label);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative inline-block min-w-[120px]">
            <div
                className="flex items-center gap-1.5 border-b border-white/20 hover:border-[#D4AF37]/50 transition-colors pb-0.5 cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Calendar size={12} className="text-[#D4AF37]" />
                <span className={`font-mono text-sm ${value ? 'text-[#D4AF37]' : 'text-white/40'}`}>
                    {value || placeholder}
                </span>
            </div>

            {isOpen && (
                <div className="absolute z-[100] bottom-full left-0 mb-1.5 w-[220px] bg-[#121418]/90 backdrop-blur-xl border border-white/[0.06] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-3">
                    {/* Year nav */}
                    <div className="flex items-center justify-between mb-3">
                        <button onClick={() => setViewYear(y => y - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#D4AF37] text-xl font-bold hover:bg-[#D4AF37]/20 transition-colors select-none">
                            ‹
                        </button>
                        <span className="font-bebas text-lg tracking-widest text-[#D4AF37]">{viewYear}</span>
                        <button onClick={() => setViewYear(y => y + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#D4AF37] text-xl font-bold hover:bg-[#D4AF37]/20 transition-colors select-none">
                            ›
                        </button>
                    </div>
                    {/* Month grid 4x3 */}
                    <div className="grid grid-cols-4 gap-1">
                        {MONTH_LABELS.map((m, i) => {
                            const isSelected = parsedMonth === i && parsedYear === viewYear;
                            const now = new Date();
                            const isCurrent = now.getMonth() === i && now.getFullYear() === viewYear;
                            return (
                                <button
                                    key={m}
                                    onClick={() => handleSelectMonth(i)}
                                    className={`py-1.5 rounded-lg font-mono text-[11px] transition-all duration-200
                                        ${isSelected
                                            ? 'bg-[#D4AF37] text-[#0D0814] font-bold shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                                            : isCurrent
                                                ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/25'
                                                : 'text-white/60 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    {m}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function GrowthForecastTab({ currentPortfolioValueBrl, currentPortfolioValueGbp, liveContributionBrl, liveContributionGbp }) {
    const { formatPrimary, toPrimary, primaryCurrency, ftueState, updateFtueProgress } = usePortfolio();
    const primaryMeta = SUPPORTED_CURRENCIES[primaryCurrency];

    // Mark "exploreForecast" checklist item as done on first visit
    useEffect(() => {
        if (ftueState && !ftueState.checklistItems?.exploreForecast && updateFtueProgress) {
            updateFtueProgress({ checklistItems: { exploreForecast: true } });
        }
    }, [ftueState, updateFtueProgress]);

    // ═══════════ STATE ═══════════
    const [monthlyContribution, setMonthlyContribution] = useState(12000);
    const [annualInterestRate, setAnnualInterestRate] = useState(10);
    const [target2031, setTarget2031] = useState(10000000);
    const [lastInteraction, setLastInteraction] = useState('inputs');
    // Granular Forecast State
    const [forecastPhases, setForecastPhases] = useState([
        { id: 1, startMonth: null, contribution: 12000, yield: 10 }
    ]);
    const [phasesReady, setPhasesReady] = useState(false);

    // Auto-save phases to DB whenever they change (after initial API load)
    useEffect(() => {
        if (!phasesReady) return;
        const timer = setTimeout(() => {
            fetch('/api/forecast-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ forecastPhases })
            }).catch(err => console.error('Failed to auto-save phases:', err));
        }, 500); // debounce 500ms
        return () => clearTimeout(timer);
    }, [forecastPhases, phasesReady]);


    const [forecastData, setForecastData] = useState([]);

    // Start month for the target line
    const [startMonth, setStartMonth] = useState('Jan/2022'); // defaults to first actual

    // Lock/Tracking State
    const [isLocked, setIsLocked] = useState(false);
    const [lockedPlan, setLockedPlan] = useState(null);
    const [lockedAt, setLockedAt] = useState(null);

    // UI State
    const [ledgerOpen, setLedgerOpen] = useState(false);
    const [statusModal, setStatusModal] = useState({ isOpen: false, title: '', message: '', type: 'success' });

    // ═══════════ LOAD FROM API ═══════════
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/forecast-settings');
                if (res.ok) {
                    const data = await res.json();
                    setMonthlyContribution(data.monthlyContribution || 12000);
                    setAnnualInterestRate(data.annualInterestRate || 10);
                    if (data.yearlyGoals && data.yearlyGoals[2031]) {
                        setTarget2031(data.yearlyGoals[2031]);
                    }
                    if (data.startMonth) setStartMonth(data.startMonth);
                    // Use API phases as source of truth
                    if (data.forecastPhases && Array.isArray(data.forecastPhases) && data.forecastPhases.length > 0) {
                        setForecastPhases(data.forecastPhases);
                    } else {
                        setForecastPhases([{ id: 1, startMonth: null, contribution: data.monthlyContribution || 12000, yield: data.annualInterestRate || 10 }]);
                    }
                    setPhasesReady(true);
                    // Restore lock state
                    if (data.lockedAt && data.lockedPlan) {
                        setIsLocked(true);
                        setLockedAt(data.lockedAt);
                        setLockedPlan(data.lockedPlan);
                    }
                }
            } catch (err) {
                console.error("Failed to load forecast settings", err);
            }
        };
        fetchSettings();
    }, []);

    // ═══════════ SAVE ═══════════
    const handleSave = async (lockAction = null) => {
        try {
            const payload = {
                monthlyContribution,
                annualInterestRate,
                startMonth,
                yearlyGoals: { 2031: target2031 },
                forecastPhases
            };

            if (lockAction === 'lock') {
                payload.lockedAt = new Date().toISOString();
                payload.lockedPlan = {
                    monthlyContribution,
                    annualInterestRate,
                    goal2031: target2031,
                    startMonth
                };
            } else if (lockAction === 'unlock') {
                payload.lockedAt = null;
                payload.lockedPlan = null;
            } else {
                if (isLocked && lockedPlan) {
                    payload.lockedAt = lockedAt;
                    payload.lockedPlan = lockedPlan;
                }
            }

            const res = await fetch('/api/forecast-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                if (lockAction === 'lock') {
                    setIsLocked(true);
                    setLockedAt(payload.lockedAt);
                    setLockedPlan(payload.lockedPlan);
                    setStatusModal({ isOpen: true, title: 'Plan Locked', message: 'Your targets are now locked. The dashboard will track your actual progress against this plan.', type: 'success' });
                } else if (lockAction === 'unlock') {
                    setIsLocked(false);
                    setLockedAt(null);
                    setLockedPlan(null);
                    setStatusModal({ isOpen: true, title: 'Plan Unlocked', message: 'You can now edit your targets freely.', type: 'success' });
                } else {
                    setStatusModal({ isOpen: true, title: 'Saved', message: 'Your projection settings have been saved.', type: 'success' });
                }
            }
        } catch (e) {
            console.error("Save failed", e);
            setStatusModal({ isOpen: true, title: 'Error', message: 'Failed to save.', type: 'error' });
        }
    };

    // ═══════════ CALCULATIONS ═══════════
    const lastActualDate = actualsData[actualsData.length - 1]?.date;
    const firstActualDate = actualsData[0]?.date;
    const firstActualValueBrl = actualsData[0]?.actualBRL || 0;

    const lastDateObj = useMemo(() => parseDate(lastActualDate), [lastActualDate]);
    const firstDateObj = useMemo(() => parseDate(firstActualDate), [firstActualDate]);
    const startDateObj = useMemo(() => parseDate(startMonth), [startMonth]);


    // Available months for start month picker
    const availableMonths = useMemo(() => {
        return actualsData.map(d => d.date);
    }, []);

    // Generate future months for granular phases
    const futureMonths = useMemo(() => {
        const months = [];
        const now = new Date();
        now.setMonth(now.getMonth() + 1); // Start from next month
        for (let i = 0; i < 360; i++) { // 30 years
            months.push(`${now.toLocaleString('default', { month: 'short' })}/${now.getFullYear()}`);
            now.setMonth(now.getMonth() + 1);
        }
        return months;
    }, []);


    // Starting value at selected start month
    const startingValueBrl = useMemo(() => {
        const row = actualsData.find(d => d.date === startMonth);
        return row?.actualBRL || firstActualValueBrl;
    }, [startMonth, firstActualValueBrl]);

    // Goal is set independently — no auto-calculation from inputs

    // Bidirectional: goal → contribution
    const handleGoal2031Change = (newValue) => {
        const v = isNaN(newValue) ? 10000000 : newValue;
        setLastInteraction('goals');
        setTarget2031(v);
        const rate = annualInterestRate / 100 / 12;
        const months = getMonthDiff(startDateObj, new Date(2031, 11, 1));
        let newPMT = calculatePMT(v, startingValueBrl, rate, months);
        if (isNaN(newPMT) || !isFinite(newPMT)) newPMT = 0;
        newPMT = Math.max(0, Math.round(newPMT / 50) * 50);
        setMonthlyContribution(newPMT);
    };

    // Reverse-calc hints
    const requiredContributionHint = useMemo(() => {
        const rate = annualInterestRate / 100 / 12;
        const months = getMonthDiff(startDateObj, new Date(2031, 11, 1));
        let pmt = calculatePMT(target2031, startingValueBrl, rate, months);
        if (isNaN(pmt) || !isFinite(pmt)) pmt = 0;
        return Math.max(0, Math.round(pmt / 50) * 50);
    }, [target2031, annualInterestRate, startingValueBrl, startDateObj]);

    // Build forecast data
    useEffect(() => {
        const now = new Date();
        const currentMonthStr = `${now.toLocaleString('default', { month: 'short' })}/${now.getFullYear()}`;
        const pastActuals = actualsData.filter(d => d.date !== currentMonthStr);

        let cleanActuals = pastActuals.map(d => ({
            date: d.date, actual: d.actualBRL, actualGbp: d.actualGBP || 0,
            forecast: null, forecastGbp: null, type: 'actual',
            contribution: d.contribution || 0, contributionGbp: d.contributionGBP || 0,
            interest: d.interest || 0, interestGbp: d.interestGBP || 0
        }));

        const lastPastActual = pastActuals[pastActuals.length - 1];
        const lastPastBrl = lastPastActual ? lastPastActual.actualBRL : 0;
        const liveBrl = currentPortfolioValueBrl || 0;
        const liveGbp = currentPortfolioValueGbp || 0;

        cleanActuals.push({
            date: currentMonthStr, actual: liveBrl, actualGbp: liveGbp,
            forecast: liveBrl, forecastGbp: liveGbp, type: 'live',
            contribution: liveContributionBrl !== undefined ? liveContributionBrl : (liveBrl - lastPastBrl),
            contributionGbp: liveContributionGbp || 0, interest: 0, interestGbp: 0
        });

        let cv = liveBrl || (actualsData.length > 0 ? actualsData[actualsData.length - 1].actualBRL : 0);
        let cvGbp = liveGbp || (actualsData.length > 0 ? actualsData[actualsData.length - 1].actualGBP : 0);
        const impliedRate = (cv && cvGbp) ? cv / cvGbp : 7.0;
        const monthlyRate = annualInterestRate / 100 / 12;
        const forecastPoints = [];
        let nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const endDate = new Date(2031, 11, 1);
        let accBrl = cv, accGbp = cvGbp;
        while (nextDate <= endDate) {
            const mmm = nextDate.toLocaleString('default', { month: 'short' });
            const yyyy = nextDate.getFullYear();
            const dateStr = `${mmm}/${yyyy}`;

            // Find active phase
            let activePhase = forecastPhases[0];
            for (let i = 1; i < forecastPhases.length; i++) {
                if (forecastPhases[i].startMonth) {
                    const phaseDate = parseDate(forecastPhases[i].startMonth);
                    if (phaseDate <= nextDate) {
                        activePhase = forecastPhases[i];
                    }
                }
            }

            const activeYield = activePhase.yield / 100 / 12;
            const activeContrib = activePhase.contribution;
            const cGbp = activeContrib / impliedRate;

            accBrl = accBrl * (1 + activeYield) + activeContrib;
            accGbp = accGbp * (1 + activeYield) + cGbp;

            forecastPoints.push({
                date: dateStr, actual: null, actualGbp: null,
                forecast: Math.round(accBrl), forecastGbp: Math.round(accGbp), type: 'forecast',
                contribution: activeContrib, contributionGbp: cGbp,
                interest: accBrl * activeYield, interestGbp: accGbp * activeYield
            });
            nextDate.setMonth(nextDate.getMonth() + 1);
        }

        const combined = [...cleanActuals, ...forecastPoints];

        // ─── TARGET LINE: compound growth curve from start to goal ───
        const goalDate = new Date(2031, 11, 1);
        const totalMonthsTarget = getMonthDiff(startDateObj, goalDate);
        const targetRate = annualInterestRate / 100 / 12;
        // Reverse-calculate the required monthly contribution to hit the goal
        let targetPMT = calculatePMT(target2031, startingValueBrl, targetRate, totalMonthsTarget);
        if (isNaN(targetPMT) || !isFinite(targetPMT)) targetPMT = 0;
        targetPMT = Math.max(0, targetPMT);

        const finalData = combined.map(pt => {
            const ptDate = parseDate(pt.date);
            // Combined value for a continuous GBP line (null-safe — 0 is valid)
            const gbpValue = pt.actualGbp != null ? pt.actualGbp : (pt.forecastGbp != null ? pt.forecastGbp : null);

            if (ptDate < startDateObj) {
                return { ...pt, targetBrl: null, gbpValue };
            }
            // Compound growth from startValue using the required PMT to hit goal
            const monthsFromStart = getMonthDiff(startDateObj, ptDate);
            const compoundTarget = calculateFV(startingValueBrl, targetRate, monthsFromStart, targetPMT);
            return { ...pt, targetBrl: Math.round(compoundTarget || 0), gbpValue };
        });

        setForecastData(finalData);
    }, [monthlyContribution, annualInterestRate, currentPortfolioValueBrl, currentPortfolioValueGbp, lastActualDate, firstActualValueBrl, firstDateObj, lastDateObj, startMonth, startDateObj, startingValueBrl, target2031, liveContributionBrl, liveContributionGbp, forecastPhases]);

    // ═══════════ DERIVED VALUES ═══════════
    const finalValueBrl = forecastData.length > 0 ? (forecastData[forecastData.length - 1].forecast || forecastData[forecastData.length - 1].actual) : 0;
    const finalValueGbp = forecastData.length > 0 ? (forecastData[forecastData.length - 1].forecastGbp || forecastData[forecastData.length - 1].actualGbp) : 0;
    const totalContributedBrl = useMemo(() => {
        return forecastData
            .filter(d => parseDate(d.date) >= startDateObj)
            .reduce((sum, d) => sum + (d.contribution || 0), 0);
    }, [forecastData, startDateObj]);
    const projectedGrowthBrl = finalValueBrl - startingValueBrl - totalContributedBrl;

    // Current target value (where the target line says you should be right now)
    const currentTargetValue = useMemo(() => {
        const liveRow = forecastData.find(d => d.type === 'live');
        return liveRow?.targetBrl || 0;
    }, [forecastData]);

    // ETA (Actuals): how many months early/late based on current value + plan params
    const etaMonths = useMemo(() => {
        const cv = currentPortfolioValueBrl || 0;
        if (cv <= 0 || target2031 <= cv) return target2031 <= cv ? 999 : null;
        const r = annualInterestRate / 100 / 12;
        if (r <= 0) return null;
        const pmt = monthlyContribution;
        const pmtOverR = pmt / r;
        const x = (target2031 + pmtOverR) / (cv + pmtOverR);
        if (x <= 0) return null;
        const monthsToGoal = Math.log(x) / Math.log(1 + r);
        const now = new Date();
        const goalDate = new Date(2031, 11, 1);
        const monthsToDeadline = (goalDate.getFullYear() - now.getFullYear()) * 12 + (goalDate.getMonth() - now.getMonth());
        return Math.round(monthsToDeadline - monthsToGoal);
    }, [currentPortfolioValueBrl, target2031, annualInterestRate, monthlyContribution]);

    // ETA (Forecast): based on the actual projected forecast data crossing the goal
    const forecastEtaMonths = useMemo(() => {
        if (!forecastData.length || target2031 <= 0) return null;
        const now = new Date();
        const goalDate = new Date(2031, 11, 1);
        const monthsToDeadline = (goalDate.getFullYear() - now.getFullYear()) * 12 + (goalDate.getMonth() - now.getMonth());
        // Walk forecast points to find first month where value >= target
        const forecastPoints = forecastData.filter(d => d.type === 'forecast');
        for (let i = 0; i < forecastPoints.length; i++) {
            const val = forecastPoints[i].forecast || 0;
            if (val >= target2031) {
                // This forecast point hits the goal. How many months from now?
                const ptDate = parseDate(forecastPoints[i].date);
                const monthsFromNow = (ptDate.getFullYear() - now.getFullYear()) * 12 + (ptDate.getMonth() - now.getMonth());
                // Positive = early, negative = late
                return Math.round(monthsToDeadline - monthsFromNow);
            }
        }
        // Never reaches goal — estimate how late
        if (forecastPoints.length > 0) {
            const lastVal = forecastPoints[forecastPoints.length - 1].forecast || 0;
            if (lastVal > 0 && lastVal < target2031) {
                // Extrapolate using last phase's growth rate
                const lastPhase = forecastPhases[forecastPhases.length - 1];
                const r = (lastPhase?.yield || annualInterestRate) / 100 / 12;
                const pmt = lastPhase?.contribution || monthlyContribution;
                if (r > 0) {
                    const pmtOverR = pmt / r;
                    const x = (target2031 + pmtOverR) / (lastVal + pmtOverR);
                    if (x > 0) {
                        const extraMonths = Math.log(x) / Math.log(1 + r);
                        return Math.round(-extraMonths); // negative = late
                    }
                }
            }
        }
        return null;
    }, [forecastData, target2031, forecastPhases, annualInterestRate, monthlyContribution]);

    // Dynamic secondary currency label
    const secondaryCurrency = primaryCurrency === 'BRL' ? 'GBP' : 'BRL';
    const secondaryPrefix = secondaryCurrency === 'GBP' ? '£' : 'R$';

    const formatK = (val, currency = 'BRL') => {
        const prefix = currency === 'BRL' ? 'R$' : '£';
        if (Math.abs(val) >= 1000000) return `${prefix} ${(val / 1000000).toFixed(1)}M`;
        if (Math.abs(val) >= 1000) return `${prefix} ${(val / 1000).toFixed(0)}k`;
        return `${prefix} ${val}`;
    };

    const reversedData = useMemo(() => [...forecastData].reverse(), [forecastData]);

    // Custom tooltip
    const ChartTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-[#121418]/90 border border-white/[0.06] rounded-lg p-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl font-mono text-xs">
                <p className="text-[#D4AF37] font-bold mb-1.5">{label}</p>
                {payload.filter(e => e.value != null).map((entry, i) => {
                    const isGbp = entry.dataKey?.toLowerCase().includes('gbp');
                    return (
                        <div key={i} className="flex items-center gap-2 mb-0.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }} />
                            <span className="text-white/60">{entry.name}:</span>
                            <span className="text-white/90">{formatCurrency(entry.value, isGbp ? 'GBP' : 'BRL')}</span>
                        </div>
                    );
                })}
            </div>
        );
    };


    // ═══════════ PHASE MANAGEMENT ═══════════
    const handleAddPhase = () => {
        const newId = (forecastPhases[forecastPhases.length - 1]?.id || 0) + 1;
        setForecastPhases([...forecastPhases, {
            id: newId,
            startMonth: null,
            contribution: monthlyContribution,
            yield: annualInterestRate
        }]);
    };

    const handleUpdatePhase = (id, field, value) => {
        setForecastPhases(forecastPhases.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleRemovePhase = (id) => {
        if (forecastPhases.length <= 1) return;
        setForecastPhases(forecastPhases.filter(p => p.id !== id));
    };

    // ═══════════ RENDER ═══════════

    return (
        <>
        <div id="ftue-forecast-container" className="w-full mx-auto pb-12 space-y-6">

            {/* ─── FORECAST & PROJECTIONS ─── */}
            <div id="ftue-forecast-projection" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] !p-6 lg:!p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-center relative z-10">
                    {/* Left: Progress Ring */}
                    <div className="flex justify-center lg:justify-start">
                        <GoalProgressRing
                            currentValue={currentPortfolioValueBrl || 0}
                            goalValue={target2031}
                            goalYear={2031}
                            startingValue={startingValueBrl}
                            targetValue={currentTargetValue}
                            etaMonths={etaMonths}
                            formatValue={(v) => formatK(v, 'BRL')}
                        />
                    </div>

                    {/* Center: Current Reality (Stacked Grid) */}
                    <div className="flex flex-col justify-center gap-6 lg:border-x lg:border-white/5 lg:px-12 py-4">
                        <div>
                            <span className="font-mono text-[10px] text-white/40 uppercase tracking-[0.2em]">Current Net Wealth</span>
                            <div className="font-bebas text-4xl tracking-wider text-white mt-1.5 drop-shadow-md">
                                R$ {((currentPortfolioValueBrl || 0) / 1000000).toFixed(3)}M
                            </div>
                        </div>
                        {currentTargetValue > 0 && (
                            <div className="pt-6 border-t border-white/5 relative">
                                <span className="font-mono text-[10px] text-white/40 uppercase tracking-[0.2em]">Target (Now)</span>
                                <div className="flex items-baseline gap-3 mt-1.5">
                                    <span className="font-bebas text-3xl tracking-wider text-white/80">R$ {(currentTargetValue / 1000000).toFixed(3)}M</span>
                                    <span className={`font-mono text-sm font-bold ${(currentPortfolioValueBrl || 0) >= currentTargetValue ? 'text-[#05ff9b]' : 'text-[#ef4444]'}`}>
                                        {(currentPortfolioValueBrl || 0) >= currentTargetValue ? '+' : ''}R$ {(((currentPortfolioValueBrl || 0) - currentTargetValue) / 1000000).toFixed(3)}M
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: The Future Projection (Highlighted Box) */}
                    <div className="bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden group hover:border-[#D4AF37]/30 transition-all duration-500 hover:shadow-[0_0_40px_rgba(212,175,55,0.15)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 to-transparent opacity-60 pointer-events-none" />
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37] to-[#05ff9b] opacity-[0.03] pointer-events-none blur-xl" />

                        <div className="relative z-10 flex flex-col gap-6">
                            <div>
                                <span className="flex items-center gap-2 font-mono text-[10px] text-[#D4AF37]/90 uppercase tracking-[0.2em] font-bold">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
                                    Projected 2031
                                </span>
                                <div className="font-bebas text-5xl tracking-widest text-[#D4AF37] mt-3 drop-shadow-[0_0_12px_rgba(212,175,55,0.5)]">
                                    {formatK(finalValueBrl, 'BRL')}
                                </div>
                                <div className="font-mono text-sm text-white/50 mt-1">{formatK(finalValueGbp, 'GBP')}</div>
                            </div>

                            <div className="flex items-end justify-between pt-5 border-t border-[#D4AF37]/20">
                                <div>
                                    <span className="font-mono text-[9px] text-white/40 uppercase tracking-widest block mb-1">Goal vs Projected</span>
                                    <div className={`font-bebas text-2xl tracking-wider ${finalValueBrl >= target2031 ? 'text-[#05ff9b]' : 'text-[#ef4444]'}`}>
                                        {target2031 > 0 ? ((finalValueBrl / target2031) * 100).toFixed(0) : 0}%
                                    </div>
                                </div>

                                {forecastEtaMonths !== null && (
                                    <div className={`px-3 py-1.5 rounded-md border text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md ${forecastEtaMonths >= 0 ? 'bg-[#05ff9b]/10 border-[#05ff9b]/30 text-[#05ff9b] shadow-[0_0_10px_rgba(5,255,155,0.2)]' : 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444] shadow-[0_0_10px_rgba(239,68,68,0.2)]'}`}>
                                        {forecastEtaMonths > 0 ? `+${forecastEtaMonths} mo early` : forecastEtaMonths < 0 ? `${forecastEtaMonths} mo late` : 'On Time'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>



            {/* ─── SCENARIO BUILDER ─── */}
            <div id="ftue-forecast-scenario" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 lg:p-8">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <h3 className="font-bebas text-xl tracking-widest text-parchment m-0">
                            {isLocked ? 'Locked Plan' : 'Scenario Builder'}
                        </h3>
                        {isLocked && lockedAt && (
                            <span className="font-mono text-[10px] text-white/30">
                                Locked {new Date(lockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                        )}
                    </div>
                </div>

                {isLocked ? (
                    /* Locked: compact read-only row */
                    <div className="flex flex-wrap gap-6 items-center">
                        <div className="flex items-center gap-2">
                            <Lock size={12} className="text-white/30" />
                            <span className="font-mono text-xs text-white/50">Monthly:</span>
                            <span className="font-mono text-sm text-[#D4AF37]">{formatK(lockedPlan?.monthlyContribution || monthlyContribution, 'BRL')}/mo</span>
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-white/50">Yield:</span>
                            <span className="font-mono text-sm text-[#D4AF37]">{lockedPlan?.annualInterestRate || annualInterestRate}%</span>
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-white/50">Goal:</span>
                            <span className="font-mono text-sm text-[#D4AF37]">{formatK(lockedPlan?.goal2031 || target2031, 'BRL')}</span>
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-white/30" />
                            <span className="font-mono text-xs text-white/50">From:</span>
                            <span className="font-mono text-sm text-[#D4AF37]">{lockedPlan?.startMonth || startMonth}</span>
                        </div>
                        <div className="ml-auto">
                            <button
                                onClick={() => handleSave('unlock')}
                                className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs font-mono text-white/60 hover:text-white hover:border-[#D4AF37]/30 transition-all"
                            >
                                <Unlock size={12} />
                                Edit Plan
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Unlocked: full interactive controls */
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            {/* Start Month */}
                            <div className="bg-[#121418]/50 backdrop-blur-lg border border-white/[0.06] rounded-xl p-4 hover:border-[#D4AF37]/20 transition-colors">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-mono text-[10px] text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                                        <Calendar size={10} />
                                        Start Month
                                    </span>
                                </div>
                                <MonthCombobox
                                    value={startMonth}
                                    onChange={(v) => { setLastInteraction('inputs'); setStartMonth(v); }}
                                />
                                <div className="mt-2 font-mono text-[10px] text-white/30">
                                    Starting: {formatK(startingValueBrl, 'BRL')}
                                </div>
                            </div>

                            {/* Monthly Contribution */}
                            <div className="bg-[#121418]/50 backdrop-blur-lg border border-white/[0.06] rounded-xl p-4 hover:border-[#D4AF37]/20 transition-colors">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-mono text-[10px] text-white/40 uppercase tracking-widest">Monthly Gain</span>
                                    <EditableValue
                                        value={monthlyContribution}
                                        onChange={(v) => { setLastInteraction('inputs'); setMonthlyContribution(Math.round(v / 100) * 100); }}
                                        min={0} max={100000} step={100}
                                        formatDisplay={(v) => formatK(v, 'BRL')}
                                        suffix="/mo"
                                    />
                                </div>
                                <input
                                    type="range" min={0} max={50000} step={1000}
                                    value={monthlyContribution}
                                    onChange={(e) => { setLastInteraction('inputs'); setMonthlyContribution(parseInt(e.target.value)); }}
                                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#D4AF37]"
                                />
                                <div className="mt-2 font-mono text-[10px] text-white/30">
                                    Required: {formatK(requiredContributionHint, 'BRL')}/mo
                                </div>
                            </div>

                            {/* Expected Yield */}
                            <div className="bg-[#121418]/50 backdrop-blur-lg border border-white/[0.06] rounded-xl p-4 hover:border-[#D4AF37]/20 transition-colors">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-mono text-[10px] text-white/40 uppercase tracking-widest">Expected Yield</span>
                                    <EditableValue
                                        value={annualInterestRate}
                                        onChange={(v) => { setLastInteraction('inputs'); setAnnualInterestRate(Math.round(v * 10) / 10); }}
                                        min={0} max={30} step={0.5}
                                        formatDisplay={(v) => `${v}%`}
                                        suffix=" p.a."
                                    />
                                </div>
                                <input
                                    type="range" min={0} max={25} step={0.5}
                                    value={annualInterestRate}
                                    onChange={(e) => { setLastInteraction('inputs'); setAnnualInterestRate(parseFloat(e.target.value)); }}
                                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#D4AF37]"
                                />
                                <div className="mt-2 font-mono text-[10px] text-white/30">
                                    Monthly: {(annualInterestRate / 12).toFixed(2)}%
                                </div>
                            </div>

                            {/* 2031 Goal */}
                            <div className="bg-[#121418]/50 backdrop-blur-lg border border-white/[0.06] rounded-xl p-4 hover:border-[#D4AF37]/20 transition-colors">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-mono text-[10px] text-white/40 uppercase tracking-widest">2031 Goal</span>
                                    <EditableValue
                                        value={target2031}
                                        onChange={(v) => handleGoal2031Change(Math.round(v / 10000) * 10000)}
                                        min={100000} max={100000000} step={100000}
                                        formatDisplay={(v) => formatK(v, 'BRL')}
                                    />
                                </div>
                                <input
                                    type="range" min={100000} max={50000000} step={100000}
                                    value={target2031}
                                    onChange={(e) => handleGoal2031Change(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#D4AF37]"
                                />
                                <div className="mt-2 font-mono text-[10px] text-white/30">
                                    Drag or click to set target
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                            <button
                                onClick={() => handleSave(null)}
                                className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs font-mono text-white/60 hover:text-white hover:border-white/20 transition-all"
                            >
                                <Save size={12} />
                                Save Draft
                            </button>
                            <button
                                onClick={() => handleSave('lock')}
                                className="flex items-center gap-1.5 bg-gradient-to-r from-[#D4AF37]/20 to-[#CC5500]/20 border border-[#D4AF37]/30 rounded-lg px-5 py-2 text-xs font-mono text-[#D4AF37] font-bold hover:border-[#D4AF37]/50 transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.15)]"
                            >
                                <Lock size={12} />
                                Lock In Plan
                            </button>
                        </div>
                    </>
                )}
            </div>


            {/* ─── GRANULAR FORECAST TOOL ─── */}
            <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-4 lg:p-6 overflow-visible relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] m-0">Forecasting Assumptions</h3>
                    <button
                        onClick={handleAddPhase}
                        className="flex items-center gap-1.5 text-[10px] font-mono uppercase bg-white/5 border border-white/10 rounded-md px-3 py-1.5 hover:bg-white/10 hover:border-[#D4AF37]/30 transition-colors text-white/70"
                    >
                        <Plus size={12} /> Add Phase
                    </button>
                </div>

                <div className="space-y-3 relative">
                    {/* Connecting line for phases */}
                    {forecastPhases.length > 1 && (
                        <div className="absolute left-[15px] top-6 bottom-6 w-px bg-white/10" />
                    )}

                    {forecastPhases.map((phase, index) => (
                        <div key={phase.id} className="relative flex items-stretch gap-4 group">
                            {/* Timeline Dot */}
                            <div className="flex flex-col items-center mt-3 relative z-10 w-[30px] shrink-0">
                                <div className={`w-3 h-3 rounded-full border-2 border-[#0D0814] ${index === 0 ? 'bg-[#05ff9b] shadow-[0_0_8px_rgba(5,255,155,0.4)]' : 'bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.4)]'}`} />
                            </div>

                            {/* Phase Card */}
                            <div className="flex-1 bg-[#121418]/50 backdrop-blur-lg border border-white/[0.06] rounded-xl p-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between hover:border-[#D4AF37]/20 transition-all">
                                <div className="flex flex-col gap-1 w-[160px] shrink-0">
                                    <span className="font-mono text-[9px] text-white/40 uppercase tracking-widest">
                                        Phase {index + 1} &bull; Start Month
                                    </span>
                                    {index === 0 ? (
                                        <span className="font-mono text-sm text-white/80">Current (Now)</span>
                                    ) : (
                                        <MonthCombobox
                                            value={phase.startMonth}
                                            onChange={(v) => handleUpdatePhase(phase.id, 'startMonth', v)}
                                            placeholder="Select month..."
                                        />
                                    )}
                                </div>

                                <div className="flex-1 grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-mono text-[9px] text-white/40 uppercase tracking-widest">Contribution</span>
                                        <EditableValue
                                            value={phase.contribution}
                                            onChange={(v) => handleUpdatePhase(phase.id, 'contribution', v)}
                                            min={0} max={1000000} step={100}
                                            formatDisplay={(v) => formatK(v, 'BRL')}
                                            suffix="/mo"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="font-mono text-[9px] text-white/40 uppercase tracking-widest">Yield</span>
                                        <EditableValue
                                            value={phase.yield}
                                            onChange={(v) => handleUpdatePhase(phase.id, 'yield', v)}
                                            min={0} max={30} step={0.5}
                                            formatDisplay={(v) => `${v}%`}
                                            suffix=" p.a."
                                        />
                                    </div>
                                </div>

                                {index > 0 ? (
                                    <button
                                        onClick={() => handleRemovePhase(phase.id)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
                                        title="Remove Phase"
                                    >
                                        <svg className="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                    </button>
                                ) : (
                                    <div className="w-8 h-8 shrink-0" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── WEALTH TRAJECTORY CHART ─── */}

            <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-4 lg:p-6">
                <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] m-0 mb-5">Wealth Trajectory</h3>
                <div style={{ width: '100%', height: '420px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={forecastData} margin={{ top: 10, right: 60, left: 20, bottom: 10 }}>
                            <defs>
                                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#05ff9b" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#05ff9b" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#05ff9b" stopOpacity={0.1} />
                                    <stop offset="100%" stopColor="#05ff9b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis
                                dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={11}
                                fontFamily="var(--font-space)" tickMargin={10} interval={11}
                                axisLine={{ stroke: 'rgba(212,175,55,0.1)' }}
                            />
                            {/* Left Axis: BRL */}
                            <YAxis
                                yAxisId="left"
                                stroke="rgba(255,255,255,0.3)" fontSize={11}
                                fontFamily="Space Mono, monospace"
                                tickFormatter={(val) => `R$${(val / 1000000).toFixed(1)}M`}
                                axisLine={{ stroke: 'rgba(212,175,55,0.1)' }}
                            />
                            {/* Right Axis: secondary currency */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="rgba(168,85,247,0.4)" fontSize={11}
                                fontFamily="Space Mono, monospace"
                                tickFormatter={(val) => `${secondaryPrefix}${(val / 1000).toFixed(0)}k`}
                                axisLine={{ stroke: 'rgba(168,85,247,0.1)' }}
                            />
                            <Tooltip content={<ChartTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '11px', fontFamily: 'var(--font-space)' }} />

                            {/* Goal horizontal reference */}
                            <ReferenceLine yAxisId="left" y={target2031} stroke="#D4AF37" strokeOpacity={0.3} strokeDasharray="6 4" label={{ value: `Goal ${formatK(target2031, 'BRL')}`, position: 'right', fill: '#D4AF37', fontSize: 11, fontFamily: 'var(--font-space)' }} />

                            {/* Phase markers */}
                            {forecastPhases.filter((p, i) => i > 0 && p.startMonth).map((phase, i) => (
                                <ReferenceLine
                                    key={`phase-${phase.id}`}
                                    yAxisId="left"
                                    x={phase.startMonth}
                                    stroke="#D4AF37"
                                    strokeOpacity={0.35}
                                    strokeDasharray="4 4"
                                    label={{
                                        value: `P${i + 2}: ${formatK(phase.contribution, 'BRL')}/mo · ${phase.yield}%`,
                                        position: 'insideTopRight',
                                        fill: '#D4AF37',
                                        fontSize: 9,
                                        fontFamily: 'var(--font-space)',
                                        opacity: 0.7
                                    }}
                                />
                            ))}

                            {/* Target trajectory line (grey, matches inner ring) */}
                            <Line yAxisId="left" type="monotone" dataKey="targetBrl" name="Target Trajectory" stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls />

                            {/* Actual BRL */}
                            <Area yAxisId="left" type="monotone" dataKey="actual" name="Actual (BRL)" stroke="#05ff9b" strokeWidth={2.5} fill="url(#actualGradient)" dot={false} connectNulls />

                            {/* Forecast BRL */}
                            <Area yAxisId="left" type="monotone" dataKey="forecast" name="Forecast (BRL)" stroke="#05ff9b" strokeWidth={2} strokeDasharray="5 5" fill="url(#forecastGradient)" dot={false} connectNulls>
                                <LabelList
                                    dataKey="forecast"
                                    position="top"
                                    content={({ x, y, value, index }) => {
                                        if (index === forecastData.length - 1) {
                                            return (
                                                <text x={x} y={y} dy={-12} fill="#05ff9b" fontSize={11} fontWeight="bold" textAnchor="middle" fontFamily="var(--font-space)">
                                                    {formatK(value, 'BRL')}
                                                </text>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </Area>

                            {/* GBP Lines (actual + forecast) */}
                            <Line yAxisId="right" type="monotone" dataKey="actualGbp" name={`Actual (${secondaryCurrency})`} stroke="#a855f7" strokeWidth={2} dot={false} connectNulls />
                            <Line yAxisId="right" type="monotone" dataKey="forecastGbp" name={`Projected (${secondaryCurrency})`} stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls>
                                <LabelList
                                    dataKey="forecastGbp"
                                    position="top"
                                    content={({ x, y, value, index }) => {
                                        if (index === forecastData.length - 1) {
                                            return (
                                                <text x={x} y={y} dy={-12} fill="#d8b4fe" fontSize={11} fontWeight="bold" textAnchor="middle" fontFamily="var(--font-space)">
                                                    {formatK(value, 'GBP')}
                                                </text>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </Line>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ─── WATERFALL + INSIGHTS ─── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <GrowthWaterfall
                    startingCapital={startingValueBrl || 0}
                    totalDeposits={totalContributedBrl}
                    compoundGrowth={projectedGrowthBrl}
                    projectedTotal={finalValueBrl}
                    formatValue={(v) => formatK(v, 'BRL')}
                />
                <SmartInsights
                    currentValue={currentPortfolioValueBrl || 0}
                    goalValue={target2031}
                    goalYear={2031}
                    monthlyContribution={monthlyContribution}
                    annualInterestRate={annualInterestRate}
                    projectedFinalValue={finalValueBrl}
                    totalDeposits={totalContributedBrl}
                    compoundGrowth={projectedGrowthBrl}
                    isLocked={isLocked}
                />
            </div>

            {/* ─── COLLAPSIBLE LEDGER ─── */}
            <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-0 overflow-hidden">
                <div className="flex justify-between items-center px-5 py-4">
                    <button
                        onClick={() => setLedgerOpen(!ledgerOpen)}
                        className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity rounded-none bg-transparent p-0"
                    >
                        <span className="font-bebas text-lg tracking-widest text-[#D4AF37]">Planning Ledger</span>
                        <span className="font-mono text-[10px] text-white/30">{forecastData.length} rows</span>
                        {ledgerOpen ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                    </button>
                    {ledgerOpen && (
                        <button
                            onClick={() => document.getElementById('live-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                            className="flex items-center gap-1.5 bg-[#05ff9b]/10 border border-[#05ff9b]/20 rounded-lg px-3 py-1.5 text-[10px] font-mono text-[#05ff9b] hover:bg-[#05ff9b]/20 transition-colors"
                        >
                            <MapPin size={10} />
                            Jump to Live
                        </button>
                    )}
                </div>

                {ledgerOpen && (
                    <div className="border-t border-white/5 overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full border-collapse text-xs">
                            <thead className="sticky top-0 z-10 bg-[#121418] shadow-md">
                                <tr>
                                    <th className="p-3 text-left text-white/50 font-mono font-normal">Date</th>
                                    <th className="p-3 text-left text-white/50 font-mono font-normal">Type</th>
                                    <th className="p-3 text-right text-white/50 font-mono font-normal">Contr.</th>
                                    <th className="p-3 text-right text-white/50 font-mono font-normal">Total</th>
                                    <th className="p-3 text-right text-[#D4AF37]/60 font-mono font-normal">Target</th>
                                    <th className="p-3 text-right text-white/50 font-mono font-normal">Diff</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reversedData.map((row, i) => {
                                    const total = row.actual || row.forecast || 0;
                                    const diff = row.targetBrl ? (total - row.targetBrl) : 0;
                                    const isLive = row.type === 'live';
                                    const isTarget = row.date === 'Dec/2026' || row.date === 'Dec/2031';

                                    return (
                                        <tr key={i} id={isLive ? 'live-row' : undefined} className={`
                                            border-b border-white/[0.03] h-12 transition-colors hover:bg-white/[0.02]
                                            ${isLive ? 'bg-[#05ff9b]/5 border-[#05ff9b]/20' : ''}
                                            ${isTarget ? 'bg-[#D4AF37]/5' : ''}
                                        `}>
                                            <td className={`px-3 font-mono ${isTarget ? 'text-[#D4AF37] font-bold' : 'text-white/50'}`}>{row.date}</td>
                                            <td className="px-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border
                                                    ${row.type === 'actual' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        isLive ? 'bg-[#05ff9b]/10 text-[#05ff9b] border-[#05ff9b]/20' :
                                                            'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20'}
                                                `}>
                                                    {row.type === 'actual' ? 'ACT' : isLive ? 'LIVE' : 'EST'}
                                                </span>
                                            </td>
                                            <td className="px-3 text-right text-white/50">{formatCurrency(row.contribution, 'BRL').replace('R$', '')}</td>
                                            <td className={`px-3 text-right font-medium ${diff >= 0 ? 'text-[#05ff9b]' : 'text-[#ef4444]'}`}>
                                                {formatCurrency(total, 'BRL')}
                                            </td>
                                            <td className="px-3 text-right text-white/30 font-mono">{row.targetBrl ? formatCurrency(row.targetBrl, 'BRL').replace('R$', '') : '—'}</td>
                                            <td className={`px-3 text-right font-medium ${diff >= 0 ? 'text-[#05ff9b]' : 'text-[#ef4444]'}`}>
                                                {row.targetBrl ? `${diff > 0 ? '+' : ''}${formatCurrency(diff, 'BRL').replace('R$', '')}` : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <StatusModal
                isOpen={statusModal.isOpen}
                title={statusModal.title}
                message={statusModal.message}
                type={statusModal.type}
                onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
        <PageTutorialOverlay pageId="growth-forecast" steps={FORECAST_TUTORIAL_STEPS} />
        </>
    );
}
