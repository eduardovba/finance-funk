import { useState } from 'react';
import { formatCurrency } from "@/lib/currency";

export default function TransactionLedger({
    transactions,
    rates,
    onAddClick,
    onDeleteClick,
    onEditClick,
    showPrincipal = false,
    hideAccount = false,
    collapsible = false
}) {
    const [isOpen, setIsOpen] = useState(!collapsible);
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedTransactions = [...transactions].sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'date') {
            valA = a.raw_date || a.date;
            valB = b.raw_date || b.date;
        }

        if (valA < valB) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
    };

    const headerStyle = { padding: '16px', color: 'var(--fg-secondary)', cursor: 'pointer', userSelect: 'none' };

    return (
        <section style={{ marginTop: '48px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div>
                        <h2>Transaction Ledger</h2>
                        {!collapsible && <span style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>All historical records</span>}
                    </div>
                    {collapsible && (
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            style={{
                                background: 'transparent', border: 'none', color: 'var(--fg-secondary)',
                                cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px', transition: 'color 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.color = 'var(--fg-primary)'}
                            onMouseOut={(e) => e.currentTarget.style.color = 'var(--fg-secondary)'}
                        >
                            {isOpen ? 'Hide' : 'Show'}
                            <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
                        </button>
                    )}
                </div>
                {onAddClick && (
                    <button
                        onClick={onAddClick}
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                        + Add Transaction
                    </button>
                )}
            </div>
            {isOpen && (
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} className="ledger-table">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <th style={headerStyle} onClick={() => handleSort('date')}>Date{getSortIndicator('date')}</th>
                                {!hideAccount && <th style={headerStyle} onClick={() => handleSort('account')}>Account{getSortIndicator('account')}</th>}
                                <th style={headerStyle} onClick={() => handleSort('investment')}>Investment{getSortIndicator('investment')}</th>
                                {showPrincipal && <th style={headerStyle} onClick={() => handleSort('principal')}>Principal{getSortIndicator('principal')}</th>}
                                <th style={headerStyle} onClick={() => handleSort('interest')}>Interest{getSortIndicator('interest')}</th>
                                <th style={headerStyle} onClick={() => handleSort('notes')}>Notes{getSortIndicator('notes')}</th>
                                <th style={{ padding: '16px', color: 'var(--fg-secondary)', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTransactions.map((tr, index) => {
                                const isNegative = typeof tr.investment === 'string' ? tr.investment.includes('-') : tr.investment < 0;
                                return (
                                    <tr
                                        key={tr.id || index}
                                        className="ledger-row"
                                        style={{
                                            borderBottom: '1px solid var(--glass-border)',
                                            position: 'relative'
                                        }}
                                    >
                                        <td style={{ padding: '16px' }}>{tr.date}</td>
                                        {!hideAccount && <td style={{ padding: '16px' }}>{tr.account}</td>}
                                        <td style={{
                                            padding: '16px',
                                            color: isNegative ? 'var(--error)' : 'var(--fg-primary)'
                                        }}>
                                            {formatCurrency(tr.investment, tr.currency || 'BRL')}
                                        </td>
                                        {showPrincipal && (
                                            <td style={{ padding: '16px', color: 'var(--accent-color)' }}>
                                                {tr.principal !== undefined ? formatCurrency(tr.principal, tr.currency || 'BRL') : '-'}
                                            </td>
                                        )}
                                        <td style={{ padding: '16px', color: 'var(--fg-primary)' }}>
                                            {tr.interest !== 0 ? formatCurrency(tr.interest, tr.currency || 'BRL') : '-'}
                                        </td>
                                        <td style={{ padding: '16px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>
                                            {tr.shares ? `${tr.shares} shares @ ${formatCurrency(tr.pricePerShare, tr.currency)}` : (tr.notes || '-')}
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                {onEditClick && (
                                                    <button
                                                        onClick={() => onEditClick(tr)}
                                                        className="btn-icon btn-edit"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                                {onDeleteClick && (
                                                    <button
                                                        onClick={() => onDeleteClick(tr.id)}
                                                        className="btn-icon btn-delete"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
