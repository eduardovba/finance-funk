import React, { useState, useEffect } from 'react';
import DebtTransactionForm from './DebtTransactionForm';
import ConfirmationModal from './ConfirmationModal';

export default function DebtTab({ transactions = [], rates = { GBP: 1, BRL: 7.20 }, onRefresh }) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState(null);

    // Sorting transactions by date (descending)
    const sortedTransactions = [...transactions].sort((a, b) => {
        // Handle both DD/MM/YYYY and YYYY-MM-DD
        const parse = (d) => {
            if (!d) return new Date(0);
            if (d.includes('-')) return new Date(d);
            const [day, month, year] = d.split('/').map(Number);
            return new Date(year, month - 1, day);
        };
        return parse(b.date) - parse(a.date);
    });

    // Compute Summary by Lender
    const summary = sortedTransactions.reduce((acc, t) => {
        const lender = t.lender || 'Unknown';
        if (!acc[lender]) {
            acc[lender] = { lender: lender, totalBrl: 0, totalGbp: 0 };
        }
        acc[lender].totalBrl += (t.value_brl || 0);
        // Fallback for GBP if missing
        const gbp = t.value_gbp || (t.value_brl / (rates.BRL || 7.2));
        acc[lender].totalGbp += gbp;
        return acc;
    }, {});

    const summaryList = Object.values(summary);

    // Helper for currency formatting
    const formatCurrency = (value, currency) => {
        return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-GB', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(value);
    };

    const handleSaveTransaction = async (formData) => {
        try {
            const method = formData.id ? 'PUT' : 'POST';
            const res = await fetch('/api/debt-transactions', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                if (onRefresh) onRefresh();
                setIsFormOpen(false);
                setEditingTransaction(null);
            }
        } catch (error) {
            console.error('Failed to save transaction:', error);
        }
    };

    const handleDeleteClick = (id) => {
        setTransactionToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!transactionToDelete) return;
        try {
            const res = await fetch(`/api/debt-transactions?id=${transactionToDelete}`, { method: 'DELETE' });
            if (res.ok) {
                if (onRefresh) onRefresh();
                setIsDeleteModalOpen(false);
                setTransactionToDelete(null);
            }
        } catch (error) {
            console.error('Failed to delete transaction:', error);
        }
    };

    const handleEditClick = (transaction) => {
        setEditingTransaction(transaction);
        setIsFormOpen(true);
    };

    const handleAddClick = () => {
        setEditingTransaction(null);
        setIsFormOpen(true);
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 className="text-gradient" style={{ fontSize: '2.2rem', marginBottom: '32px', textAlign: 'center' }}>Debt Portfolio</h2>

            {/* Summary Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '48px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div style={{
                    padding: '20px 24px', borderBottom: '1px solid var(--glass-border)',
                    background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.05) 0%, rgba(255,255,255,0) 100%)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Total Debt</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '12px 24px', textAlign: 'left', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Lender</th>
                            <th style={{ padding: '12px 24px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>BRL</th>
                            <th style={{ padding: '12px 24px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>GBP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {summaryList.map((item) => (
                            <tr key={item.lender} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '14px 24px', fontWeight: 600 }}>{item.lender}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.totalBrl, 'BRL')}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(item.totalGbp, 'GBP')}</td>
                            </tr>
                        ))}
                        {summaryList.length === 0 && (
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: 'var(--fg-secondary)' }}>No debt records found.</td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                            <td style={{ padding: '14px 24px', fontWeight: 700, color: 'white' }}>TOTAL</td>
                            <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 700, color: 'white' }}>
                                {formatCurrency(summaryList.reduce((sum, item) => sum + item.totalBrl, 0), 'BRL')}
                            </td>
                            <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 700, color: 'white' }}>
                                {formatCurrency(summaryList.reduce((sum, item) => sum + item.totalGbp, 0), 'GBP')}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Ledger Table */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
                <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Transaction Ledger</h3>
                <button
                    onClick={handleAddClick}
                    className="btn-primary"
                    style={{ fontSize: '0.9rem' }}
                >
                    + Add Transaction
                </button>
            </div>

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '12px 24px', textAlign: 'left', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Date</th>
                            <th style={{ padding: '12px 24px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>BRL</th>
                            <th style={{ padding: '12px 24px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>GBP</th>
                            <th style={{ padding: '12px 24px', textAlign: 'left', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Lender</th>
                            <th style={{ padding: '12px 24px', textAlign: 'left', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Obs</th>
                            <th style={{ padding: '12px 24px', textAlign: 'center', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedTransactions.map((t) => (
                            <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }} className="ledger-row">
                                <td style={{ padding: '14px 24px', color: 'var(--fg-secondary)' }}>{t.date}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(t.value_brl, 'BRL')}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(t.value_gbp || (t.value_brl / rates.BRL), 'GBP')}</td>
                                <td style={{ padding: '14px 24px' }}>
                                    <span style={{
                                        display: 'inline-block', padding: '4px 12px', borderRadius: '12px',
                                        backgroundColor: 'rgba(255,255,255,0.1)', fontSize: '0.85rem'
                                    }}>
                                        {t.lender}
                                    </span>
                                </td>
                                <td style={{ padding: '14px 24px', color: 'var(--fg-secondary)', fontSize: '0.9rem' }}>{t.obs}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                        <button
                                            onClick={() => handleEditClick(t)}
                                            className="btn-icon btn-edit"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(t.id)}
                                            className="btn-icon btn-delete"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {sortedTransactions.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--fg-secondary)' }}>No transactions recorded.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isFormOpen && (
                <DebtTransactionForm
                    onSave={handleSaveTransaction}
                    onCancel={() => setIsFormOpen(false)}
                    initialData={editingTransaction}
                    rates={rates}
                />
            )
            }

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Delete Transaction"
                message="Are you sure you want to delete this debt entry? This action cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
            />

        </div >
    );
}
