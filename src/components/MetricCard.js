import { formatCurrency, convertCurrency } from "@/lib/currency";

export default function MetricCard({ title, amount, percentage, diffAmount, currency = 'BRL', rates, invertColor = false, isLoading = false }) {
    const isActuallyPositive = (percentage || 0) >= 0;
    const isPositiveForColor = invertColor ? !isActuallyPositive : isActuallyPositive;

    // We assume 'amount' passed in is already in the 'currency' passed in (which should be BRL now)
    // Secondary currency: if main is BRL, secondary is GBP.
    const secondaryCurrency = 'GBP';
    // If incoming currency is BRL, we convert TO GBP.
    const secondaryValue = calculateSecondaryValue(amount, currency, secondaryCurrency, rates);

    function calculateSecondaryValue(amt, from, to, r) {
        if (!r) return 0;
        // Basic conversion logic roughly matching lib/currency but inline for clarity or reuse lib if possible.
        // We know rates is { BRL: 7.10, USD: 1.28 } (Base GBP)
        if (from === 'BRL' && to === 'GBP') return amt / r.BRL;
        if (from === 'GBP' && to === 'BRL') return amt * r.BRL;
        return 0;
    }

    return (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
                <h3 style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem', marginBottom: '8px', letterSpacing: '0.02em' }}>{title}</h3>
                <p style={{ fontSize: '2rem', fontWeight: '600', color: 'var(--fg-primary)', opacity: isLoading ? 0.3 : 1 }}>
                    {isLoading ? '---' : formatCurrency(amount, currency)}
                </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', fontSize: '0.85rem', alignItems: 'center' }}>
                <span style={{
                    color: isPositiveForColor ? 'var(--accent-color)' : 'var(--error)',
                    background: isPositiveForColor ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: '500'
                }}>
                    {isActuallyPositive ? '↑' : '↓'} {Math.abs(percentage || 0).toFixed(1)}%
                </span>
                <span style={{ color: 'var(--fg-secondary)', fontSize: '0.8rem' }}>
                    ({(diffAmount || 0) > 0 ? '+' : ''}{formatCurrency(diffAmount || 0, 'BRL').replace('R$', '')})
                </span>
                <span style={{ color: 'var(--fg-secondary)', marginLeft: 'auto', opacity: isLoading ? 0.3 : 1 }}>
                    {isLoading ? '---' : formatCurrency(secondaryValue, secondaryCurrency)}
                </span>
            </div>
        </div>
    );
}
