import { useState, useEffect, useMemo, useRef } from 'react';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { usePortfolio } from '@/context/PortfolioContext';
import actualsData from '../../data/forecast_actuals.json';
import { parseDate, getMonthDiff, calculateFV, calculatePMT } from '@/lib/forecastUtils';
import type { GrowthForecastTabProps, ForecastPhase, ForecastDataPoint, StatusModalState } from './types';

export default function useGrowthForecast({ currentPortfolioValueBrl, currentPortfolioValueGbp, liveContributionBrl, liveContributionGbp, budgetSurplusBrl }: GrowthForecastTabProps) {
    const { formatPrimary, toPrimary, primaryCurrency, ftueState, updateFtueProgress } = usePortfolio() as any;
    const primaryMeta = (SUPPORTED_CURRENCIES as any)[primaryCurrency];

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
    const [forecastPhases, setForecastPhases] = useState<ForecastPhase[]>([
        { id: 1, startMonth: null, contribution: 12000, yield: 10 }
    ]);
    const [phasesReady, setPhasesReady] = useState(false);

    // Auto-save phases to DB whenever they change
    useEffect(() => {
        if (!phasesReady) return;
        const timer = setTimeout(() => {
            fetch('/api/forecast-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ forecastPhases })
            }).catch(err => console.error('Failed to auto-save phases:', err));
        }, 500);
        return () => clearTimeout(timer);
    }, [forecastPhases, phasesReady]);

    const [forecastData, setForecastData] = useState<ForecastDataPoint[]>([]);
    const [startMonth, setStartMonth] = useState('Jan/2022');
    const [isLocked, setIsLocked] = useState(false);
    const [lockedPlan, setLockedPlan] = useState<any>(null);
    const [lockedAt, setLockedAt] = useState<string | null>(null);
    const [ledgerOpen, setLedgerOpen] = useState(false);
    const [statusModal, setStatusModal] = useState<StatusModalState>({ isOpen: false, title: '', message: '', type: 'success' });

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
                    if (data.forecastPhases && Array.isArray(data.forecastPhases) && data.forecastPhases.length > 0) {
                        setForecastPhases(data.forecastPhases);
                    } else {
                        setForecastPhases([{ id: 1, startMonth: null, contribution: data.monthlyContribution || 12000, yield: data.annualInterestRate || 10 }]);
                    }
                    setPhasesReady(true);
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
    const handleSave = async (lockAction: string | null = null) => {
        try {
            const payload: any = {
                monthlyContribution,
                annualInterestRate,
                startMonth,
                yearlyGoals: { 2031: target2031 },
                forecastPhases
            };

            if (lockAction === 'lock') {
                payload.lockedAt = new Date().toISOString();
                payload.lockedPlan = { monthlyContribution, annualInterestRate, goal2031: target2031, startMonth };
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

    const availableMonths = useMemo(() => actualsData.map((d: any) => d.date), []);

    const futureMonths = useMemo(() => {
        const months: string[] = [];
        const now = new Date();
        now.setMonth(now.getMonth() + 1);
        for (let i = 0; i < 360; i++) {
            months.push(`${now.toLocaleString('default', { month: 'short' })}/${now.getFullYear()}`);
            now.setMonth(now.getMonth() + 1);
        }
        return months;
    }, []);

    const startingValueBrl = useMemo(() => {
        const row = actualsData.find((d: any) => d.date === startMonth);
        return (row as any)?.actualBRL || firstActualValueBrl;
    }, [startMonth, firstActualValueBrl]);

    const handleGoal2031Change = (newValue: number) => {
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
        const pastActuals = actualsData.filter((d: any) => d.date !== currentMonthStr);

        let cleanActuals: ForecastDataPoint[] = pastActuals.map((d: any) => ({
            date: d.date, actual: d.actualBRL, actualGbp: d.actualGBP || 0,
            forecast: null, forecastGbp: null, type: 'actual',
            contribution: d.contribution || 0, contributionGbp: d.contributionGBP || 0,
            interest: d.interest || 0, interestGbp: d.interestGBP || 0
        }));

        const lastPastActual = pastActuals[pastActuals.length - 1] as any;
        const lastPastBrl = lastPastActual ? lastPastActual.actualBRL : 0;
        const liveBrl = currentPortfolioValueBrl || 0;
        const liveGbp = currentPortfolioValueGbp || 0;

        cleanActuals.push({
            date: currentMonthStr, actual: liveBrl, actualGbp: liveGbp,
            forecast: liveBrl, forecastGbp: liveGbp, type: 'live',
            contribution: liveContributionBrl !== undefined ? liveContributionBrl : (liveBrl - lastPastBrl),
            contributionGbp: liveContributionGbp || 0, interest: 0, interestGbp: 0
        });

        let cv = liveBrl || (actualsData.length > 0 ? (actualsData[actualsData.length - 1] as any).actualBRL : 0);
        let cvGbp = liveGbp || (actualsData.length > 0 ? (actualsData[actualsData.length - 1] as any).actualGBP : 0);
        const impliedRate = (cv && cvGbp) ? cv / cvGbp : 7.0;
        const forecastPoints: ForecastDataPoint[] = [];
        let nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const endDate = new Date(2031, 11, 1);
        let accBrl = cv, accGbp = cvGbp;
        while (nextDate <= endDate) {
            const mmm = nextDate.toLocaleString('default', { month: 'short' });
            const yyyy = nextDate.getFullYear();
            const dateStr = `${mmm}/${yyyy}`;

            let activePhase = forecastPhases[0];
            for (let i = 1; i < forecastPhases.length; i++) {
                if (forecastPhases[i].startMonth) {
                    const phaseDate = parseDate(forecastPhases[i].startMonth!);
                    if (phaseDate <= nextDate) activePhase = forecastPhases[i];
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

        const goalDate = new Date(2031, 11, 1);
        const totalMonthsTarget = getMonthDiff(startDateObj, goalDate);
        const targetRate = annualInterestRate / 100 / 12;
        let targetPMT = calculatePMT(target2031, startingValueBrl, targetRate, totalMonthsTarget);
        if (isNaN(targetPMT) || !isFinite(targetPMT)) targetPMT = 0;
        targetPMT = Math.max(0, targetPMT);

        const finalData = combined.map(pt => {
            const ptDate = parseDate(pt.date);
            const gbpValue = pt.actualGbp != null ? pt.actualGbp : (pt.forecastGbp != null ? pt.forecastGbp : null);

            if (ptDate < startDateObj) {
                return { ...pt, targetBrl: null, gbpValue };
            }
            const monthsFromStart = getMonthDiff(startDateObj, ptDate);
            const compoundTarget = calculateFV(startingValueBrl, targetRate, monthsFromStart, targetPMT);
            return { ...pt, targetBrl: Math.round(compoundTarget || 0), gbpValue };
        });

        setForecastData(finalData);
    }, [monthlyContribution, annualInterestRate, currentPortfolioValueBrl, currentPortfolioValueGbp, lastActualDate, firstActualValueBrl, firstDateObj, lastDateObj, startMonth, startDateObj, startingValueBrl, target2031, liveContributionBrl, liveContributionGbp, forecastPhases]);

    // ═══════════ DERIVED VALUES ═══════════
    const finalValueBrl = forecastData.length > 0 ? (forecastData[forecastData.length - 1].forecast || forecastData[forecastData.length - 1].actual || 0) : 0;
    const finalValueGbp = forecastData.length > 0 ? (forecastData[forecastData.length - 1].forecastGbp || forecastData[forecastData.length - 1].actualGbp || 0) : 0;
    const totalContributedBrl = useMemo(() => {
        return forecastData
            .filter(d => parseDate(d.date) >= startDateObj)
            .reduce((sum, d) => sum + (d.contribution || 0), 0);
    }, [forecastData, startDateObj]);
    const projectedGrowthBrl = finalValueBrl - startingValueBrl - totalContributedBrl;

    const currentTargetValue = useMemo(() => {
        const liveRow = forecastData.find(d => d.type === 'live');
        return liveRow?.targetBrl || 0;
    }, [forecastData]);

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

    const forecastEtaMonths = useMemo(() => {
        if (!forecastData.length || target2031 <= 0) return null;
        const now = new Date();
        const goalDate = new Date(2031, 11, 1);
        const monthsToDeadline = (goalDate.getFullYear() - now.getFullYear()) * 12 + (goalDate.getMonth() - now.getMonth());
        const forecastPoints = forecastData.filter(d => d.type === 'forecast');
        for (let i = 0; i < forecastPoints.length; i++) {
            const val = forecastPoints[i].forecast || 0;
            if (val >= target2031) {
                const ptDate = parseDate(forecastPoints[i].date);
                const monthsFromNow = (ptDate.getFullYear() - now.getFullYear()) * 12 + (ptDate.getMonth() - now.getMonth());
                return Math.round(monthsToDeadline - monthsFromNow);
            }
        }
        if (forecastPoints.length > 0) {
            const lastVal = forecastPoints[forecastPoints.length - 1].forecast || 0;
            if (lastVal > 0 && lastVal < target2031) {
                const lastPhase = forecastPhases[forecastPhases.length - 1];
                const r = (lastPhase?.yield || annualInterestRate) / 100 / 12;
                const pmt = lastPhase?.contribution || monthlyContribution;
                if (r > 0) {
                    const pmtOverR = pmt / r;
                    const x = (target2031 + pmtOverR) / (lastVal + pmtOverR);
                    if (x > 0) {
                        const extraMonths = Math.log(x) / Math.log(1 + r);
                        return Math.round(-extraMonths);
                    }
                }
            }
        }
        return null;
    }, [forecastData, target2031, forecastPhases, annualInterestRate, monthlyContribution]);

    const secondaryCurrency = primaryCurrency === 'BRL' ? 'GBP' : 'BRL';
    const secondaryPrefix = secondaryCurrency === 'GBP' ? '£' : 'R$';

    const formatK = (val: number, currency = 'BRL') => {
        const prefix = currency === 'BRL' ? 'R$' : '£';
        if (Math.abs(val) >= 1000000) return `${prefix} ${(val / 1000000).toFixed(1)}M`;
        if (Math.abs(val) >= 1000) return `${prefix} ${(val / 1000).toFixed(0)}k`;
        return `${prefix} ${val}`;
    };

    const reversedData = useMemo(() => [...forecastData].reverse(), [forecastData]);

    // ═══════════ PHASE MANAGEMENT ═══════════
    const handleAddPhase = () => {
        const newId = (forecastPhases[forecastPhases.length - 1]?.id || 0) + 1;
        setForecastPhases([...forecastPhases, {
            id: newId, startMonth: null, contribution: monthlyContribution, yield: annualInterestRate
        }]);
    };

    const handleUpdatePhase = (id: number, field: string, value: any) => {
        setForecastPhases(forecastPhases.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleRemovePhase = (id: number) => {
        if (forecastPhases.length <= 1) return;
        setForecastPhases(forecastPhases.filter(p => p.id !== id));
    };

    return {
        // State
        monthlyContribution, setMonthlyContribution,
        annualInterestRate, setAnnualInterestRate,
        target2031, setTarget2031,
        lastInteraction, setLastInteraction,
        forecastPhases,
        forecastData,
        startMonth, setStartMonth,
        isLocked,
        lockedPlan,
        lockedAt,
        ledgerOpen, setLedgerOpen,
        statusModal, setStatusModal,

        // Derived
        startingValueBrl,
        finalValueBrl,
        finalValueGbp,
        totalContributedBrl,
        projectedGrowthBrl,
        currentTargetValue,
        etaMonths,
        forecastEtaMonths,
        requiredContributionHint,
        secondaryCurrency,
        secondaryPrefix,
        reversedData,

        // Handlers
        handleSave,
        handleGoal2031Change,
        handleAddPhase,
        handleUpdatePhase,
        handleRemovePhase,
        formatK,

        // Budget integration
        budgetSurplusBrl,
    };
}
