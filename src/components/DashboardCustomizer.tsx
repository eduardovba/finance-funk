import React, { useState, useEffect } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { X, GripVertical, Settings2, Plus, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';

const AVAILABLE_DATA_SOURCES = [
    { id: 'networth-history', label: 'Net Worth History', allowedSeries: ['networthPrimary', 'networthSecondary', 'targetPrimary', 'actualGreen', 'actualRed'] },
    { id: 'category-history', label: 'Category History', allowedSeries: ['RealEstate', 'Equity', 'FixedIncome', 'Crypto', 'Pensions', 'Debt'] },
    { id: 'allocation-current', label: 'Current Allocation vs Targets', allowedSeries: ['actual', 'target'] },
    { id: 'roi-history', label: 'ROI History', allowedSeries: ['roi'] },
    { id: 'fx-rate-history', label: 'FX Rate History', allowedSeries: ['impliedRate'] },
    { id: 'currency-exposure', label: 'Currency Exposure', allowedSeries: ['value'] }, // Modified for donut: data keys are generated dynamically but series usually just needs a placeholder
    { id: 'net-flow-history', label: 'Net Inflow/Outflow', allowedSeries: ['Net'] },
    { id: 'wealth-trajectory', label: 'Wealth Trajectory', allowedSeries: ['targetPrimary', 'actualGreen', 'actualRed'] }
];

const AVAILABLE_CHART_TYPES = [
    { id: 'area', label: 'Area Chart', icon: '⛰️' },
    { id: 'line', label: 'Line Chart', icon: '📈' },
    { id: 'stacked-area', label: 'Stacked Area', icon: '📊' },
    { id: 'stacked-bar', label: 'Stacked Bar', icon: '📊' },
    { id: 'horizontal-bar', label: 'Horizontal Bar', icon: '▤' },
    { id: 'donut', label: 'Donut Chart', icon: '🍩' }
];

// Reorder Item wrapper with internal layout
function ChartListItem({ item, updateItem, removeItem, isExpanded, setExpandedId }: any) {
    const controls = useDragControls();

    const currentSourceDef = AVAILABLE_DATA_SOURCES.find(ds => ds.id === (item.dataSources?.[0]));
    const seriesList = currentSourceDef?.allowedSeries || [];

    const handleSeriesToggle = (s: string) => {
        let newSeries = [...(item.series || [])];
        if (newSeries.includes(s)) {
            newSeries = newSeries.filter(x => x !== s);
        } else {
            newSeries.push(s);
        }
        updateItem(item.id, { series: newSeries });
    };

    return (
        <Reorder.Item
            value={item}
            dragListener={false}
            dragControls={controls}
            className="bg-[#1A0F2E] border border-white/10 rounded-lg mb-3 overflow-hidden"
        >
            {/* Header / List Row */}
            <div className="flex items-center justify-between p-3 cursor-default">
                <div className="flex items-center gap-3">
                    <div
                        className="cursor-grab hover:text-[#D4AF37] text-white/40 touch-none px-1"
                        onPointerDown={(e: any) => controls.start(e)}
                    >
                        <GripVertical size={18} />
                    </div>
                    <div>
                        <div className="text-sm text-[#F5F5DC] font-medium font-space">{item.title}</div>
                        <div className="text-xs text-white/40 uppercase tracking-wider mt-0.5">
                            {AVAILABLE_CHART_TYPES.find(t => t.id === item.chartType)?.label} • {currentSourceDef?.label}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className={`p-1.5 rounded transition-colors ${isExpanded ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'hover:bg-white/5 text-white/50'}`}
                    >
                        <Settings2 size={16} />
                    </button>
                    <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Settings Accordion */}
            {isExpanded && (
                <div className="p-4 border-t border-white/5 bg-black/20 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-white/50 uppercase tracking-wider mb-1">Title</label>
                            <input
                                type="text"
                                value={item.title}
                                onChange={(e) => updateItem(item.id, { title: e.target.value })}
                                className="w-full bg-[#1A0F2E] border border-white/10 rounded px-2 py-1.5 text-[#F5F5DC] focus:outline-none focus:border-[#D4AF37]/50"
                            />
                        </div>
                        <div>
                            <label className="block text-white/50 uppercase tracking-wider mb-1">Data Source</label>
                            <select
                                value={item.dataSources?.[0]}
                                onChange={(e) => {
                                    const sourceDef = AVAILABLE_DATA_SOURCES.find(ds => ds.id === e.target.value);
                                    updateItem(item.id, {
                                        dataSources: [e.target.value],
                                        series: sourceDef ? [...sourceDef.allowedSeries] : []
                                    });
                                }}
                                className="w-full bg-[#1A0F2E] border border-white/10 rounded px-2 py-1.5 text-[#F5F5DC] focus:outline-none focus:border-[#D4AF37]/50"
                            >
                                {AVAILABLE_DATA_SOURCES.map(ds => (
                                    <option key={ds.id} value={ds.id}>{ds.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="block text-white/50 uppercase tracking-wider mb-2">Visible Series</label>
                        <div className="flex flex-wrap gap-2">
                            {seriesList.map(s => {
                                const active = item.series?.includes(s);
                                return (
                                    <button
                                        key={s}
                                        onClick={() => handleSeriesToggle(s)}
                                        className={`px-2 py-1 rounded border text-xs uppercase font-space transition-colors ${active ? 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]' : 'bg-transparent border-white/10 text-white/40 hover:bg-white/5'}`}
                                    >
                                        {s}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </Reorder.Item>
    );
}

export default function DashboardCustomizer({ initialConfig, onClose, onSave }: any) {
    const [charts, setCharts] = useState(initialConfig?.charts || []);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Filter valid charts just in case
    const safeCharts = charts.filter((c: any) => c && c.id);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedConfig = { ...initialConfig, charts: safeCharts.map((c: any, i: number) => ({ ...c, order: i })) };

            const res = await fetch('/api/dashboard-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedConfig)
            });

            if (!res.ok) throw new Error('Failed to save configuration');

            const { config } = await res.json();
            onSave(config);
            onClose();
        } catch (err) {
            console.error(err);
            alert("Error saving dashboard layout");
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm("Reset to default layout?")) return;
        setIsSaving(true);
        try {
            // Delete effectively falls back to original config via GET logic, or we can just send null to force reset if backend allowed it, 
            // but the safest approach is fetching GET without cache or just passing a flag.
            // Wait, we can just omit body to fetch default or we have it hardcoded in API.
            // Let's just wipe and the API will use its default? No, the API just write what we send. 
            // Better fetch the default by deleting the file or we can just reload the page for now. 
            // To be robust, let's fetch default config explicitly if we want to reset:
            const res = await fetch('/api/dashboard-config?reset=true', { method: 'GET', cache: 'no-store' });
            // For now, if reset=true is not implemented, just clear the UI state and let standard charts re-populate by default.
            // Since we know the default, we can just hardcode or fetch the endpoint.
            // A simpler approach: set charts = [] won't work perfectly. Let's just delete the dashboard_config json using a special param.

            alert('Please manually reset or implement the server-side reset endpoint.');
        } finally {
            setIsSaving(false);
            onClose();
        }
    };

    const addChart = (chartType: string) => {
        // Pick logical default data source based on chart
        const dsId = {
            'area': 'networth-history',
            'line': 'roi-history',
            'stacked-area': 'category-history',
            'stacked-bar': 'category-history',
            'horizontal-bar': 'allocation-current',
            'donut': 'currency-exposure'
        }[chartType] || 'networth-history';

        const sourceDef = AVAILABLE_DATA_SOURCES.find(d => d.id === dsId);

        const newChart = {
            id: `${chartType}-${Date.now()}`,
            title: `New ${AVAILABLE_CHART_TYPES.find(t => t.id === chartType)?.label}`,
            chartType,
            dataSources: [dsId],
            series: [...(sourceDef?.allowedSeries || [])],
            order: safeCharts.length,
            options: {}
        };

        setCharts([...safeCharts, newChart]);
        setExpandedId(newChart.id);
    };

    const updateChart = (id: string, updates: any) => {
        setCharts(charts.map((c: any) => c.id === id ? { ...c, ...updates } : c));
    };

    const removeChart = (id: string) => {
        setCharts(charts.filter((c: any) => c.id !== id));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-[#110A1F] border border-[#D4AF37]/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative z-10 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/10 bg-black/20">
                    <h2 className="text-2xl font-bebas tracking-wide text-[#D4AF37] m-0">Dashboard Customizer</h2>
                    <Button variant="ghost" size="sm" onClick={onClose} className="text-white/50 hover:text-white">
                        <X size={24} />
                    </Button>
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

                    {/* Catalog Column */}
                    <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-white/5 p-6 overflow-y-auto bg-black/10">
                        <h3 className="text-xs uppercase font-space text-[#F5F5DC]/40 tracking-[2px] mb-4">Add New Chart</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3">
                            {AVAILABLE_CHART_TYPES.map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => addChart(type.id)}
                                    className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-[#1A0F2E] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/30 transition-all text-left group"
                                >
                                    <div className="w-8 h-8 rounded bg-black/30 flex items-center justify-center text-lg">{type.icon}</div>
                                    <div className="flex-1">
                                        <div className="text-sm font-space text-[#F5F5DC] group-hover:text-[#D4AF37] transition-colors">{type.label}</div>
                                        <div className="text-xs text-white/30 uppercase mt-0.5 tracking-wider">Add to layout</div>
                                    </div>
                                    <Plus size={16} className="text-white/20 group-hover:text-[#D4AF37] transition-colors" />
                                </button>
                            ))}
                        </div>

                        <div className="mt-8 p-4 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5">
                            <h4 className="text-[#D4AF37] text-sm font-space mb-2">How it works</h4>
                            <ul className="text-white/50 text-xs space-y-2 list-disc pl-4">
                                <li><strong>Drag to reorder</strong> your active charts.</li>
                                <li>Click the <strong>gear icon</strong> to customize data sources and visible series.</li>
                                <li>You can add <strong>multiple</strong> instances of the same chart type.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Active Charts Column */}
                    <div className="w-full md:w-2/3 p-6 overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs uppercase font-space text-[#F5F5DC]/40 tracking-[2px]">Layout & Active Charts</h3>
                            <span className="text-xs text-white/30 tracking-widest uppercase">{safeCharts.length} widgets</span>
                        </div>

                        {safeCharts.length === 0 ? (
                            <div className="h-40 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl text-center px-4">
                                <span className="text-4xl opacity-20 mb-2">📊</span>
                                <p className="text-white/30 text-xs font-space">Your dashboard is empty.</p>
                                <p className="text-white/20 text-xs mt-1">Add a chart from the left panel.</p>
                            </div>
                        ) : (
                            <Reorder.Group axis="y" values={safeCharts} onReorder={setCharts} className="min-h-[100px]">
                                {safeCharts.map((item: any) => (
                                    <ChartListItem
                                        key={item.id}
                                        item={item}
                                        updateItem={updateChart}
                                        removeItem={removeChart}
                                        isExpanded={expandedId === item.id}
                                        setExpandedId={setExpandedId}
                                    />
                                ))}
                            </Reorder.Group>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center p-6 border-t border-white/10 bg-black/40">
                    {/* <button 
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-space uppercase tracking-wider text-white/40 hover:text-white transition-colors"
                    >
                        <RotateCcw size={14} /> Reset Layout
                    </button> */}
                    <div />
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-space text-sm tracking-widest uppercase font-bold"
                    >
                        <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
