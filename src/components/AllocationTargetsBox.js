import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, LineChart, Landmark, Bitcoin, PiggyBank } from 'lucide-react';
import StatusModal from './StatusModal';
import { usePortfolio } from '../context/PortfolioContext';

export default function AllocationTargetsBox({ masterMixData, allocationTargets, onTargetsSaved }) {
    const { formatPrimary } = usePortfolio();
    // 1. Safe defaults
    const actuals = masterMixData?.percentages || {
        Equity: 0, FixedIncome: 0, RealEstate: 0, Crypto: 0, Cash: 0
    };

    const targets = allocationTargets || {
        Equity: 50,
        FixedIncome: 30,
        RealEstate: 15,
        Crypto: 5,
        Cash: 0
    };

    const totalNW = masterMixData?.total || 0;

    // State for Inline Editing
    const [editTargets, setEditTargets] = useState({ ...targets });
    const [isSaving, setIsSaving] = useState(false);

    // Status Modal State
    const [statusModal, setStatusModal] = useState({ isOpen: false, title: '', message: '', type: 'success' });

    // Sync if props change
    useEffect(() => {
        setEditTargets({ ...targets });
    }, [targets]);

    const handleTargetChange = (key, val) => {
        let num = parseFloat(val);
        if (isNaN(num)) num = 0;
        setEditTargets(prev => ({
            ...prev,
            [key]: num
        }));
    };

    // Fader Configs
    const faders = [
        { id: 'Equity', label: 'Equity', icon: LineChart, actual: actuals.Equity, target: editTargets.Equity || 0 },
        { id: 'FixedIncome', label: 'Fixed Income', icon: Landmark, actual: actuals.FixedIncome, target: editTargets.FixedIncome || 0 },
        { id: 'RealEstate', label: 'Real Estate', icon: Home, actual: actuals.RealEstate, target: editTargets.RealEstate || 0 },
        { id: 'Crypto', label: 'Crypto', icon: Bitcoin, actual: actuals.Crypto, target: editTargets.Crypto || 0 },
        { id: 'Cash', label: 'Cash', icon: PiggyBank, actual: actuals.Cash, target: editTargets.Cash || 0 }
    ];

    // Helper to calculate Deviation
    const calculateDeviation = () => {
        let dev = 0;
        faders.forEach(f => {
            dev += Math.abs(f.actual - f.target);
        });
        return dev; // Total % points off
    };

    const deviation = calculateDeviation();
    const totalEdit = Object.values(editTargets).reduce((a, b) => a + b, 0);
    const isValid = Math.abs(totalEdit - 100) < 0.01; // Allow floating point tolerance

    const handleSaveTargets = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/allocation-targets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editTargets)
            });
            if (res.ok) {
                if (onTargetsSaved) onTargetsSaved(editTargets);
                setStatusModal({
                    isOpen: true,
                    title: 'Targets Updated',
                    message: 'Your new portfolio allocation targets have been successfully saved.',
                    type: 'success'
                });
            } else {
                setStatusModal({
                    isOpen: true,
                    title: 'Save Failed',
                    message: 'Could not save the targets. Please check your connection.',
                    type: 'error'
                });
            }
        } catch (e) {
            console.error("Failed to save targets", e);
            setStatusModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred while saving. Please try again.',
                type: 'error'
            });
        }
        setIsSaving(false);
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="relative rounded-2xl p-6 lg:p-8 shadow-[0_20px_40px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.1)] overflow-hidden mb-8"
            style={{
                background: '#130a21',
                border: '1px solid rgba(212, 175, 55, 0.2)',
            }}>

            <StatusModal
                isOpen={statusModal.isOpen}
                onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
                title={statusModal.title}
                message={statusModal.message}
                type={statusModal.type}
            />

            {/* Header / Top Row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-white/10 relative z-10">
                <div className="flex items-center gap-4 mb-4 sm:mb-0">
                    <h2 className="text-[#D4AF37] text-2xl m-0 font-bebas tracking-widest drop-shadow-[0_0_8px_rgba(212,175,55,0.3)] uppercase">
                        Portfolio Targets
                    </h2>
                </div>
            </div>



            {/* Data Grid */}
            <div className="flex flex-col gap-3 relative z-10">
                {/* Desktop Header Row */}
                <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1.5fr_2fr_1.5fr] gap-4 px-4 pb-2 border-b border-white/5 text-[10px] font-mono uppercase tracking-[0.2em] text-parchment/40">
                    <div className="text-left">Asset Class</div>
                    <div className="text-right">Actual</div>
                    <div className="text-right pr-6">Target</div>
                    <div className="text-center">Alignment</div>
                    <div className="text-right">Value</div>
                </div>

                {/* Rows */}
                {faders.map((fader) => {
                    // Alignment Bar Calculation
                    const diff = fader.actual - fader.target;

                    // Cap the visual bar at a max deviation (+/- 20%)
                    const MAX_DEV = 20;
                    const devMagnitude = Math.min(Math.abs(diff), MAX_DEV);
                    const barWidthPercent = (devMagnitude / MAX_DEV) * 50; // 50% max width in either direction from center

                    // Binary Coloring: Positive (Overweight) is Green, Negative (Underweight) is Red
                    const barColor = diff > 0 ? 'bg-[#10b981]' : (diff < 0 ? 'bg-[#ef4444]' : 'bg-transparent');

                    return (
                        <div key={fader.id} className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_1.5fr_2fr_1.5fr] gap-2 sm:gap-4 items-center bg-black/30 hover:bg-black/50 border border-white/5 rounded-lg p-3 sm:px-4 transition-colors">
                            {/* Icon + Label */}
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-md text-[#D4AF37] shadow-sm bg-[#D4AF37]/10">
                                    <fader.icon size={16} strokeWidth={2} />
                                </div>
                                <span className="font-bebas text-lg tracking-wider text-parchment/90">{fader.label}</span>
                            </div>

                            {/* Actual % */}
                            <div className="flex justify-between sm:justify-end items-center sm:text-right">
                                <span className="sm:hidden text-[10px] font-mono text-parchment/40 uppercase">Actual</span>
                                <div className="font-mono text-sm font-bold text-parchment drop-shadow-md">
                                    {fader.actual.toFixed(1)}%
                                </div>
                            </div>

                            {/* Target % - Inline Input */}
                            <div className="flex justify-between sm:justify-end items-center sm:text-right">
                                <span className="sm:hidden text-[10px] font-mono text-parchment/40 uppercase">Target</span>
                                <div className="relative flex items-center justify-end">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={editTargets[fader.id] === 0 ? '' : editTargets[fader.id]}
                                        onChange={(e) => handleTargetChange(fader.id, e.target.value)}
                                        placeholder="0"
                                        className="w-16 bg-black/40 border border-white/10 rounded px-2 py-1 text-right font-mono text-sm text-[#D4AF37] focus:border-[#D4AF37] outline-none transition-colors"
                                    />
                                    <span className="ml-1 text-parchment/50 font-mono text-sm">%</span>
                                </div>
                            </div>

                            {/* Center-Aligned Deviation Bar */}
                            <div className="w-full mt-2 sm:mt-0 px-2 flex flex-col items-center">
                                <span className="sm:hidden text-[10px] font-mono text-parchment/40 uppercase mb-1 self-start">Alignment</span>
                                <div className="h-[20px] w-full bg-black/40 rounded border border-white/5 relative flex items-center justify-center overflow-hidden">
                                    {/* Middle Zero Line */}
                                    <div className="absolute top-0 bottom-0 w-px bg-white/40 z-10" />

                                    {/* Deviation Bar */}
                                    {Math.abs(diff) > 0.1 && (
                                        <div
                                            className={`absolute h-full ${barColor} shadow-[0_0_8px_currentColor] transition-all duration-500`}
                                            style={{
                                                width: `${barWidthPercent}%`,
                                                left: diff < 0 ? `${50 - barWidthPercent}%` : '50%',
                                                opacity: 0.9,
                                                borderRadius: diff < 0 ? '4px 0 0 4px' : '0 4px 4px 0'
                                            }}
                                        />
                                    )}

                                    {/* Tooltip on Hover showing exactly how far off */}
                                    <div className="absolute inset-0 opacity-0 hover:opacity-100 flex items-center justify-center bg-black/80 backdrop-blur-[2px] transition-opacity z-20 cursor-help">
                                        <span className={`font-mono text-xs font-bold ${barColor.replace('bg-', 'text-')}`}>
                                            {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Value £ */}
                            <div className="flex justify-between sm:justify-end items-center sm:text-right mt-2 sm:mt-0">
                                <span className="sm:hidden text-[10px] font-mono text-parchment/40 uppercase">Value</span>
                                <div className="font-mono text-sm text-parchment/60">
                                    {formatPrimary((fader.actual / 100) * totalNW)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Editing Footer - Totals & Save */}
            <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-end gap-6">

                {/* Statistics Group - Aligned roughly under targets column in desktop */}
                <div className="flex flex-col gap-2 min-w-[200px]">
                    {/* Total Mix (The targets themselves) */}
                    <div className={`font-mono text-[11px] tracking-wide px-3 py-1.5 rounded-md border flex items-center justify-between gap-4 ${isValid ? 'text-vu-green bg-vu-green/5 border-vu-green/20' : 'text-red-400 bg-red-400/5 border-red-400/20'}`}>
                        <span className="uppercase tracking-widest opacity-60">Total Mix:</span>
                        <span className="font-bold">{totalEdit.toFixed(1)}%</span>
                    </div>

                    {/* Total Drift (Actual vs Target) */}
                    <div className={`font-mono text-[11px] tracking-wide px-3 py-1.5 rounded-md border border-white/10 bg-black/40 flex items-center justify-between gap-4`}>
                        <span className="uppercase tracking-widest text-parchment/40">Total Drift:</span>
                        <span className={`font-bold ${deviation > 0.1 ? 'text-red-400' : 'text-vu-green'}`}>
                            {deviation.toFixed(1)}%
                        </span>
                    </div>
                </div>

                <button
                    onClick={handleSaveTargets}
                    disabled={!isValid || isSaving}
                    className="relative group bg-gradient-to-b from-[#333] to-[#111] border border-white/10 rounded-lg px-10 py-3 overflow-hidden shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    <div className="absolute inset-0 bg-[#D4AF37]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="relative font-bebas tracking-[0.2em] text-[#D4AF37] text-xl">
                        {isSaving ? 'CONSOLIDATING...' : 'SAVE TARGETS'}
                    </span>
                </button>
            </div>
        </div>
    );
}
