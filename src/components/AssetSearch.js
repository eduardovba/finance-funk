import React, { useState, useEffect, useRef } from 'react';

export default function AssetSearch({ onSelect }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                fetchResults();
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchResults = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/search-assets?q=${encodeURIComponent(query)}`);
            const data = await res.json();

            let searchResults = data.results || [];

            // Inject "Cash" option if query matches "cash"
            if ('cash'.includes(query.toLowerCase())) {
                searchResults = [
                    { symbol: 'CASH', name: 'Cash', exchange: 'Currency' },
                    ...searchResults
                ];
            }

            setResults(searchResults);
            setIsOpen(true);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = (asset) => {
        onSelect(asset);
        setQuery('');
        setResults([]);
        setIsOpen(false);
    };

    return (
        <div ref={searchRef} style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                    placeholder="Search for stocks, crypto (e.g., AAPL, PETR4, BTC)..."
                    style={{
                        width: '100%',
                        padding: '16px 24px',
                        paddingLeft: '48px',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.2s'
                    }}
                />
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                {isLoading && (
                    <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '0.8rem' }}>
                        Loading...
                    </span>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="glass-card" style={{
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    right: 0,
                    padding: '8px',
                    zIndex: 100,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid var(--glass-border)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                }}>
                    {results.map((asset) => (
                        <div
                            key={asset.symbol}
                            onClick={() => handleSelect(asset)}
                            style={{
                                padding: '12px 16px',
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr auto',
                                gap: '12px',
                                alignItems: 'center',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <span style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>{asset.symbol}</span>
                            <span style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.name}</span>
                            <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--fg-secondary)' }}>
                                {asset.exchange}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
