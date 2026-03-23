"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { usePortfolio } from '@/context/PortfolioContext';
import CelebrationOverlay from '@/components/ftue/CelebrationOverlay';
import { useRouter } from 'next/navigation';

interface StepResultProps {
    result: any;
    assetClass: string;
    onReset: () => void;
}

export default function StepResult({ result, assetClass, onReset }: StepResultProps) {
    const router = useRouter();
    const { ftueState, updateFtueProgress } = usePortfolio() as any;
    const [showCelebration, setShowCelebration] = useState(false);

    // Trigger celebration on first successful import
    React.useEffect(() => {
        if (result && result.imported > 0 && ftueState && !ftueState.checklistItems?.importHistory) {
            updateFtueProgress({
                checklistItems: {
                    ...ftueState.checklistItems,
                    importHistory: true,
                },
            });
            setShowCelebration(true);
        }
    }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!result) return null;

    const isSuccess = result.imported > 0;
    const assetPage = assetClass === 'Fixed Income' ? '/assets/fixed-income'
        : assetClass === 'Real Estate' ? '/assets/real-estate'
        : `/assets/${assetClass.toLowerCase()}`;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
        >
            {/* Hero Result */}
            <div className="glass-card text-center py-12 px-8">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                    className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                    style={{ background: isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }}
                >
                    {isSuccess ? (
                        <CheckCircle2 size={40} className="text-emerald-400" />
                    ) : (
                        <AlertCircle size={40} className="text-red-400" />
                    )}
                </motion.div>

                <h2 className="font-bebas text-3xl tracking-widest text-gradient mb-2">
                    {isSuccess ? 'Import Complete!' : 'Import Finished'}
                </h2>

                <div className="grid grid-cols-3 gap-6 max-w-sm mx-auto mt-8">
                    <div>
                        <div className="text-3xl font-bebas tracking-wider text-emerald-400">{result.imported}</div>
                        <div className="text-[0.75rem] text-parchment/40 font-space uppercase tracking-widest">Imported</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bebas tracking-wider text-amber-400">{result.skipped}</div>
                        <div className="text-[0.75rem] text-parchment/40 font-space uppercase tracking-widest">Skipped</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bebas tracking-wider text-[#D4AF37]">{result.assetsCreated}</div>
                        <div className="text-[0.75rem] text-parchment/40 font-space uppercase tracking-widest">New Assets</div>
                    </div>
                </div>
            </div>

            {/* Errors */}
            {result.errors?.length > 0 && (
                <div className="glass-card">
                    <h3 className="font-bebas text-lg tracking-widest text-amber-400 mb-3">
                        {result.errors.length} Issue{result.errors.length > 1 ? 's' : ''} Found
                    </h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                        {result.errors.slice(0, 20).map((err: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-parchment/50 font-space">
                                <span className="text-amber-400/60">Row {err.row}:</span>
                                <span>{err.error}</span>
                            </div>
                        ))}
                        {result.errors.length > 20 && (
                            <p className="text-xs text-parchment/30 font-space">...and {result.errors.length - 20} more</p>
                        )}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-4">
                <button
                    onClick={onReset}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-parchment/60 text-sm font-space hover:bg-white/10 transition-all"
                >
                    <RotateCcw size={16} /> Import Another File
                </button>
                <a
                    href={assetPage}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl btn-primary text-sm font-space no-underline transition-all"
                >
                    View {assetClass} <ArrowRight size={16} />
                </a>
            </div>

            {/* First Import Celebration */}
            {showCelebration && (
                <CelebrationOverlay
                    title="Data Imported! 🎉"
                    subtitle={`${result.imported} transactions imported into ${assetClass}. Your portfolio is coming to life!`}
                    metric={null}
                    ctaLabel="🎸 View My Dashboard"
                    onDismiss={() => {
                        setShowCelebration(false);
                        router.push('/dashboard');
                    }}
                    autoDismissMs={8000}
                />
            )}
        </motion.div>
    );
}
