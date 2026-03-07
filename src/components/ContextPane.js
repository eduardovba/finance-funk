import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function ContextPane({
    selectedAsset,
    rightPaneMode = 'default',
    renderHeader,
    renderDetails,
    renderActions,
    renderTimeline,
    renderEmptyState,
    onClose
}) {
    if (!selectedAsset || rightPaneMode !== 'default') {
        return (
            <div className={`${rightPaneMode !== 'default' ? 'flex' : 'hidden'} lg:flex w-full lg:w-[400px] xl:w-[450px] flex-col h-[calc(100vh-6rem)] shrink-0 rounded-2xl border border-white/10 bg-gradient-to-br from-black/60 to-[#1A0F2E]/60 backdrop-blur-xl shadow-2xl relative`}>
                {/* Subtle glow effect behind content */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#D4AF37]/[0.02] to-transparent z-0 rounded-2xl"></div>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                    {renderEmptyState ? renderEmptyState() : (
                        <div className="h-full flex items-center justify-center p-8 text-center">
                            <span className="text-parchment/30 font-space tracking-[4px] uppercase text-[10px]">
                                Select an asset to view details
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex w-full lg:w-[400px] xl:w-[450px] flex-col h-[calc(100vh-6rem)] shrink-0 rounded-2xl border border-white/10 bg-gradient-to-br from-black/60 to-[#1A0F2E]/60 backdrop-blur-xl shadow-2xl overflow-hidden relative">
            {/* Subtle glow effect behind content */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#D4AF37]/[0.02] to-transparent z-0"></div>

            {/* Header Section (Fixed at top) */}
            <div className="px-6 py-5 border-b border-white/5 relative z-10 flex justify-between items-start bg-black/40">
                <div className="flex-1 min-w-0">
                    {renderHeader && renderHeader(selectedAsset)}
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="ml-4 p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors shrink-0 backdrop-blur-md border border-white/5"
                        aria-label="Close details"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Scrollable Content Section (Independent Scrollbar) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 relative z-10 pb-12">
                {/* Custom Details Area */}
                {renderDetails && (
                    <div className="flex flex-col gap-4">
                        {renderDetails(selectedAsset)}
                    </div>
                )}

                {/* Actions Grid */}
                {renderActions && (
                    <div className="pt-6 border-t border-white/5">
                        {renderActions(selectedAsset)}
                    </div>
                )}

                {/* Transaction Timeline */}
                {renderTimeline && (
                    <div className="pt-6 border-t border-white/5">
                        <h4 className="text-[10px] text-parchment/40 uppercase tracking-[2px] font-space mb-4">Transaction History</h4>
                        <div className="bg-black/20 rounded-xl p-4 border border-white/[0.03]">
                            {renderTimeline(selectedAsset)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
