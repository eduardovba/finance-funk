import React, { useState, useRef, useEffect } from 'react';

// Singleton for single-expand logic across all instances of AssetCard
const expandListeners = new Set();
let currentlyExpandedId = null;

/**
 * Reusable Mobile-First Asset Card
 * 
 * @param {string} title - Main asset name (e.g. "Bitcoin")
 * @param {string} subtitle - Secondary text (e.g. "BTC" or "Crypto")
 * @param {string|number} value - Main fiat value (e.g. "$12,450.00")
 * @param {string|number} performance - Secondary value, usually P&L (e.g. "+$500", "+5%")
 * @param {boolean} isPositive - Determines color of performance indicator
 * @param {React.ReactNode} icon - Optional icon node
 * @param {React.ReactNode} expandedContent - Content to show when expanded (detail grid, actions)
 */
export default function AssetCard({
    title,
    subtitle,
    value,
    performance,
    isPositive,
    icon,
    expandedContent
}) {
    const [cardId] = useState(() => Math.random().toString(36).substring(2, 11));
    const [isExpanded, setIsExpanded] = useState(false);
    const [contentHeight, setContentHeight] = useState(0);
    const contentRef = useRef(null);

    // Calculate height for CSS transition
    useEffect(() => {
        if (contentRef.current) {
            setContentHeight(contentRef.current.scrollHeight);
        }
    }, [expandedContent, isExpanded]);

    // Listen for other cards expanding
    useEffect(() => {
        const listener = (expandedId) => {
            if (expandedId !== cardId && isExpanded) {
                setIsExpanded(false);
            }
        };
        expandListeners.add(listener);
        return () => expandListeners.delete(listener);
    }, [cardId, isExpanded]);

    const handleTap = () => {
        // Optional haptic feedback on supported devices (Android/PWA)
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(5);
        }

        const willExpand = !isExpanded;
        if (willExpand) {
            currentlyExpandedId = cardId;
            // Notify other cards to close
            expandListeners.forEach(fn => fn(cardId));
        } else {
            if (currentlyExpandedId === cardId) {
                currentlyExpandedId = null;
            }
        }

        setIsExpanded(willExpand);
    };

    return (
        <div
            className={`rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden transition-all duration-300 ease-out mb-3 cursor-pointer select-none 
                ${isExpanded ? 'ring-1 ring-[var(--accent-color)]/30 bg-[rgba(30,18,52,0.6)]' : 'hover:bg-[rgba(255,255,255,0.03)] active:scale-[0.98]'}`}
            style={{ padding: '0' }}
            onClick={handleTap}
        >
            {/* Left Edge P&L Indicator */}
            <div
                className={`absolute left-0 top-0 bottom-0 w-1 transition-colors duration-300
                    ${isPositive === true ? 'bg-emerald-500' : isPositive === false ? 'bg-rose-500' : 'bg-transparent'}`}
            />

            {/* Front Card Face (Always Visible) */}
            <div className="p-4 pl-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {icon && (
                        typeof icon === 'string' ? (
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl shrink-0 border border-white/10">
                                {icon}
                            </div>
                        ) : (
                            <div className="shrink-0 flex items-center justify-center">
                                {icon}
                            </div>
                        )
                    )}
                    <div className="flex flex-col">
                        <span className="font-semibold text-base text-white tracking-wide">{title}</span>
                        <span className="text-sm text-white/50">{subtitle}</span>
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <span className="font-bold text-[1.1rem] text-white">{value}</span>
                    {performance && (
                        <span className={`text-xs font-semibold px-1.5 py-0.5 mt-0.5 rounded-lg flex items-center gap-1 ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : isPositive === false ? 'bg-rose-500/10 text-rose-400' : 'text-white/50'}`}>
                            {performance}
                        </span>
                    )}
                </div>
            </div>

            {/* Expanded Detail Panel */}
            <div
                className="transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                style={{
                    maxHeight: isExpanded ? `${contentHeight}px` : '0px',
                    opacity: isExpanded ? 1 : 0,
                    overflow: 'hidden'
                }}
            >
                <div ref={contentRef} className="px-5 pb-5 pt-1 text-sm border-t border-white/5 mt-1" onClick={e => e.stopPropagation()}>
                    {expandedContent}
                </div>
            </div>
        </div>
    );
}
