import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, convertCurrency } from "@/lib/currency";
import { ChevronDown } from 'lucide-react';

export default function MetricCard({ id, title, amount, percentage, diffAmount, contributors = [], currency = 'BRL', primaryCurrency = 'BRL', secondaryCurrency = 'GBP', rates, invertColor = false, isLoading = false, onNavigate }) {
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

    return (
        <motion.div
            className={`
                glass-card p-4 md:p-6
                flex flex-col justify-between
                relative overflow-hidden
                ${onNavigate || (isTouchDevice && contributors.length > 0) ? 'cursor-pointer' : 'cursor-default'}
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
                <div className="flex items-center justify-between">
                    <h3 className="text-[#F5F5DC]/60 text-xs mb-2 tracking-[2px] uppercase font-space">{title}</h3>
                    {isTouchDevice && contributors.length > 0 && (
                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown size={14} className="text-parchment/30" />
                        </motion.div>
                    )}
                </div>
                <motion.p
                    className={`text-4xl font-normal text-[#D4AF37] mb-1 drop-shadow-[0_0_10px_rgba(212,175,55,0.4)] font-bebas ${isLoading ? 'opacity-30' : 'opacity-100'}`}
                    animate={{ scale: isExpanded ? 1.02 : 1 }}
                >
                    {isLoading ? '---' : formatCurrency(amount, currency)}
                </motion.p>
                <div className="flex justify-between items-baseline">
                    <p className={`text-sm font-mono text-[#CC5500] opacity-80 ${isLoading ? 'opacity-20' : ''}`}>
                        {isLoading ? '---' : formatCurrency(secondaryValue, secondaryCurrency)}
                    </p>
                    <div className={`
                        px-2 py-0.5 rounded-xl font-medium text-[10px] flex items-center gap-1
                        ${isPositiveForColor
                            ? 'text-vu-green bg-vu-green/10'
                            : 'text-red-400 bg-red-400/10'
                        }
                    `}>
                        {Math.abs(percentage || 0).toFixed(1)}%
                        <span className="text-[8px] opacity-70">{isActuallyPositive ? '▲' : '▼'}</span>
                    </div>
                </div>
            </div>

            <div className="border-t border-white/5 pt-4 relative z-10">
                <AnimatePresence mode="wait">
                    {isExpanded && contributors && contributors.length > 0 ? (
                        <motion.div
                            key="contributors"
                            initial={{ height: 0, opacity: 0, y: 10 }}
                            animate={{ height: 'auto', opacity: 1, y: 0 }}
                            exit={{ height: 0, opacity: 0, y: 10 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="flex flex-col gap-2 overflow-hidden"
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
                                            {c.amount >= 0 ? '+' : ''}{formatCurrency(c.amount, primaryCurrency)}
                                        </span>
                                        <span className="opacity-30 text-[9px]">
                                            ({c.percentage >= 0 ? '+' : ''}{c.percentage.toFixed(1)}%)
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="variance"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-between text-xs"
                        >
                            <span className="text-parchment/40 text-[10px] font-space tracking-wider uppercase opacity-60">MoM Variance</span>
                            <span className={`font-mono font-medium ${isActuallyPositive ? 'text-vu-green' : 'text-red-400'}`}>
                                {(diffAmount || 0) > 0 ? '+' : ''}{formatCurrency(diffAmount || 0, primaryCurrency)}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
