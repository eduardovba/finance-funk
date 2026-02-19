import { formatCurrency } from "@/lib/currency";

export default function ConsolidatedAssetTable({ title, assets, rates }) {
    // assets should be an array of objects: { name, brl, gbp, investmentGBP, roi, isTotal }

    return (
        <section style={{ marginTop: '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--fg-primary)' }}>{title}</h3>
            </div>
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '16px', color: 'var(--fg-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>Asset</th>
                            <th style={{ padding: '16px', color: 'var(--fg-secondary)', fontSize: '0.9rem', fontWeight: 500, textAlign: 'right' }}>Value (BRL)</th>
                            <th style={{ padding: '16px', color: 'var(--fg-secondary)', fontSize: '0.9rem', fontWeight: 500, textAlign: 'right' }}>Value (GBP)</th>
                            <th style={{ padding: '16px', color: 'var(--fg-secondary)', fontSize: '0.9rem', fontWeight: 500, textAlign: 'right' }}>Net Invest (GBP)</th>
                            <th style={{ padding: '16px', color: 'var(--fg-secondary)', fontSize: '0.9rem', fontWeight: 500, textAlign: 'right' }}>ROI %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map((asset, index) => {
                            const isTotal = asset.isTotal;
                            const rowStyle = isTotal
                                ? { backgroundColor: 'rgba(16, 185, 129, 0.05)', fontWeight: 'bold' }
                                : { borderBottom: '1px solid rgba(255,255,255,0.05)' };

                            const nameStyle = isTotal ? { padding: '14px 16px', fontWeight: 700 } : { padding: '14px 16px', fontWeight: 600 };

                            return (
                                <tr key={index} style={rowStyle}>
                                    <td style={nameStyle}>{asset.name}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                        {formatCurrency(asset.brl, 'BRL')}
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right', color: isTotal ? 'var(--fg-primary)' : 'var(--fg-secondary)' }}>
                                        {formatCurrency(asset.gbp, 'GBP')}
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right', color: isTotal ? 'var(--fg-primary)' : 'var(--fg-secondary)' }}>
                                        {formatCurrency(asset.investmentGBP, 'GBP')}
                                    </td>
                                    <td style={{
                                        padding: '14px 16px',
                                        textAlign: 'right',
                                        color: asset.roi >= 0 ? 'var(--accent-color)' : 'var(--error)',
                                        fontWeight: 600
                                    }}>
                                        {asset.roi !== null && asset.roi !== undefined ? (
                                            <>
                                                {asset.roi >= 0 ? '+' : ''}{asset.roi.toFixed(1)}%
                                            </>
                                        ) : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
