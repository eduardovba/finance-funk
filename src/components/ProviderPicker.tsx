"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Globe, ChevronRight, Info, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';

/**
 * ProviderPicker — displays a grid of supported financial providers
 * grouped by country (Brazil / UK). On selection, shows export
 * instructions and a "Continue to Upload" CTA.
 */
export default function ProviderPicker({ providers, onSelect, onBack }: any) {
    const [selectedProvider, setSelectedProvider] = useState<any>(null);

    const brProviders = providers.filter((p: any) => p.country === 'BR');
    const ukProviders = providers.filter((p: any) => p.country === 'UK');

    if (selectedProvider) {
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
            >
                {/* Selected Provider Header */}
                <Card variant="flat" className="flex items-center gap-4">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden"
                        style={selectedProvider.logo
                            ? { background: '#f0f0f0', border: '1px solid rgba(255,255,255,0.1)' }
                            : { background: `${selectedProvider.color}15`, border: `1px solid ${selectedProvider.color}30` }
                        }
                    >
                        {selectedProvider.logo
                            ? <Image src={selectedProvider.logo} alt={selectedProvider.name} width={32} height={32} className="w-full h-full object-contain rounded-lg p-0.5" unoptimized />
                            : selectedProvider.icon
                        }
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-parchment font-space text-base font-bold m-0">
                            {selectedProvider.name}
                        </h3>
                        <p className="text-parchment/40 text-xs font-space m-0">
                            {selectedProvider.description}
                        </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {selectedProvider.assetClasses.map((ac: any) => (
                            <span
                                key={ac}
                                className="px-2 py-0.5 rounded-full text-2xs font-space uppercase tracking-widest bg-[#D4AF37]/10 text-[#D4AF37]/80 border border-[#D4AF37]/20"
                            >
                                {ac}
                            </span>
                        ))}
                    </div>
                </Card>

                {/* Export Instructions */}
                <Card variant="flat">
                    <div className="flex items-center gap-2 mb-4">
                        <Info size={16} className="text-[#D4AF37]/60" />
                        <h4 className="text-[#D4AF37] font-bebas text-lg tracking-widest m-0">
                            How to Export Your Statement
                        </h4>
                    </div>
                    <ol className="list-none p-0 m-0 space-y-3">
                        {selectedProvider.exportInstructions.map((step: any, i: number) => (
                            <li key={i} className="flex items-start gap-3">
                                <span
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-space font-bold flex-shrink-0 mt-0.5"
                                    style={{ background: `${selectedProvider.color}20`, color: selectedProvider.color }}
                                >
                                    {i + 1}
                                </span>
                                <span className="text-sm text-parchment/70 font-space leading-relaxed">
                                    {step}
                                </span>
                            </li>
                        ))}
                    </ol>
                    <div className="mt-4 pt-3 border-t border-white/5">
                        <p className="text-xs text-parchment/30 font-space m-0">
                            Supported formats: {selectedProvider.supportedFormats.map((f: any) => f.toUpperCase()).join(', ')}
                        </p>
                    </div>
                </Card>

                {/* Actions */}
                <div className="flex justify-between gap-4">
                    <button
                        onClick={() => setSelectedProvider(null)}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-parchment/60 text-sm font-space hover:bg-white/10 transition-all cursor-pointer"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onSelect(selectedProvider)}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl btn-primary text-sm font-space font-bold transition-all border-none cursor-pointer"
                    >
                        Continue to Upload <ChevronRight size={16} />
                    </motion.button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            {/* Country Sections */}
            <ProviderGroup
                title="🇧🇷 Brazil"
                providers={brProviders}
                onSelect={setSelectedProvider}
            />

            <ProviderGroup
                title="🇬🇧 United Kingdom"
                providers={ukProviders}
                onSelect={setSelectedProvider}
            />

            {/* Fallback link */}
            <div className="text-center pt-4 border-t border-white/5">
                <button
                    onClick={onBack}
                    className="text-xs text-parchment/30 hover:text-[#D4AF37] font-space transition-colors bg-transparent border-none cursor-pointer"
                >
                    Don&apos;t see your provider? → Use Generic Spreadsheet Import
                </button>
            </div>
        </motion.div>
    );
}

function ProviderGroup({ title, providers, onSelect }: any) {
    if (providers.length === 0) return null;

    return (
        <div>
            <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] mb-3">{title}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {providers.map((provider: any) => (
                    <motion.button
                        key={provider.id}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onSelect(provider)}
                        className="group p-4 rounded-2xl bg-[rgba(18,20,24,0.55)] backdrop-blur-[24px] backdrop-saturate-150 border border-[rgba(255,255,255,0.06)] border-t-[rgba(255,255,255,0.1)] shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-[#D4AF37]/30 text-left transition-all cursor-pointer"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <span
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-colors overflow-hidden"
                                style={provider.logo
                                    ? { background: '#f0f0f0', border: '1px solid rgba(255,255,255,0.08)' }
                                    : { background: `${provider.color}10`, border: `1px solid ${provider.color}20` }
                                }
                            >
                                {provider.logo
                                    ? <Image src={provider.logo} alt={provider.name} width={32} height={32} className="w-full h-full object-contain rounded-lg p-0.5" unoptimized />
                                    : provider.icon
                                }
                            </span>
                            <div className="min-w-0 flex-1">
                                <span className="text-sm font-space font-bold text-parchment block group-hover:text-[#D4AF37] transition-colors truncate">
                                    {provider.name}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                            {provider.assetClasses.slice(0, 3).map((ac: any) => (
                                <span
                                    key={ac}
                                    className="px-1.5 py-0.5 rounded text-2xs font-space uppercase tracking-wider bg-white/[0.05] text-parchment/30"
                                >
                                    {ac}
                                </span>
                            ))}
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
