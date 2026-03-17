import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, LineChart, Landmark, Bitcoin, PiggyBank, Globe, DollarSign, Target, Activity, Save } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import StatusModal from './StatusModal';
import { usePortfolio } from '../context/PortfolioContext';
import PageTutorialOverlay from './ftue/PageTutorialOverlay';

const ALLOCATION_TUTORIAL_STEPS = [
    { type: 'spotlight', targetId: 'ftue-alloc-targets', title: 'Define Your Target Allocation', message: "Specify your desired target allocations for asset classes and your currency exposure. Your targets must sum to a precise 100%.", position: 'right' },
    { type: 'spotlight', targetId: 'ftue-alloc-drift', title: 'Target Execution Monitoring', message: "Immediately see how your current portfolio compares to your strategic targets. Green is aligned, amber/red indicates significant drift and requires attention.", position: 'left' },
    { type: 'spotlight', targetId: 'ftue-alloc-targets', title: 'Currency Exposure Tracker', message: "Monitor your currency exposure across GBP, BRL, and USD. Targets enable you to remain conscious of geographic and currency concentration.", position: 'right' },
];

const ASSET_COLORS = {
    Equity: '#3b82f6',
    FixedIncome: '#10b981',
    RealEstate: '#ef4444',
    Crypto: '#f59e0b',
    Cash: '#94a3b8'
};

const CURRENCY_COLORS = {
    GBP: '#8b5cf6',
    BRL: '#22c55e',
    USD: '#3b82f6'
};

