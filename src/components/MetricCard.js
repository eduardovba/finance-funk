import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, convertCurrency } from "@/lib/currency";
import { ChevronDown } from 'lucide-react';

export default function MetricCard({ id, title, amount, percentage, diffAmount, contributors = [], currency = 'BRL', primaryCurrency = 'BRL', secondaryCurrency = 'GBP', rates, invertColor = false, isLoading = false, onNavigate, compact = false, className = "" }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const isActuallyPositive = (percentage || 0) >= 0;
    const isPositiveForColor = invertColor ? !isActuallyPositive : isActuallyPositive;

    useEffect(() => {
        setIsTouchDevice(window.matchMedia('(hover: none)').matches);
    }, []);

    // Convert amount to secondary currency dynamically
    const secondaryValue = rates ? convertCurrency(amount, currency, secondaryCurrency, rates) : 0;

    const handleInteraction = () => {
        if (isTouchDevice && contributors.length > 0) {
            setIsExpanded(!isExpanded);
        } else if (onNavigate) {
            onNavigate(id);
        }
    };

    if (compact) {
        return (
            <motion.div
                className={`
                    glass-card p-1.5 xl:p-2
                    flex flex-col
                    relative overflow-visible
                    ${onNavigate ? 'cursor-pointer' : 'cursor-default'}
                    ${className}
                `}
                onClick={() => onNavigate && onNavigate(id)}
                onHoverStart={() => !isTouchDevice && setIsExpanded(true)}
                onHoverEnd={() => !isTouchDevice && setIsExpanded(false)}
                initial={false}
                whileTap={{ scale: 0.98 }}
            >



                <div className="flex items-center justify-between gap-2 relative z-10 w-full">
                    <div className="flex flex-col min-w-0 pr-2">
                        <h3 className="text-[#F5F5DC]/60 text-[7px] xl:text-[8px] tracking-[2px] uppercase font-space mb-0 truncate" title={title}>{title}</h3>
                        <p className={`text-lg xl:text-xl font-normal text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.4)] font-bebas truncate ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
                            {isLoading ? '---' : formatCurrency(amount, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <p className={`text-[10px] xl:text-[11px] font-mono text-[#CC5500] opacity-80 ${isLoading ? 'opacity-20' : ''} leading-none`}>
                            {isLoading ? '---' : formatCurrency(secondaryValue, secondaryCurrency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        <span className={`text-[9px] font-mono leading-none ${isPositiveForColor ? 'text-vu-green' : 'text-red-400'}`}>
                            {(diffAmount || 0) > 0 ? '+' : ''}{formatCurrency(diffAmount || 0, primaryCurrency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            {' '}{Math.abs(percentage || 0).toFixed(1)}%
                            <span className="text-[7px] opacity-70 ml-0.5">{isActuallyPositive ? '▲' : '▼'}</span>
                        </span>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {isExpanded && contributors && contributors.length > 0 && (
                        <motion.div
                            key="contributors"
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="flex flex-col gap-1.5 overflow-hidden border-t border-white/5 pt-3 relative z-10"
                        >
                            <div className="text-[8px] xl:text-[9px] text-parchment/30 uppercase tracking-widest mb-1">Top Contributors</div>
                            {contributors.map((c, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ x: -5, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: idx * 0.05 + 0.1 }}
                                    className="flex justify-between items-center text-[9px] xl:text-[10px]"
                                >
                                    <span className="text-parchment/50 font-space truncate max-w-[120px]" title={c.name}>{c.name}</span>
                                    <div className="flex gap-2 font-mono">
                                        <span className={c.amount >= 0 ? 'text-vu-green/90' : 'text-red-400/90'}>
                                            {c.amount >= 0 ? '+' : ''}{formatCurrency(c.amount, primaryCurrency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </span>
                                        <span className="opacity-30 text-[8px] xl:text-[9px]">
                                            ({c.percentage >= 0 ? '+' : ''}{c.percentage.toFixed(1)}%)
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    }

    return (
        <motion.div
            className={`
                glass-card p-4 md:p-6
                flex flex-col justify-between
                relative overflow-hidden
                ${onNavigate || (isTouchDevice && contributors.length > 0) ? 'cursor-pointer' : 'cursor-default'}
                ${className}
            `}
            onClick={handleInteraction}
            onHoverStart={() => !isTouchDevice && setIsExpanded(true)}
            onHoverEnd={() => !isTouchDevice && setIsExpanded(false)}
            initial={false}
            whileTap={{ scale: 0.98 }}
        >
            {/* Shimmer effect on hover */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-parchment/[0.05] to-transparent -translate-x-full pointer-events-none"
                animate={{ x: isExpanded ? '200%' : '-100%' }}
                transition={{ duration: 1.5, repeat: isExpanded ? Infinity : 0, ease: "linear" }}
            />

            <div className="mb-4 relative z-10">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[#F5F5DC]/60 text-[10px] xl:text-xs mb-2 tracking-[2px] uppercase font-space truncate" title={title}>{title}</h3>
                    {isTouchDevice && contributors.length > 0 && (
                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown size={14} className="text-parchment/30" />
                        </motion.div>
                    )}
                </div>
                <motion.div
                    className="min-w-0"
                    animate={{ scale: isExpanded ? 1.02 : 1 }}
                    style={{ originX: 0 }}
                >
                    <p className={`text-3xl xl:text-4xl font-normal text-[#D4AF37] mb-1 drop-shadow-[0_0_10px_rgba(212,175,55,0.4)] font-bebas truncate ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
                        {isLoading ? '---' : formatCurrency(amount, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                </motion.div>
                <div className="flex justify-between items-center gap-2 flex-wrap">
                    <p className={`text-xs xl:text-sm font-mono text-[#CC5500] opacity-80 truncate ${isLoading ? 'opacity-20' : ''}`}>
                        {isLoading ? '---' : formatCurrency(secondaryValue, secondaryCurrency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <div className={`
                        px-2 py-0.5 rounded-xl font-medium text-[10px] flex items-center gap-1.5 leading-none shadow-sm
                        ${isPositiveForColor
                            ? 'text-vu-green bg-vu-green/[0.08] border border-vu-green/20'
                            : 'text-red-400 bg-red-400/[0.08] border border-red-400/20'
                        }
                    `}>
                        <span className="font-mono tracking-tight opacity-90 text-[9px]">
                            {(diffAmount || 0) > 0 ? '+' : ''}{formatCurrency(diffAmount || 0, primaryCurrency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <div className="w-px h-2.5 bg-current opacity-30"></div>
                        <span className="flex items-center gap-0.5">
                            {Math.abs(percentage || 0).toFixed(1)}%
                            <span className="text-[7px] opacity-70 mb-[1px]">{isActuallyPositive ? '▲' : '▼'}</span>
                        </span>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {isExpanded && contributors && contributors.length > 0 && (
                    <motion.div
                        key="contributors"
                        initial={{ height: 0, opacity: 0, y: 10, marginTop: 0 }}
                        animate={{ height: 'auto', opacity: 1, y: 0, marginTop: 16 }}
                        exit={{ height: 0, opacity: 0, y: 10, marginTop: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="flex flex-col gap-2 overflow-hidden border-t border-white/5 pt-4 relative z-10"
                    >
                        <div className="text-[9px] text-parchment/30 uppercase tracking-widest mb-1">Top Contributors</div>
                        {contributors.map((c, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ x: -5, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.05 + 0.1 }}
                                className="flex justify-between items-center text-[10px]"
                            >
                                <span className="text-parchment/50 font-space truncate max-w-[120px]" title={c.name}>{c.name}</span>
                                <div className="flex gap-2 font-mono">
                                    <span className={c.amount >= 0 ? 'text-vu-green/90' : 'text-red-400/90'}>
                                        {c.amount >= 0 ? '+' : ''}{formatCurrency(c.amount, primaryCurrency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </span>
                                    <span className="opacity-30 text-[9px]">
                                        ({c.percentage >= 0 ? '+' : ''}{c.percentage.toFixed(1)}%)
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
