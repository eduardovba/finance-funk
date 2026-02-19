export default function Sidebar({ activeItem, onNavigate }) {
    const trackingItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'general-ledger', label: 'General Ledger', icon: '📒' },
        { id: 'forecast', label: 'Forecast', icon: '🔮' },
        { id: 'live-tracking', label: 'Live Tracking', icon: '📡' },
    ];

    const assetItems = [
        { id: 'fixed-income', label: 'Fixed Income', icon: '🏦' },
        { id: 'real-estate', label: 'Real Estate', icon: '🏠' },
        { id: 'equity', label: 'Equity', icon: '📈' },
        { id: 'crypto', label: 'Crypto', icon: '💎' },
        { id: 'pensions', label: 'Pensions', icon: '👴' },
        { id: 'debt', label: 'Debt', icon: '💸' },
    ];

    const renderGroup = (title, items) => (
        <div style={{ marginBottom: '24px' }}>
            <h3 style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                color: 'var(--fg-secondary)',
                marginBottom: '12px',
                paddingLeft: '16px',
                letterSpacing: '1px'
            }}>
                {title}
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {items.map(item => (
                    <li key={item.id} style={{ marginBottom: '4px' }}>
                        <button
                            onClick={() => onNavigate(item.id)}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                background: activeItem === item.id ? 'var(--bg-accent)' : 'transparent',
                                color: activeItem === item.id ? 'var(--fg-primary)' : 'var(--fg-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 16px',
                                fontSize: '0.9rem',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (activeItem !== item.id) {
                                    e.currentTarget.style.color = 'var(--fg-primary)';
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeItem !== item.id) {
                                    e.currentTarget.style.color = 'var(--fg-secondary)';
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            <span>{item.icon}</span>
                            {item.label}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );

    return (
        <aside className="glass-card" style={{
            height: 'calc(100vh - 64px)',
            width: '260px',
            position: 'sticky',
            top: '32px',
            padding: '24px',
            flexShrink: 0,
            overflowY: 'auto'
        }}>
            <div style={{ marginBottom: '32px', paddingLeft: '8px' }}>
                <h2 className="text-gradient" style={{ fontSize: '1.5rem', margin: 0 }}>Finance Tracker</h2>
            </div>

            <nav>
                {renderGroup('Tracking', trackingItems)}
                {renderGroup('Assets', assetItems)}
            </nav>
        </aside>
    );
}
