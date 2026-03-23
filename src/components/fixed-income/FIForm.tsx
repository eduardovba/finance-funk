import React from 'react';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/lib/currency';
import { X } from 'lucide-react';
import { CATEGORIES } from './useFixedIncome';

interface FIFormProps {
    mode: 'add' | 'edit' | 'update';
    // Add form
    addData?: any;
    setAddData?: (fn: (prev: any) => any) => void;
    onSaveAdd?: () => void;
    brokersList?: string[];
    // Edit form
    editingTr?: any;
    setEditingTr?: (fn: (prev: any) => any) => void;
    onSaveEdit?: () => void;
    // Update form
    updateTarget?: any;
    updateNewValue?: string;
    setUpdateNewValue?: (val: string) => void;
    updateSaving?: boolean;
    onSaveUpdate?: () => void;
    // Common
    onClose: () => void;
}

export default function FIForm(props: FIFormProps) {
    const { mode, onClose } = props;

    if (mode === 'add' && props.addData) {
        const { addData, setAddData, onSaveAdd, brokersList } = props;
        return (
            <div className="w-full h-full p-6 text-left relative flex flex-col z-10 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] uppercase">Add Transaction</h3>
                    <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full ml-auto"><X size={16} /></Button>
                </div>
                <div className="flex flex-col gap-5 flex-1 pb-4">
                    {/* Type toggle */}
                    <div className="flex rounded-xl border border-white/10 overflow-hidden">
                        {CATEGORIES.map(c => (
                            <button key={c.id}
                                onClick={() => setAddData?.(prev => ({ ...prev, type: c.id }))}
                                className={`flex-1 py-2.5 text-xs font-semibold tracking-wide transition-all ${addData?.type === c.id
                                    ? c.id === 'Interest' ? 'bg-emerald-500/20 text-emerald-400' : c.id === 'Withdrawal' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'
                                    : 'bg-white/[0.02] text-white/40 hover:bg-white/5'
                                    }`}
                            >{c.label}</button>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-white/60 text-xs mb-1">Asset Name</label>
                            <input type="text" value={addData?.asset || ''} onChange={e => setAddData?.(prev => ({ ...prev, asset: e.target.value }))}
                                placeholder="e.g. CDB Banco C6" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-white/60 text-xs mb-1">Broker</label>
                            <input type="text" value={addData?.broker || ''} onChange={e => setAddData?.(prev => ({ ...prev, broker: e.target.value }))}
                                placeholder="e.g. XP" list="fi-brokers-list"
                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                            <datalist id="fi-brokers-list">
                                {brokersList?.map(b => <option key={b} value={b} />)}
                            </datalist>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-white/60 text-xs mb-1">Date</label>
                            <input type="date" value={addData?.date || ''} onChange={e => setAddData?.(prev => ({ ...prev, date: e.target.value }))}
                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all [color-scheme:dark]" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-white/60 text-xs mb-1">{addData?.type === 'Interest' ? 'Interest Amount' : 'Amount'}</label>
                            <input type="number" step="0.01"
                                value={addData?.type === 'Interest' ? (addData?.interest || '') : (addData?.investment || '')}
                                onChange={e => {
                                    if (addData?.type === 'Interest') setAddData?.(prev => ({ ...prev, interest: e.target.value }));
                                    else setAddData?.(prev => ({ ...prev, investment: e.target.value }));
                                }}
                                placeholder="0.00" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-data-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-space " />
                        </div>
                    </div>

                    <div>
                        <label className="block text-white/60 text-xs mb-1">Notes</label>
                        <input type="text" value={addData?.notes || ''} onChange={e => setAddData?.(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Optional notes..." className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                    </div>
                </div>
                <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-white/10 shrink-0">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={onSaveAdd}>Confirm</Button>
                </div>
            </div>
        );
    }

    if (mode === 'edit' && props.editingTr) {
        const { editingTr, setEditingTr, onSaveEdit } = props;
        return (
            <div className="w-full h-full p-6 text-left relative flex flex-col z-10 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] uppercase">Edit Transaction</h3>
                    <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full ml-auto"><X size={16} /></Button>
                </div>
                <div className="flex flex-col gap-5 flex-1 pb-4">
                    <div className="flex rounded-xl border border-white/10 overflow-hidden">
                        {CATEGORIES.map(c => (
                            <button key={c.id}
                                onClick={() => setEditingTr?.(prev => ({ ...prev, type: c.id }))}
                                className={`flex-1 py-2.5 text-xs font-semibold tracking-wide transition-all ${editingTr?.type === c.id
                                    ? c.id === 'Interest' ? 'bg-emerald-500/20 text-emerald-400' : c.id === 'Withdrawal' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'
                                    : 'bg-white/[0.02] text-white/40 hover:bg-white/5'
                                    }`}
                            >{c.label}</button>
                        ))}
                    </div>

                    <div>
                        <label className="block text-white/60 text-xs mb-1">Date</label>
                        <input type="date" value={editingTr?.date || ''} onChange={e => setEditingTr?.(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all [color-scheme:dark]" />
                    </div>

                    <div>
                        <label className="block text-white/60 text-xs mb-1">{editingTr?.type === 'Interest' ? 'Interest Amount' : 'Amount'}</label>
                        <input type="number" step="0.01"
                            value={editingTr?.type === 'Interest' ? (editingTr?.interest || '') : (editingTr?.investment || '')}
                            onChange={e => {
                                if (editingTr?.type === 'Interest') setEditingTr?.(prev => ({ ...prev, interest: e.target.value }));
                                else setEditingTr?.(prev => ({ ...prev, investment: e.target.value }));
                            }}
                            placeholder="0.00" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-data-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-space " />
                    </div>

                    <div>
                        <label className="block text-white/60 text-xs mb-1">Notes</label>
                        <input type="text" value={editingTr?.notes || ''} onChange={e => setEditingTr?.(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Optional notes..." className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                    </div>
                </div>
                <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-white/10 shrink-0">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={onSaveEdit}>Save Changes</Button>
                </div>
            </div>
        );
    }

    if (mode === 'update' && props.updateTarget) {
        const { updateTarget, updateNewValue = '', setUpdateNewValue, updateSaving, onSaveUpdate } = props;
        const newVal = parseFloat(updateNewValue);
        const isValid = !isNaN(newVal) && newVal > 0;
        const interestCalc = isValid ? (newVal - updateTarget.currentValue) : 0;
        const cur = updateTarget.currency || 'BRL';

        return (
            <div className="w-full h-full p-6 text-left relative flex flex-col z-10 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] uppercase">Update Value</h3>
                    <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full ml-auto"><X size={16} /></Button>
                </div>

                <div className="flex flex-col gap-5 flex-1 pb-4">
                    {/* Asset info */}
                    <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4">
                        <div className="text-sm font-semibold text-white/90 mb-1">{updateTarget.name}</div>
                        <div className="text-xs text-white/40">{updateTarget.broker}</div>
                    </div>

                    {/* Current stats */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between">
                            <span className="text-white/50 text-xs">Current Tracked Value</span>
                            <span className="text-data-sm font-semibold text-white/90 font-space ">{formatCurrency(updateTarget.currentValue, cur)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/50 text-xs">Accrued Interest (so far)</span>
                            <span className="text-data-sm font-semibold text-emerald-400 font-space ">+{formatCurrency(updateTarget.interest || 0, cur)}</span>
                        </div>
                    </div>

                    {/* New value input */}
                    <div>
                        <label className="block text-white/60 text-xs mb-1">Enter current value from your broker</label>
                        <input type="number" step="0.01" autoFocus
                            placeholder={`e.g. ${(updateTarget.currentValue * 1.01).toFixed(2)}`}
                            value={updateNewValue}
                            onChange={e => setUpdateNewValue?.(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && isValid) onSaveUpdate?.(); }}
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-data-sm font-space  font-semibold focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                    </div>

                    {/* Interest preview */}
                    {isValid && (
                        <div className={`rounded-xl p-4 flex justify-between items-center ${interestCalc >= 0 ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-rose-500/5 border border-rose-500/20'}`}>
                            <span className="text-xs text-white/60">{interestCalc >= 0 ? '📈 Interest to record' : '📉 Adjustment to record'}</span>
                            <span className={`text-lg font-bold font-space tabular-nums ${interestCalc >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {interestCalc >= 0 ? '+' : ''}{formatCurrency(interestCalc, cur)}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-white/10 shrink-0">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={onSaveUpdate} disabled={!isValid || updateSaving}
                        className="disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
                        {updateSaving ? 'Saving...' : 'Save Update'}
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}
