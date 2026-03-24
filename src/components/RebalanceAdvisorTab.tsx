import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, TrendingUp, AlertTriangle, ArrowRight, Wallet, Percent, PoundSterling } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import PageTutorialOverlay from './ftue/PageTutorialOverlay';

const REBALANCE_TUTORIAL_STEPS = [
    { type: 'spotlight', targetId: 'ftue-rebalance-input', title: 'Allocate New Capital', message: "Specify how much new capital you intend to invest this month. Our advisor will suggest an optimal distribution based on your allocation targets.", position: 'right' },
    { type: 'spotlight', targetId: 'ftue-rebalance-actions', title: 'Strategic Trade Execution', message: "Recommended buy orders reveal where to deploy capital. If any asset is severely over-allocated (>5%), you will receive a divestment alert.", position: 'left' },
];

export default function RebalanceAdvisorTab({ masterMixData, allocationTargets }: any) {
    const { formatPrimary } = usePortfolio();

    // The amount the user wants to deploy right now. Defaults to 0 or a nominal amount to invite interaction.
    const [deployableCapital, setDeployableCapital] = useState(12000);

    // Default structure matching new KV schema
    const defaultTargets = {
        assetClasses: { Equity: 50, FixedIncome: 30, RealEstate: 15, Crypto: 5, Cash: 0 },
        currencies: { GBP: 50, BRL: 40, USD: 10 }
    };

    const targets = allocationTargets || defaultTargets;
    const safeAssetTargets = targets.assetClasses || { ...defaultTargets.assetClasses, ...targets };

    const actualsAssets = masterMixData?.percentages || { Equity: 0, FixedIncome: 0, RealEstate: 0, Crypto: 0, Cash: 0 };
    const totalNW = masterMixData?.total || 0;

    // Core Rebalance Logic
    const advisorData = useMemo(() => {
        if (totalNW === 0) return { buyActions: [], sellActions: [], finalDrift: 0 };

        const currentValues = {
            Equity: (actualsAssets.Equity / 100) * totalNW,
            FixedIncome: (actualsAssets.FixedIncome / 100) * totalNW,
            RealEstate: (actualsAssets.RealEstate / 100) * totalNW,
            Crypto: (actualsAssets.Crypto / 100) * totalNW,
            Cash: (actualsAssets.Cash / 100) * totalNW,
        };

        const postDeployNW = totalNW + deployableCapital;

        // Calculate Target GBP values for each asset class
        const targetValues = {
            Equity: (safeAssetTargets.Equity / 100) * postDeployNW,
            FixedIncome: (safeAssetTargets.FixedIncome / 100) * postDeployNW,
            RealEstate: (safeAssetTargets.RealEstate / 100) * postDeployNW,
            Crypto: (safeAssetTargets.Crypto / 100) * postDeployNW,
            Cash: (safeAssetTargets.Cash / 100) * postDeployNW,
        };

        const deficits: any[] = [];
        const surpluses: any[] = [];

        Object.keys(currentValues).forEach(asset => {
            const diff = (targetValues as any)[asset] - (currentValues as any)[asset];
            if (diff > 0) {
                deficits.push({ asset, amountNeeded: diff, currentPct: (actualsAssets as any)[asset], targetPct: (safeAssetTargets as any)[asset] });
            } else if (diff < 0) {
                // If diff is negative, we have MORE than we need
                surpluses.push({ asset, amountOver: Math.abs(diff), currentPct: (actualsAssets as any)[asset], targetPct: (safeAssetTargets as any)[asset] });
            }
        });

        // 1. Route Deployable Capital to Deficits (Buy Actions)
        let remainingCapital = deployableCapital;
        const buyActions = [];

        // Sort deficits by largest absolute £ need first
        deficits.sort((a, b) => b.amountNeeded - a.amountNeeded);

        for (const def of deficits) {
            if (remainingCapital <= 0) break;

            // Allocate up to the deficit amount, or whatever capital is left
            const allocation = Math.min(def.amountNeeded, remainingCapital);
            buyActions.push({
                asset: def.asset,
                amount: allocation,
                percentageOfContribution: (allocation / deployableCapital) * 100,
                currentPct: def.currentPct,
                targetPct: def.targetPct
            });
            remainingCapital -= allocation;
            def.amountNeeded -= allocation; // Update remaining deficit
        }

        // 2. Identify Severe Drift (Sell Actions / Divestment)
        // Only flag a sell if the asset is > 5% points over its target AND the deployable capital couldn't naturally fix the ratio.
        const sellActions = [];
        for (const surp of surpluses) {
            const pctDrift = surp.currentPct - surp.targetPct;
            if (pctDrift >= 5.0) {
                sellActions.push({
                    asset: surp.asset,
                    suggestedSellAmount: surp.amountOver,
                    currentPct: surp.currentPct,
                    targetPct: surp.targetPct,
                    driftLevel: pctDrift
                });
            }
        }

        sellActions.sort((a, b) => b.driftLevel - a.driftLevel);

        return { buyActions, sellActions };

    }, [safeAssetTargets, actualsAssets, totalNW, deployableCapital]);


    const handleCapitalChange = (e: React.ChangeEvent<HTMLInputElement> | any) => {
        const val = parseInt(e.target.value.replace(/\D/g, ''), 10);
        setDeployableCapital(isNaN(val) ? 0 : val);
    };

    const hasSignificantSells = advisorData.sellActions.length > 0;

    return (
        <>
        <div className="w-full mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header Area */}
            <div className="mb-8 rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 lg:p-8 flex flex-col sm:flex-row items-center gap-6 justify-center text-center sm:text-left">
                <div className="inline-flex items-center justify-center p-4 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.15)] border border-[#D4AF37]/20 shrink-0">
                    <Scale size={32} strokeWidth={1.5} />
                </div>
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bebas tracking-widest text-[#D4AF37] mb-2 drop-shadow-md uppercase">
                        Smart Rebalance
                    </h2>
                    <p className="font-space  text-data-xs sm:text-sm uppercase tracking-widest text-parchment/60 leading-relaxed max-w-2xl">
                        Optimize your capital deployment to align your portfolio with your master allocation targets.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* ─── LEFT COLUMN: The "What-If" Capital Slider ─── */}
                <div id="ftue-rebalance-input" className="lg:col-span-5 flex flex-col gap-6">
                    <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center text-center p-8 lg:p-12 relative overflow-hidden h-full min-h-[400px]">
                        {/* Background flourish */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-[80px] -ml-32 -mb-32"></div>

                        <div className="relative z-10 w-full flex flex-col items-center">
                            <span className="font-space  text-data-xs text-parchment/50 uppercase tracking-[0.2em] mb-4">
                                1. Input Deployable Capital
                            </span>

                            <div className="relative mb-6 group w-full max-w-xs">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="text-[#D4AF37] font-bebas text-3xl">R$</span>
                                </div>
                                <input
                                    type="text"
                                    value={deployableCapital.toLocaleString('en-GB')}
                                    onChange={handleCapitalChange}
                                    className="w-full bg-black/40 border-2 border-white/10 group-hover:border-[#D4AF37]/50 focus:border-[#D4AF37] rounded-xl py-4 pl-14 pr-6 text-right font-bebas text-4xl lg:text-5xl text-white outline-none transition-all shadow-inner placeholder-white/10"
                                    placeholder="0"
                                />
                            </div>

                            <p className="font-space  text-data-xs text-parchment/40 text-center max-w-[250px] leading-relaxed">
                                Enter the amount you plan to invest this month. The engine will route this capital to correct your asset drift.
                            </p>

                            <div className="mt-8 pt-8 border-t border-white/5 w-full flex flex-col gap-3">
                                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                                    <span className="font-space  text-data-xs uppercase text-parchment/50">Current NW</span>
                                    <span className="font-space  text-data-sm text-parchment">{formatPrimary(totalNW)}</span>
                                </div>
                                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                                    <span className="font-space  text-data-xs uppercase text-parchment/50">Post-Deploy Target</span>
                                    <span className="font-space  text-data-sm text-[#D4AF37] font-bold">{formatPrimary(totalNW + deployableCapital)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── RIGHT COLUMN: Advisor Routing Actions ─── */}
                <div id="ftue-rebalance-actions" className="lg:col-span-7 flex flex-col gap-6">

                    {/* SECTION 1: BUY ACTIONS (Routing New Capital) */}
                    <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 lg:p-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#34D399]/80 shadow-[0_0_15px_#34D399]"></div>

                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="font-bebas text-2xl tracking-widest text-[#34D399] flex items-center gap-2">
                                <TrendingUp size={20} /> Capital Routing
                            </h3>
                            <span className="font-space  text-data-xs px-2 py-1 rounded bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20">
                                BUY ORDERS
                            </span>
                        </div>

                        {deployableCapital === 0 ? (
                            <div className="text-center py-10 border border-dashed border-white/10 rounded-xl bg-black/20">
                                <Wallet className="mx-auto mb-3 text-parchment/20" size={32} />
                                <p className="font-space  text-data-sm text-parchment/40">Enter a capital value to see routing suggestions.</p>
                            </div>
                        ) : advisorData.buyActions.length === 0 ? (
                            <div className="text-center py-10 border border-dashed border-white/10 rounded-xl bg-black/20">
                                <p className="font-space  text-data-sm text-parchment/40">Portfolio is perfectly balanced or no valid targets found.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <AnimatePresence>
                                    {advisorData.buyActions.map((action: any, idx: number) => (
                                        <motion.div
                                            key={action.asset}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-4 items-center bg-black/40 border border-white/5 hover:border-[#34D399]/30 p-4 rounded-xl transition-all"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-bebas text-xl text-white tracking-widest">{action.asset}</span>
                                                <div className="flex items-center gap-2 font-space  text-data-xs mt-1">
                                                    <span className="text-red-400">{action.currentPct.toFixed(1)}%</span>
                                                    <ArrowRight size={10} className="text-parchment/30" />
                                                    <span className="text-[#D4AF37] tracking-wider">TARGET {action.targetPct}%</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:items-end p-2 bg-black/40 rounded-lg border border-white/5">
                                                <span className="font-space tabular-nums text-2xs uppercase text-parchment/40">Allocation</span>
                                                <span className="font-space  text-data-base font-bold text-[#D4AF37]">{action.percentageOfContribution.toFixed(0)}%</span>
                                            </div>

                                            <button className="flex items-center justify-center gap-2 bg-[#34D399]/10 hover:bg-[#34D399]/20 border border-[#34D399]/30 text-[#34D399] px-5 py-3 rounded-lg font-bebas text-lg tracking-widest transition-colors w-full sm:w-auto">
                                                BUY {formatPrimary(action.amount)}
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* SECTION 2: SELL ACTIONS (Divestment Corretion) */}
                    <AnimatePresence>
                        {hasSignificantSells && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-orange-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 lg:p-8 relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.8)]"></div>

                                <div className="mb-6 flex items-center justify-between">
                                    <h3 className="font-bebas text-2xl tracking-widest text-orange-500 flex items-center gap-2">
                                        <AlertTriangle size={20} /> Severe Drift Detected
                                    </h3>
                                    <span className="font-space  text-data-xs px-2 py-1 rounded bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                        DIVESTMENT ALERTS
                                    </span>
                                </div>

                                <div className="mb-6 p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl flex items-start gap-4">
                                    <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={18} />
                                    <p className="font-space  text-data-xs leading-relaxed text-parchment/70">
                                        The following assets are <span className="text-orange-400 font-bold">&gt;5%</span> over their required limits. Your new capital is insufficient to correct this ratio passively. Consider selling to aggressively rebalance.
                                        <br /><span className="text-parchment/40 italic block mt-1">Note: Evaluate Capital Gains Tax (CGT) implications before divesting.</span>
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {advisorData.sellActions.map((action: any, idx: number) => (
                                        <div
                                            key={action.asset}
                                            className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center bg-black/40 border border-orange-500/20 p-4 rounded-xl"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-bebas text-xl text-white tracking-widest">{action.asset}</span>
                                                <div className="flex items-center gap-2 font-space  text-data-xs mt-1">
                                                    <span className="text-orange-400">{action.currentPct.toFixed(1)}%</span>
                                                    <ArrowRight size={10} className="text-parchment/30" />
                                                    <span className="text-[#D4AF37] tracking-wider">TARGET {action.targetPct}%</span>
                                                </div>
                                            </div>

                                            <button className="flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-500 px-5 py-3 rounded-lg font-bebas text-lg tracking-widest transition-colors w-full sm:w-auto">
                                                SELL {formatPrimary(action.suggestedSellAmount)}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </div>
        </div>
            <PageTutorialOverlay pageId="rebalance-advisor" steps={REBALANCE_TUTORIAL_STEPS as any} />
        </>
    );
}
