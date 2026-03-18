import React from 'react';
import _ConfirmationModal from '../ConfirmationModal';
const ConfirmationModal = _ConfirmationModal as any;

interface LedgerModalsProps {
    editingRow: any;
    editForm: Record<string, any>;
    isSaving: boolean;
    deleteMonth: string | null;
    deleteLedgerMonth: string | null;
    setEditingRow: (r: any) => void;
    setEditForm: (fn: any) => void;
    handleEditSave: () => void;
    handleDeleteSnapshot: () => void;
    handleDeleteLedgerData: () => void;
    setDeleteMonth: (m: string | null) => void;
    setDeleteLedgerMonth: (m: string | null) => void;
}

export default function LedgerModals({
    editingRow, editForm, isSaving, deleteMonth, deleteLedgerMonth,
    setEditingRow, setEditForm, handleEditSave, handleDeleteSnapshot, handleDeleteLedgerData,
    setDeleteMonth, setDeleteLedgerMonth,
}: LedgerModalsProps) {
    return (
        <>
            {/* Edit Modal */}
            {editingRow && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setEditingRow(null)} />
                    <div className="rounded-2xl bg-[#121418]/90 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)]" style={{ position: 'relative', zIndex: 1, padding: '32px', width: '90%', maxWidth: '500px' }}>
                        <h3 className="text-gradient" style={{ marginBottom: '24px' }}>
                            Edit {editingRow.type === 'income' ? 'Income' : editingRow.type === 'investments' ? 'Investments' : 'Snapshot'} — {editingRow.month}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {Object.entries(editForm).map(([key, value]) => (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <label style={{ color: 'var(--fg-secondary)', flex: '0 0 140px', fontSize: '0.9rem', textTransform: 'capitalize' }}>
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </label>
                                    <input
                                        type="number" step="0.01" value={value as number}
                                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                                        style={{
                                            flex: 1, padding: '10px 12px', borderRadius: '8px',
                                            border: '1px solid var(--glass-border)',
                                            background: 'rgba(255,255,255,0.05)',
                                            color: 'var(--fg-primary)', fontSize: '0.95rem'
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                            <button onClick={() => setEditingRow(null)} className="btn-secondary" style={{ padding: '10px 20px' }}>Cancel</button>
                            <button onClick={handleEditSave} className="btn-primary" style={{ padding: '10px 20px' }} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!deleteMonth}
                title="Delete Snapshot"
                message={`Are you sure you want to delete the snapshot for ${deleteMonth}? This action cannot be undone.`}
                onConfirm={handleDeleteSnapshot}
                onCancel={() => setDeleteMonth(null)}
            />

            <ConfirmationModal
                isOpen={!!deleteLedgerMonth}
                title="Delete Ledger Record"
                message={`Are you sure you want to delete the recorded income/investment data for ${deleteLedgerMonth}? This action cannot be undone.`}
                onConfirm={handleDeleteLedgerData}
                onCancel={() => setDeleteLedgerMonth(null)}
            />
        </>
    );
}
