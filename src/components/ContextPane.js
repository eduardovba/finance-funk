import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil } from 'lucide-react';

export default function ContextPane({
    selectedAsset,
    rightPaneMode = 'default',
    renderHeader,
    renderDetails,
    renderActions,
    renderTimeline,
    renderEmptyState,
    onClose,
    onRename,
    maxHeight
}) {
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [renameError, setRenameError] = useState('');
    const renameInputRef = useRef(null);

    // Reset rename state when selected asset changes
    useEffect(() => {
        setIsRenaming(false);
        setRenameError('');
    }, [selectedAsset]);

    const handleStartRename = () => {
        if (!onRename || !selectedAsset) return;
        const name = selectedAsset.name || selectedAsset.asset || selectedAsset.fund || selectedAsset.lenderName || selectedAsset.lender || '';
        setRenameValue(name);
        setRenameError('');
        setIsRenaming(true);
        setTimeout(() => renameInputRef.current?.select(), 50);
    };

    const handleCancelRename = () => {
        setIsRenaming(false);
        setRenameError('');
    };

    const handleConfirmRename = async () => {
        const oldName = selectedAsset.name || selectedAsset.asset || selectedAsset.fund || selectedAsset.lenderName || selectedAsset.lender || '';
        const newName = renameValue.trim();
        if (!newName || newName === oldName) {
            setIsRenaming(false);
            return;
        }
        const result = await onRename(oldName, newName, selectedAsset.broker);
        if (result?.error) {
            setRenameError(result.error);
        } else {
            setIsRenaming(false);
        }
    };

    // Modes that render inline within renderDetails (not as separate pane content)
    const inlineModes = ['default', 'add-rental-month', 'add-mortgage-payment', 'add-transaction', 'edit-transaction', 'update-value'];
    const showDetails = selectedAsset && inlineModes.includes(rightPaneMode);

    if (!showDetails) {
        return (
            <div className={`${rightPaneMode !== 'default' ? 'flex' : 'hidden'} lg:flex w-full lg:w-[400px] xl:w-[450px] flex-col shrink-0 rounded-2xl border border-white/[0.06] bg-[#121418]/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative transition-[height] duration-300 ease-in-out overflow-hidden`} style={{ height: maxHeight || 500 }}>
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

    const assetDisplayName = selectedAsset.name || selectedAsset.asset || selectedAsset.fund || selectedAsset.lenderName || selectedAsset.lender || 'Unknown';

    return (
        <div className="flex w-full lg:w-[400px] xl:w-[450px] flex-col max-h-[calc(100vh-10rem)] shrink-0 rounded-2xl border border-white/[0.06] bg-[#121418]/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden relative">
            {/* Subtle glow effect behind content */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#D4AF37]/[0.02] to-transparent z-0"></div>

            {/* Header Section (Fixed at top) */}
            <div className="px-6 py-5 border-b border-white/5 relative z-10 flex justify-between items-start bg-black/40">
                <div className="flex-1 min-w-0">
                    {onRename ? (
                        <div className="flex flex-col">
                            {isRenaming ? (
                                <div className="flex flex-col gap-1">
                                    <input
                                        ref={renameInputRef}
                                        type="text"
                                        value={renameValue}
                                        onChange={e => setRenameValue(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleConfirmRename();
                                            if (e.key === 'Escape') handleCancelRename();
                                        }}
                                        onBlur={handleConfirmRename}
                                        className="text-xl font-bold text-white/90 tracking-tight bg-white/5 border border-[#D4AF37]/40 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-[#D4AF37]/60 w-full"
                                        autoFocus
                                    />
                                    {renameError && (
                                        <span className="text-xs text-rose-400">{renameError}</span>
                                    )}
                                </div>
                            ) : (
                                <div
                                    className="group flex items-center gap-2 cursor-pointer"
                                    onClick={handleStartRename}
                                    title="Click to rename"
                                >
                                    <h3 className="text-xl font-bold text-white/90 tracking-tight group-hover:text-[#D4AF37] transition-colors">{assetDisplayName}</h3>
                                    <Pencil size={12} className="text-white/0 group-hover:text-white/40 transition-colors shrink-0" />
                                </div>
                            )}
                            {renderHeader && renderHeader(selectedAsset, true)}
                        </div>
                    ) : (
                        renderHeader && renderHeader(selectedAsset)
                    )}
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
