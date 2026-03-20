import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Save, Calendar, Plus } from 'lucide-react';
import type { ForecastPhase } from './types';

// ─── Inline editable value ───
function EditableValue({ value, onChange, min = 0, max = 100000000, step = 1, formatDisplay, suffix = '' }: any) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

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
                className="bg-transparent border-b border-[#D4AF37]/50 text-[#D4AF37] font-mono tabular-nums text-sm font-bold outline-none w-24 text-right"
                autoFocus
            />
        );
    }

    return (
        <span
            onClick={handleStartEdit}
            className="font-mono tabular-nums text-sm text-[#D4AF37] font-bold cursor-pointer hover:text-[#D4AF37]/80 transition-colors border-b border-transparent hover:border-[#D4AF37]/30"
            title="Click to type a value"
        >
            {formatDisplay ? formatDisplay(value) : value}{suffix}
        </span>
    );
}

// ─── Calendar-style month picker ───
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function MonthCombobox({ value, onChange, placeholder = "Select month..." }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
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
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectMonth = (monthIdx: number) => {
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
                <span className={`font-mono tabular-nums text-sm ${value ? 'text-[#D4AF37]' : 'text-white/40'}`}>
                    {value || placeholder}
                </span>
            </div>

            {isOpen && (
                <div className="absolute z-[100] bottom-full left-0 mb-1.5 w-[220px] bg-[#121418]/90 backdrop-blur-xl border border-white/[0.06] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-3">
                    <div className="flex items-center justify-between mb-3">
                        <button onClick={() => setViewYear(y => y - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#D4AF37] text-xl font-bold hover:bg-[#D4AF37]/20 transition-colors select-none">
                            ‹
                        </button>
                        <span className="font-bebas text-lg tracking-widest text-[#D4AF37]">{viewYear}</span>
                        <button onClick={() => setViewYear(y => y + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#D4AF37] text-xl font-bold hover:bg-[#D4AF37]/20 transition-colors select-none">
                            ›
                        </button>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                        {MONTH_LABELS.map((m, i) => {
                            const isSelected = parsedMonth === i && parsedYear === viewYear;
                            const now = new Date();
                            const isCurrent = now.getMonth() === i && now.getFullYear() === viewYear;
                            return (
                                <button
                                    key={m}
                                    onClick={() => handleSelectMonth(i)}
                                    className={`py-1.5 rounded-lg font-mono tabular-nums text-[0.75rem] transition-all duration-200
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

export { EditableValue, MonthCombobox };

interface ScenarioEditorProps {
    isLocked: boolean;
    lockedPlan: any;
    lockedAt: string | null;
    monthlyContribution: number;
    annualInterestRate: number;
    target2031: number;
    startMonth: string;
    startingValueBrl: number;
    requiredContributionHint: number;
    forecastPhases: ForecastPhase[];
    formatK: (val: number, currency?: string) => string;
    setMonthlyContribution: (val: number) => void;
    setAnnualInterestRate: (val: number) => void;
    setStartMonth: (val: string) => void;
    setLastInteraction: (val: string) => void;
    handleGoal2031Change: (val: number) => void;
    handleSave: (lockAction: string | null) => void;
    handleAddPhase: () => void;
    handleUpdatePhase: (id: number, field: string, value: any) => void;
    handleRemovePhase: (id: number) => void;
    budgetSurplusBrl?: number;
}

export default function ScenarioEditor(props: ScenarioEditorProps) {
    const {
        isLocked, lockedPlan, lockedAt,
        monthlyContribution, annualInterestRate, target2031, startMonth, startingValueBrl, requiredContributionHint,
        forecastPhases, formatK,
        setMonthlyContribution, setAnnualInterestRate, setStartMonth, setLastInteraction,
        handleGoal2031Change, handleSave, handleAddPhase, handleUpdatePhase, handleRemovePhase,
        budgetSurplusBrl
    } = props;

    return (
        <>
        {/* Scenario Builder */}
        <div id="ftue-forecast-scenario" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 lg:p-8">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <h3 className="font-bebas text-xl tracking-widest text-parchment m-0">
                        {isLocked ? 'Locked Plan' : 'Scenario Builder'}
                    </h3>
                    {isLocked && lockedAt && (
                        <span className="font-mono tabular-nums text-[0.75rem] text-white/30">
                            Locked {new Date(lockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    )}
                </div>
            </div>

            {isLocked ? (
                <div className="flex flex-wrap gap-6 items-center">
                    <div className="flex items-center gap-2">
                        <Lock size={12} className="text-white/30" />
                        <span className="font-mono tabular-nums text-xs text-white/50">Monthly:</span>
                        <span className="font-mono tabular-nums text-sm text-[#D4AF37]">{formatK(lockedPlan?.monthlyContribution || monthlyContribution, 'BRL')}/mo</span>
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                        <span className="font-mono tabular-nums text-xs text-white/50">Yield:</span>
                        <span className="font-mono tabular-nums text-sm text-[#D4AF37]">{lockedPlan?.annualInterestRate || annualInterestRate}%</span>
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                        <span className="font-mono tabular-nums text-xs text-white/50">Goal:</span>
                        <span className="font-mono tabular-nums text-sm text-[#D4AF37]">{formatK(lockedPlan?.goal2031 || target2031, 'BRL')}</span>
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-white/30" />
                        <span className="font-mono tabular-nums text-xs text-white/50">From:</span>
                        <span className="font-mono tabular-nums text-sm text-[#D4AF37]">{lockedPlan?.startMonth || startMonth}</span>
                    </div>
                    <div className="ml-auto">
                        <button onClick={() => handleSave('unlock')}
                            className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs font-mono tabular-nums text-white/60 hover:text-white hover:border-[#D4AF37]/30 transition-all">
                            <Unlock size={12} /> Edit Plan
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {/* Start Month */}
                        <div className="bg-[#121418]/50 backdrop-blur-lg border border-white/[0.06] rounded-xl p-4 hover:border-[#D4AF37]/20 transition-colors">
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-mono tabular-nums text-[0.75rem] text-white/40 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={10} /> Start Month</span>
                            </div>
                            <MonthCombobox value={startMonth} onChange={(v: string) => { setLastInteraction('inputs'); setStartMonth(v); }} />
                            <div className="mt-2 font-mono tabular-nums text-[0.75rem] text-white/30">Starting: {formatK(startingValueBrl, 'BRL')}</div>
                        </div>

                        {/* Monthly Contribution */}
                        <div className="bg-[#121418]/50 backdrop-blur-lg border border-white/[0.06] rounded-xl p-4 hover:border-[#D4AF37]/20 transition-colors">
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-mono tabular-nums text-[0.75rem] text-white/40 uppercase tracking-widest">Monthly Gain</span>
                                <EditableValue value={monthlyContribution} onChange={(v: number) => { setLastInteraction('inputs'); setMonthlyContribution(Math.round(v / 100) * 100); }} min={0} max={100000} step={100} formatDisplay={(v: number) => formatK(v, 'BRL')} suffix="/mo" />
                            </div>
                            <input type="range" min={0} max={50000} step={1000} value={monthlyContribution} onChange={(e) => { setLastInteraction('inputs'); setMonthlyContribution(parseInt(e.target.value)); }} className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#D4AF37]" />
                            <div className="mt-2 font-mono tabular-nums text-[0.75rem] text-white/30">Required: {formatK(requiredContributionHint, 'BRL')}/mo</div>
                            {budgetSurplusBrl != null && budgetSurplusBrl > 0 && (
                                <div className="mt-1.5 font-mono tabular-nums text-[0.625rem] text-[#D4AF37]/50 flex items-center gap-1">
                                    <span className="inline-block w-1 h-1 rounded-full bg-[#D4AF37]/40" />
                                    Based on your {formatK(budgetSurplusBrl, 'BRL')} budget surplus this month
                                </div>
                            )}
                        </div>

                        {/* Expected Yield */}
                        <div className="bg-[#121418]/50 backdrop-blur-lg border border-white/[0.06] rounded-xl p-4 hover:border-[#D4AF37]/20 transition-colors">
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-mono tabular-nums text-[0.75rem] text-white/40 uppercase tracking-widest">Expected Yield</span>
                                <EditableValue value={annualInterestRate} onChange={(v: number) => { setLastInteraction('inputs'); setAnnualInterestRate(Math.round(v * 10) / 10); }} min={0} max={30} step={0.5} formatDisplay={(v: number) => `${v}%`} suffix=" p.a." />
                            </div>
                            <input type="range" min={0} max={25} step={0.5} value={annualInterestRate} onChange={(e) => { setLastInteraction('inputs'); setAnnualInterestRate(parseFloat(e.target.value)); }} className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#D4AF37]" />
                            <div className="mt-2 font-mono tabular-nums text-[0.75rem] text-white/30">Monthly: {(annualInterestRate / 12).toFixed(2)}%</div>
                        </div>

                        {/* 2031 Goal */}
                        <div className="bg-[#121418]/50 backdrop-blur-lg border border-white/[0.06] rounded-xl p-4 hover:border-[#D4AF37]/20 transition-colors">
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-mono tabular-nums text-[0.75rem] text-white/40 uppercase tracking-widest">2031 Goal</span>
                                <EditableValue value={target2031} onChange={(v: number) => handleGoal2031Change(Math.round(v / 10000) * 10000)} min={100000} max={100000000} step={100000} formatDisplay={(v: number) => formatK(v, 'BRL')} />
                            </div>
                            <input type="range" min={100000} max={50000000} step={100000} value={target2031} onChange={(e) => handleGoal2031Change(parseInt(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#D4AF37]" />
                            <div className="mt-2 font-mono tabular-nums text-[0.75rem] text-white/30">Drag or click to set target</div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                        <button onClick={() => handleSave(null)} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs font-mono tabular-nums text-white/60 hover:text-white hover:border-white/20 transition-all">
                            <Save size={12} /> Save Draft
                        </button>
                        <button onClick={() => handleSave('lock')} className="flex items-center gap-1.5 bg-gradient-to-r from-[#D4AF37]/20 to-[#CC5500]/20 border border-[#D4AF37]/30 rounded-lg px-5 py-2 text-xs font-mono tabular-nums text-[#D4AF37] font-bold hover:border-[#D4AF37]/50 transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.15)]">
                            <Lock size={12} /> Lock In Plan
                        </button>
                    </div>
                </>
            )}
        </div>

        {/* Granular Forecast Tool */}
        <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-4 lg:p-6 overflow-visible relative z-10">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] m-0">Forecasting Assumptions</h3>
                <button onClick={handleAddPhase}
                    className="flex items-center gap-1.5 text-[0.75rem] font-mono tabular-nums uppercase bg-white/5 border border-white/10 rounded-md px-3 py-1.5 hover:bg-white/10 hover:border-[#D4AF37]/30 transition-colors text-white/70">
                    <Plus size={12} /> Add Phase
                </button>
            </div>

            <div className="space-y-3 relative">
                {forecastPhases.length > 1 && (
                    <div className="absolute left-[15px] top-6 bottom-6 w-px bg-white/10" />
                )}

                {forecastPhases.map((phase, index) => (
                    <div key={phase.id} className="relative flex items-stretch gap-4 group">
                        <div className="flex flex-col items-center mt-3 relative z-10 w-[30px] shrink-0">
                            <div className={`w-3 h-3 rounded-full border-2 border-[#0D0814] ${index === 0 ? 'bg-[#34D399] shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.4)]'}`} />
                        </div>

                        <div className="flex-1 bg-[#121418]/50 backdrop-blur-lg border border-white/[0.06] rounded-xl p-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between hover:border-[#D4AF37]/20 transition-all">
                            <div className="flex flex-col gap-1 w-[160px] shrink-0">
                                <span className="font-mono tabular-nums text-[0.6875rem] text-white/40 uppercase tracking-widest">
                                    Phase {index + 1} &bull; Start Month
                                </span>
                                {index === 0 ? (
                                    <span className="font-mono tabular-nums text-sm text-white/80">Current (Now)</span>
                                ) : (
                                    <MonthCombobox value={phase.startMonth} onChange={(v: string) => handleUpdatePhase(phase.id, 'startMonth', v)} placeholder="Select month..." />
                                )}
                            </div>

                            <div className="flex-1 grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <span className="font-mono tabular-nums text-[0.6875rem] text-white/40 uppercase tracking-widest">Contribution</span>
                                    <EditableValue value={phase.contribution} onChange={(v: number) => handleUpdatePhase(phase.id, 'contribution', v)} min={0} max={1000000} step={100} formatDisplay={(v: number) => formatK(v, 'BRL')} suffix="/mo" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="font-mono tabular-nums text-[0.6875rem] text-white/40 uppercase tracking-widest">Yield</span>
                                    <EditableValue value={phase.yield} onChange={(v: number) => handleUpdatePhase(phase.id, 'yield', v)} min={0} max={30} step={0.5} formatDisplay={(v: number) => `${v}%`} suffix=" p.a." />
                                </div>
                            </div>

                            {index > 0 ? (
                                <button onClick={() => handleRemovePhase(phase.id)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0" title="Remove Phase">
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
        </>
    );
}
