import React from 'react';
import { formatCurrency } from '@/lib/currency';

// --- Month Formatters ---
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatMonthLabel = (isoMonth: string) => {
    if (!isoMonth || !isoMonth.includes('-')) return isoMonth;
    const [yyyy, mm] = isoMonth.split('-');
    return `${MONTH_NAMES[parseInt(mm, 10) - 1]}/${yyyy.slice(2)}`;
};

export const formatYAxis = (value: number) => {
    const rounded = Math.round(value / 5000) * 5000;
    return rounded.toLocaleString('en-GB');
};

// --- Color Maps ---
export const INCOME_COLORS: Record<string, { color: string; label: string }> = {
    salary: { color: '#3b82f6', label: 'Salary' },
    realEstate: { color: '#10b981', label: 'Real Estate' },
    equity: { color: '#a855f7', label: 'Equity' },
    fixedIncome: { color: '#f59e0b', label: 'Interest' },
    extraordinary: { color: '#D4AF37', label: 'Extraordinary' },
};

export const INVESTMENT_COLORS: Record<string, { color: string; label: string }> = {
    equity: { color: '#3b82f6', label: 'Equity' },
    fixedIncome: { color: '#10b981', label: 'Fixed Income' },
    realEstate: { color: '#ef4444', label: 'Real Estate' },
    pensions: { color: '#8b5cf6', label: 'Pensions' },
    crypto: { color: '#f59e0b', label: 'Crypto' },
    debt: { color: '#ec4899', label: 'Debt' },
};

// --- Chart Tooltip ---
export function GlowingChartTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) return null;
    const totalEntry = payload.find((p: any) => p.dataKey === 'total');
    const displayItems = payload.filter((p: any) => p.dataKey !== 'total');
    const total = totalEntry ? totalEntry.value : displayItems.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
    return (
        <div style={{
            background: 'rgba(18, 20, 24, 0.95)',
            border: '1px solid rgba(212, 175, 55, 0.15)',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.05)',
            backdropFilter: 'blur(12px)',
            minWidth: '180px',
        }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(245,245,220,0.7)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                {formatMonthLabel(label)}
            </p>
            {displayItems.map((p: any, index: number) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: p.color,
                            boxShadow: `0 0 6px ${p.color}80`,
                        }} />
                        <span style={{ fontSize: '12px', color: 'rgba(245,245,220,0.6)' }}>{p.name}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: p.color, fontFamily: 'monospace' }}>
                        {formatCurrency(p.value, 'GBP')}
                    </span>
                </div>
            ))}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(245,245,220,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#D4AF37', fontFamily: 'monospace' }}>{formatCurrency(total, 'GBP')}</span>
            </div>
        </div>
    );
}

// --- Custom Legend ---
export function CustomLegend({ payload }: any) {
    if (!payload) return null;
    return (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '16px', flexWrap: 'wrap' }}>
            {payload.map((entry: any, index: number) => {
                const resolvedColor = INCOME_COLORS[entry.dataKey]?.color || entry.color;
                return (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                            width: '10px', height: '10px', borderRadius: '3px',
                            background: resolvedColor,
                            boxShadow: `0 0 8px ${resolvedColor}60`,
                        }} />
                        <span style={{ fontSize: '11px', color: 'rgba(245,245,220,0.5)', fontWeight: 500, letterSpacing: '0.3px' }}>{entry.value}</span>
                    </div>
                );
            })}
        </div>
    );
}

// --- Rounded Top Bar Shape ---
export function RoundedTopBar(barDefKey: string) {
    return (props: any) => {
        const { fill, x, y, width, height, payload } = props;
        const r = 6;
        if (!width || !height || height <= 0) return <g />;
        const isTop = payload._topmostBar === barDefKey;
        if (isTop && height > r) {
            return <path d={`M${x},${y+height} L${x},${y+r} A${r},${r} 0 0,1 ${x+r},${y} L${x+width-r},${y} A${r},${r} 0 0,1 ${x+width},${y+r} L${x+width},${y+height} Z`} fill={fill} />;
        }
        return <rect x={x} y={y} width={width} height={height} fill={fill} />;
    };
}

// --- Highlight Row Style ---
export const highlightStyle = { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' };

// --- Action Button Style ---
export const actionBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
    padding: '4px 8px', borderRadius: '6px', transition: 'all 0.2s'
};
