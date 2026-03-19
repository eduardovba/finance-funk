import React from 'react';
import _GoalProgressRing from '../GoalProgressRing';
const GoalProgressRing = _GoalProgressRing as any;

interface ForecastHeaderProps {
    currentPortfolioValueBrl: number;
    currentTargetValue: number;
    startingValueBrl: number;
    target2031: number;
    finalValueBrl: number;
    finalValueGbp: number;
    etaMonths: number | null;
    forecastEtaMonths: number | null;
    formatK: (val: number, currency?: string) => string;
}

export default function ForecastHeader({
    currentPortfolioValueBrl, currentTargetValue, startingValueBrl, target2031,
    finalValueBrl, finalValueGbp, etaMonths, forecastEtaMonths, formatK
}: ForecastHeaderProps) {
    return (
        <div id="ftue-forecast-projection" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] !p-6 lg:!p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-center relative z-10">
                {/* Left: Progress Ring */}
                <div className="flex justify-center lg:justify-start">
                    <GoalProgressRing
                        currentValue={currentPortfolioValueBrl || 0}
                        goalValue={target2031}
                        goalYear={2031}
                        startingValue={startingValueBrl}
                        targetValue={currentTargetValue}
                        etaMonths={etaMonths}
                        formatValue={(v: number) => formatK(v, 'BRL')}
                    />
                </div>

                {/* Center: Current Reality */}
                <div className="flex flex-col justify-center gap-6 lg:border-x lg:border-white/5 lg:px-12 py-4">
                    <div>
                        <span className="font-mono tabular-nums text-[0.75rem] text-white/40 uppercase tracking-[0.2em]">Current Net Wealth</span>
                        <div className="font-bebas text-4xl tracking-wider text-white mt-1.5 drop-shadow-md">
                            R$ {((currentPortfolioValueBrl || 0) / 1000000).toFixed(3)}M
                        </div>
                    </div>
                    {currentTargetValue > 0 && (
                        <div className="pt-6 border-t border-white/5 relative">
                            <span className="font-mono tabular-nums text-[0.75rem] text-white/40 uppercase tracking-[0.2em]">Target (Now)</span>
                            <div className="flex items-baseline gap-3 mt-1.5">
                                <span className="font-bebas text-3xl tracking-wider text-white/80">R$ {(currentTargetValue / 1000000).toFixed(3)}M</span>
                                <span className={`font-mono tabular-nums text-sm font-bold ${(currentPortfolioValueBrl || 0) >= currentTargetValue ? 'text-[#34D399]' : 'text-[#ef4444]'}`}>
                                    {(currentPortfolioValueBrl || 0) >= currentTargetValue ? '+' : ''}R$ {(((currentPortfolioValueBrl || 0) - currentTargetValue) / 1000000).toFixed(3)}M
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: The Future Projection */}
                <div className="bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden group hover:border-[#D4AF37]/30 transition-all duration-500 hover:shadow-[0_0_40px_rgba(212,175,55,0.15)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 to-transparent opacity-60 pointer-events-none" />
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37] to-[#34D399] opacity-[0.03] pointer-events-none blur-xl" />

                    <div className="relative z-10 flex flex-col gap-6">
                        <div>
                            <span className="flex items-center gap-2 font-mono tabular-nums text-[0.75rem] text-[#D4AF37]/90 uppercase tracking-[0.2em] font-bold">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
                                Projected 2031
                            </span>
                            <div className="font-bebas text-5xl tracking-widest text-[#D4AF37] mt-3 drop-shadow-[0_0_12px_rgba(212,175,55,0.5)]">
                                {formatK(finalValueBrl, 'BRL')}
                            </div>
                            <div className="font-mono tabular-nums text-sm text-white/50 mt-1">{formatK(finalValueGbp, 'GBP')}</div>
                        </div>

                        <div className="flex items-end justify-between pt-5 border-t border-[#D4AF37]/20">
                            <div>
                                <span className="font-mono tabular-nums text-[0.6875rem] text-white/40 uppercase tracking-widest block mb-1">Goal vs Projected</span>
                                <div className={`font-bebas text-2xl tracking-wider ${finalValueBrl >= target2031 ? 'text-[#34D399]' : 'text-[#ef4444]'}`}>
                                    {target2031 > 0 ? ((finalValueBrl / target2031) * 100).toFixed(0) : 0}%
                                </div>
                            </div>

                            {forecastEtaMonths !== null && (
                                <div className={`px-3 py-1.5 rounded-md border text-[0.75rem] font-mono tabular-nums font-bold uppercase tracking-wider backdrop-blur-md ${forecastEtaMonths >= 0 ? 'bg-[#34D399]/10 border-[#34D399]/30 text-[#34D399] shadow-[0_0_10px_rgba(52,211,153,0.2)]' : 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444] shadow-[0_0_10px_rgba(239,68,68,0.2)]'}`}>
                                    {forecastEtaMonths > 0 ? `+${forecastEtaMonths} mo early` : forecastEtaMonths < 0 ? `${forecastEtaMonths} mo late` : 'On Time'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
