import { formatCurrency } from "@/lib/currency";
import { Card } from '@/components/ui/card';

export default function AssetTable({ title, assets, rates }: { title: string; assets: any[]; rates?: any }) {
    return (
        <section style={{ marginTop: '48px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2>{title}</h2>
            </div>
            <Card style={{ padding: '0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <th style={{ padding: '16px', color: 'var(--fg-secondary)' }}>Asset</th>
                            <th style={{ padding: '16px', color: 'var(--fg-secondary)' }}>BRL</th>
                            <th style={{ padding: '16px', color: 'var(--fg-secondary)' }}>GBP</th>
                            <th style={{ padding: '16px', color: 'var(--fg-secondary)' }}>USD</th>
                            <th style={{ padding: '16px', color: 'var(--fg-secondary)' }}>ROI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map((asset, index) => (
                            <tr
                                key={index}
                                style={{
                                    borderBottom: index === assets.length - 1 ? 'none' : '1px solid var(--glass-border)',
                                    backgroundColor: asset.isTotal ? 'rgba(255,255,255,0.03)' : 'transparent',
                                    fontWeight: asset.isTotal ? '700' : '400'
                                }}
                            >
                                <td style={{ padding: '16px' }}>{asset.name}</td>
                                <td style={{ padding: '16px' }}>{formatCurrency(asset.brl, 'BRL')}</td>
                                <td style={{ padding: '16px' }}>{formatCurrency(asset.gbp, 'GBP')}</td>
                                <td style={{ padding: '16px' }}>{formatCurrency(asset.usd, 'USD')}</td>
                                <td style={{
                                    padding: '16px',
                                    color: asset.roi >= 0 ? 'var(--accent-color)' : 'var(--error)'
                                }}>
                                    {asset.roi !== null ? `${asset.roi.toFixed(1)}%` : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </section>
    );
}