export default function AllocationTargetsBox({ masterMixData, allocationTargets, onTargetsSaved }) {
    const { formatPrimary, rates, dashboardData } = usePortfolio();

    // Default structure matching new KV schema
    const defaultTargets = {
        assetClasses: { Equity: 50, FixedIncome: 30, RealEstate: 15, Crypto: 5, Cash: 0 },
        currencies: { GBP: 50, BRL: 40, USD: 10 }
    };

    const targets = allocationTargets || defaultTargets;
    const safeAssetTargets = targets.assetClasses || { ...defaultTargets.assetClasses, ...targets };
    const safeCurrencyTargets = targets.currencies || defaultTargets.currencies;

    const actualsAssets = masterMixData?.percentages || { Equity: 0, FixedIncome: 0, RealEstate: 0, Crypto: 0, Cash: 0 };
    const totalNW_GBP = masterMixData?.total || 0;

    // --- Currency Exposure: use the SAME source as Dashboard's "Currency Exposure (Net)" chart ---
    const actualsCurrencies = React.useMemo(() => {
        const currencyTotals = { GBP: 0, BRL: 0, USD: 0 };
        if (dashboardData && dashboardData.categories) {
            dashboardData.categories.forEach(cat => {
                if (cat.assets) {
                    cat.assets.forEach(asset => {
                        if (!asset.isTotal && !asset.isRealisedPnL && asset.name !== 'Total') {
                            const cur = asset.nativeCurrency || asset.currency || 'GBP';
                            let val = asset.gbp || 0;
                            if (cat.id === 'debt') val = -val;

                            if (cur === 'GBP') currencyTotals.GBP += val;
                            else if (cur === 'BRL') currencyTotals.BRL += val;
                            else if (cur === 'USD') currencyTotals.USD += val;
                            else currencyTotals.GBP += val; // default fallback
                        }
                    });
                }
            });
        }
        const total = currencyTotals.GBP + currencyTotals.BRL + currencyTotals.USD;
        return {
            GBP: total > 0 ? (currencyTotals.GBP / total) * 100 : 0,
            BRL: total > 0 ? (currencyTotals.BRL / total) * 100 : 0,
            USD: total > 0 ? (currencyTotals.USD / total) * 100 : 0,
        };
    }, [dashboardData]);

    const [editAssetTargets, setEditAssetTargets] = useState({ ...safeAssetTargets });
    const [editCurrencyTargets, setEditCurrencyTargets] = useState({ ...safeCurrencyTargets });
    const [isSaving, setIsSaving] = useState(false);
    const [statusModal, setStatusModal] = useState({ isOpen: false, title: '', message: '', type: 'success' });

    useEffect(() => {
        setEditAssetTargets(targets.assetClasses || targets);
        if (targets.currencies) setEditCurrencyTargets(targets.currencies);
    }, [targets]);

    const handleAssetTargetChange = (key, val) => {
        let num = parseFloat(val);
        if (isNaN(num)) num = 0;
        setEditAssetTargets(prev => ({ ...prev, [key]: num }));
    };

    const handleCurrencyTargetChange = (key, val) => {
        let num = parseFloat(val);
        if (isNaN(num)) num = 0;
        setEditCurrencyTargets(prev => ({ ...prev, [key]: num }));
    };

    const assetFaders = [
        { id: 'Equity', label: 'Equity', icon: LineChart, actual: actualsAssets.Equity, target: editAssetTargets.Equity || 0 },
        { id: 'FixedIncome', label: 'Fixed Income', icon: Landmark, actual: actualsAssets.FixedIncome, target: editAssetTargets.FixedIncome || 0 },
        { id: 'RealEstate', label: 'Real Estate', icon: Home, actual: actualsAssets.RealEstate, target: editAssetTargets.RealEstate || 0 },
        { id: 'Crypto', label: 'Crypto', icon: Bitcoin, actual: actualsAssets.Crypto, target: editAssetTargets.Crypto || 0 },
        { id: 'Cash', label: 'Cash', icon: PiggyBank, actual: actualsAssets.Cash, target: editAssetTargets.Cash || 0 }
    ];

    const FlagGBP = () => <span className="text-base leading-none">🇬🇧</span>;
    const FlagBRL = () => <span className="text-base leading-none">🇧🇷</span>;
    const FlagUSD = () => <span className="text-base leading-none">🇺🇸</span>;

    const currencyFaders = [
        { id: 'GBP', label: 'British Pound', icon: FlagGBP, actual: actualsCurrencies.GBP, target: editCurrencyTargets.GBP || 0 },
        { id: 'BRL', label: 'Brazilian Real', icon: FlagBRL, actual: actualsCurrencies.BRL, target: editCurrencyTargets.BRL || 0 },
        { id: 'USD', label: 'US Dollar', icon: FlagUSD, actual: actualsCurrencies.USD, target: editCurrencyTargets.USD || 0 }
    ];

    const calculateDeviation = (faderList) => faderList.reduce((acc, f) => acc + Math.abs(f.actual - f.target), 0);

    const assetDeviation = calculateDeviation(assetFaders);
    const totalAssetEdit = Object.values(editAssetTargets).reduce((a, b) => a + b, 0);
    const isValidAssets = Math.abs(totalAssetEdit - 100) < 0.01;

    const currencyDeviation = calculateDeviation(currencyFaders);
    const totalCurrencyEdit = Object.values(editCurrencyTargets).reduce((a, b) => a + b, 0);
    const isValidCurrencies = Math.abs(totalCurrencyEdit - 100) < 0.01;

    const isFullyValid = isValidAssets && isValidCurrencies;

    const hasChanges = JSON.stringify(editAssetTargets) !== JSON.stringify(safeAssetTargets) ||
        JSON.stringify(editCurrencyTargets) !== JSON.stringify(safeCurrencyTargets);

    const handleSaveTargets = async () => {
        setIsSaving(true);
        try {
            const payload = { assetClasses: editAssetTargets, currencies: editCurrencyTargets };
            const res = await fetch('/api/allocation-targets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                if (onTargetsSaved) onTargetsSaved(payload);
                setStatusModal({ isOpen: true, title: 'Targets Updated', message: 'Your new portfolio allocation targets have been saved.', type: 'success' });
            } else throw new Error("Save failed");
        } catch (e) {
            setStatusModal({ isOpen: true, title: 'Error', message: 'An error occurred while saving.', type: 'error' });
        }
        setIsSaving(false);
    };

    // Prepare data for Recharts
    const assetPieData = assetFaders.filter(f => f.target > 0).map(f => ({ name: f.label, value: f.target, fill: ASSET_COLORS[f.id] }));
    const currencyPieData = currencyFaders.filter(f => f.target > 0).map(f => ({ name: f.id, value: f.target, fill: CURRENCY_COLORS[f.id] }));

    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-black/90 border border-white/10 rounded px-3 py-2 text-xs font-mono shadow-xl backdrop-blur-md">
                    <span style={{ color: data.fill }}>{data.name}</span>: {data.value.toFixed(1)}%
                </div>
            );
        }
        return null;
    };

    const renderInputRow = (fader, onChange) => (
        <div key={fader.id} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0 group">
            <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md text-white/50 bg-white/5 group-hover:bg-white/10 group-hover:text-white/80 transition-colors">
                    <fader.icon size={14} strokeWidth={2} />
                </div>
                <span className="font-mono text-sm tracking-wide text-white/80">{fader.label}</span>
            </div>
            <div className="relative flex items-center justify-end">
                <input
                    type="number"
                    min="0"
                    max="100"
                    value={fader.target === 0 ? '' : fader.target}
                    onChange={(e) => onChange(fader.id, e.target.value)}
                    placeholder="0"
                    className="w-16 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-right font-mono text-sm text-[#D4AF37] focus:border-[#D4AF37] outline-none transition-colors"
                />
                <span className="ml-1.5 text-white/40 font-mono text-xs">%</span>
            </div>
        </div>
    );

    const renderDriftRow = (fader) => {
        const diff = fader.actual - fader.target;
        const absDiff = Math.abs(diff);
        const MAX_DEV = 20; // 20% cap for visual scaling
        const devMagnitude = Math.min(absDiff, MAX_DEV);
        const barWidthPercent = (devMagnitude / MAX_DEV) * 50;

        // Traffic light: ≤5% green, 5-10% amber, >10% red
        const barColor = absDiff <= 5 ? 'bg-emerald-500' : (absDiff <= 10 ? 'bg-amber-500' : 'bg-red-500');
        const textColor = absDiff < 0.1 ? 'text-white/40' : (absDiff <= 5 ? 'text-emerald-400' : (absDiff <= 10 ? 'text-amber-400' : 'text-red-400'));

        return (
            <div key={`drift-${fader.id}`} className="py-3 border-b border-white/5 last:border-0 group">
                <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-2">
                        <fader.icon size={12} className="text-white/40" />
                        <span className="font-mono text-xs text-white/70 uppercase tracking-widest">{fader.label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-white/30 uppercase tracking-widest">Target</span>
                            <span className="font-mono text-xs text-white/80">{fader.target.toFixed(1)}%</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-white/30 uppercase tracking-widest">Actual</span>
                            <span className="font-mono text-xs text-[#D4AF37] font-bold">{fader.actual.toFixed(1)}%</span>
                        </div>
                        <div className="w-16 text-right">
                            <span className={`font-mono text-xs font-bold ${textColor}`}>
                                {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
                {/* Visual Drift Bar */}
                <div className="h-[4px] w-full bg-black/40 rounded border border-white/5 relative flex items-center justify-center overflow-hidden">
                    <div className="absolute top-0 bottom-0 w-px bg-white/40 z-10" />
                    {Math.abs(diff) > 0.1 && (
                        <div
                            className={`absolute h-full ${barColor}`}
                            style={{
                                width: `${barWidthPercent}%`,
                                left: diff < 0 ? `${50 - barWidthPercent}%` : '50%',
                                opacity: 0.8,
                                borderRadius: diff < 0 ? '4px 0 0 4px' : '0 4px 4px 0'
                            }}
                        />
                    )}
                </div>
                <div className="mt-1.5 flex justify-end">
                    <span className="text-[10px] font-mono text-white/40">
                        {formatPrimary((fader.actual / 100) * totalNW_GBP)}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <>
        <div className="mb-8">
            <StatusModal isOpen={statusModal.isOpen} onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))} title={statusModal.title} message={statusModal.message} type={statusModal.type} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h2 className="text-[#D4AF37] text-2xl m-0 font-bebas tracking-widest drop-shadow-[0_0_8px_rgba(212,175,55,0.3)] uppercase">
                    Allocation Strategy
                </h2>

                {/* Desktop Save CTA */}
                <div className="hidden sm:block">
                    <button
                        onClick={handleSaveTargets}
                        disabled={!isFullyValid || isSaving || !hasChanges}
                        className="relative group bg-gradient-to-b from-[#333] to-[#111] border border-white/10 rounded-lg px-6 py-2 overflow-hidden shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                    >
                        <Save size={14} className="text-[#D4AF37] group-disabled:text-white/30 relative z-10" />
                        <span className="relative font-mono font-bold tracking-[0.1em] text-[#D4AF37] group-disabled:text-white/30 text-sm">
                            {isSaving ? 'SAVING...' : 'SAVE TARGETS'}
                        </span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

                {/* LEFT COLUMN: GOAL SETTING (TARGETS) */}
                <div id="ftue-alloc-targets" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 lg:p-8 flex flex-col gap-6 lg:gap-8 relative">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <h3 className="font-bebas text-xl text-white/90 tracking-widest flex items-center gap-2">
                            <Target size={18} className="text-[#D4AF37]" />
                            Target Goals
                        </h3>
                    </div>

                    {/* Donut Charts Row */}
                    <div className="grid grid-cols-2 gap-4 h-36">
                        <div className="relative h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={assetPieData} innerRadius="65%" outerRadius="90%" paddingAngle={2} dataKey="value" stroke="none">
                                        {assetPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                    </Pie>
                                    <RechartsTooltip content={<CustomPieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="font-bebas text-white/40 tracking-widest text-xs">ASSETS</span>
                            </div>
                        </div>
                        <div className="relative h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={currencyPieData} innerRadius="65%" outerRadius="90%" paddingAngle={2} dataKey="value" stroke="none">
                                        {currencyPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                    </Pie>
                                    <RechartsTooltip content={<CustomPieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="font-bebas text-white/40 tracking-widest text-xs">FX</span>
                            </div>
                        </div>
                    </div>

                    {/* Targets Inputs */}
                    <div className="flex flex-col gap-6">
                        {/* Asset Classes */}
                        <div>
                            <div className="flex justify-between items-center mb-2 px-1">
                                <span className="text-[10px] font-mono uppercase text-white/50 tracking-widest">Asset Classes</span>
                                <div className={`px-1.5 py-0.5 rounded text-[9px] font-mono tracking-wider ${isValidAssets ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                                    {totalAssetEdit.toFixed(1)}% / 100%
                                </div>
                            </div>
                            <div className="bg-[#121418]/50 backdrop-blur-lg border border-white/[0.06] rounded-xl px-4 py-2">
                                {assetFaders.map(f => renderInputRow(f, handleAssetTargetChange))}
                            </div>
                        </div>

                        {/* Currencies */}
                        <div>
                            <div className="flex justify-between items-center mb-2 px-1">
                                <span className="text-[10px] font-mono uppercase text-white/50 tracking-widest">Currency Exposure</span>
                                <div className={`px-1.5 py-0.5 rounded text-[9px] font-mono tracking-wider ${isValidCurrencies ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                                    {totalCurrencyEdit.toFixed(1)}% / 100%
                                </div>
                            </div>
                            <div className="bg-[#121418]/50 backdrop-blur-lg border border-white/[0.06] rounded-xl px-4 py-2">
                                {currencyFaders.map(f => renderInputRow(f, handleCurrencyTargetChange))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: DRIFT ANALYSIS (ACTUALS) */}
                <div id="ftue-alloc-drift" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 lg:p-8 flex flex-col gap-6 lg:gap-8">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <h3 className="font-bebas text-xl text-white/90 tracking-widest flex items-center gap-2">
                            <Activity size={18} className="text-[#D4AF37]" />
                            Execution Drift
                        </h3>
                        <div className="flex gap-3">
                            <span className="font-mono text-[10px] tracking-wide text-white/40">
                                ASSET DRIFT: <strong className={assetDeviation > 0.1 ? 'text-red-400' : 'text-emerald-400'}>{assetDeviation.toFixed(1)}%</strong>
                            </span>
                            <span className="font-mono text-[10px] tracking-wide text-white/40">
                                FX DRIFT: <strong className={currencyDeviation > 0.1 ? 'text-red-400' : 'text-emerald-400'}>{currencyDeviation.toFixed(1)}%</strong>
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        {/* Asset Class Drift */}
                        <div>
                            <span className="text-[10px] font-mono uppercase text-white/50 tracking-widest block mb-2 px-1">Asset Misalignment</span>
                            <div className="px-1">
                                {assetFaders.map(renderDriftRow)}
                            </div>
                        </div>

                        {/* Currency Drift */}
                        <div>
                            <span className="text-[10px] font-mono uppercase text-white/50 tracking-widest block mb-2 px-1">Currency Misalignment</span>
                            <div className="px-1">
                                {currencyFaders.map(renderDriftRow)}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Mobile Sticky Save CTA */}
            <div className="sm:hidden fixed bottom-[72px] inset-x-4 z-50 transition-transform duration-300">
                {hasChanges && (
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-[#121418]/90 backdrop-blur-xl border border-white/[0.06] p-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                    >
                        <button
                            onClick={handleSaveTargets}
                            disabled={!isFullyValid || isSaving}
                            className="w-full bg-[#D4AF37] text-black rounded-xl py-3 font-bebas text-xl tracking-widest disabled:opacity-50 transition-opacity"
                        >
                            {isSaving ? 'SAVING...' : 'SAVE ALL TARGETS'}
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
            <PageTutorialOverlay pageId="allocation-targets" steps={ALLOCATION_TUTORIAL_STEPS} />
        </>
    );
}
