import React from 'react';
import { Button } from '@/components/ui';
import _CurrencySelector from '../CurrencySelector';
const CurrencySelector = _CurrencySelector as any;
import { X } from 'lucide-react';

interface DebtFormProps {
    addFormData: any;
    setAddFormData: (fn: (prev: any) => any) => void;
    combinedLenders: string[];
    onSave: () => void;
    onClose: () => void;
}

export default function DebtForm({ addFormData, setAddFormData, combinedLenders, onSave, onClose }: DebtFormProps) {
    return (
        <div className="w-full h-full p-6 text-left relative flex flex-col z-10 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] uppercase">
                    {addFormData.transactionType === 'payback' ? 'Log Payback' : 'Log New Debt'}
                </h3>
                <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full ml-auto"><X size={16} /></Button>
            </div>

            <div className="flex flex-col gap-5 flex-1 pb-4">
                {/* Borrow / Payback toggle */}
                <div className="flex rounded-xl border border-white/10 overflow-hidden">
                    <button
                        onClick={() => setAddFormData(prev => ({ ...prev, transactionType: 'borrow' }))}
                        className={`flex-1 py-2.5 text-sm font-semibold tracking-wide transition-all ${addFormData.transactionType === 'borrow'
                            ? 'bg-rose-500/20 text-rose-400 border-r border-white/10'
                            : 'bg-white/[0.02] text-white/40 hover:bg-white/5 border-r border-white/10'
                            }`}
                    >
                        📉 Borrow
                    </button>
                    <button
                        onClick={() => setAddFormData(prev => ({ ...prev, transactionType: 'payback' }))}
                        className={`flex-1 py-2.5 text-sm font-semibold tracking-wide transition-all ${addFormData.transactionType === 'payback'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-white/[0.02] text-white/40 hover:bg-white/5'
                            }`}
                    >
                        📈 Payback
                    </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-white/60 text-xs mb-1">Lender</label>
                        <input type="text" value={addFormData.lender}
                            onChange={e => setAddFormData(prev => ({ ...prev, lender: e.target.value }))}
                            placeholder="e.g. Dad"
                            list="debt-lenders-list"
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                        <datalist id="debt-lenders-list">
                            {combinedLenders.map(l => <option key={l} value={l} />)}
                        </datalist>
                    </div>
                    <div className="flex-1">
                        <label className="block text-white/60 text-xs mb-1">Currency</label>
                        <CurrencySelector value={addFormData.currency} onChange={(val: string) => setAddFormData(prev => ({ ...prev, currency: val }))} />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-white/60 text-xs mb-1">Date</label>
                        <input type="date" value={addFormData.date} onChange={e => setAddFormData(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all [color-scheme:dark]" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-white/60 text-xs mb-1">Amount</label>
                        <input type="number" step="0.01" value={addFormData.amount} onChange={e => setAddFormData(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="0.00"
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-mono tabular-nums" />
                    </div>
                </div>

                <div>
                    <label className="block text-white/60 text-xs mb-1">Notes</label>
                    <input type="text" value={addFormData.obs} onChange={e => setAddFormData(prev => ({ ...prev, obs: e.target.value }))}
                        placeholder="Optional notes..."
                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                </div>

                <div className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={addFormData.isSalaryContribution || false}
                        onChange={e => setAddFormData(prev => ({ ...prev, isSalaryContribution: e.target.checked }))}
                        id="debt-salary-contribution-pane" className="w-4 h-4 accent-[#D4AF37]" />
                    <label htmlFor="debt-salary-contribution-pane" className="text-white text-sm cursor-pointer">Funded by Salary Contribution</label>
                </div>
            </div>

            <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-white/10 shrink-0">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={onSave}
                    style={{
                        background: addFormData.transactionType === 'payback'
                            ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                            : undefined
                    }}>
                    {addFormData.transactionType === 'payback' ? 'Confirm Payback' : 'Confirm'}
                </Button>
            </div>
        </div>
    );
}
