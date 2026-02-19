import React, { useState, useEffect, useRef } from 'react';

export default function CurrencyPill({ rate, isLoading, lastUpdated }) {
    const [isOpen, setIsOpen] = useState(false);
    const pillRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pillRef.current && !pillRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formattedTime = lastUpdated ? lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--';

    return (
        <div
            ref={pillRef}
            style={{ position: 'relative' }}
        >
            <div style={{
                background: isOpen ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: '50px',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: isOpen ? '0 0 0 2px rgba(255,255,255,0.1)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                userSelect: 'none'
            }}
                onClick={() => setIsOpen(!isOpen)}
                onMouseEnter={(e) => {
                    if (!isOpen) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isOpen) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🇬🇧</span>
                    <span style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>GBP</span>
                </div>

                <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--accent-color)', fontSize: '1rem', fontWeight: '600', minWidth: '40px', textAlign: 'center' }}>
                        {isLoading ? (
                            <span className="pulse">...</span>
                        ) : (
                            rate.toFixed(2)
                        )}
                    </span>
                    <span style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>BRL</span>
                    <span style={{ fontSize: '1.2rem' }}>🇧🇷</span>
                </div>

                <style jsx>{`
                @keyframes pulse {
                    0% { opacity: 0.5; }
                    50% { opacity: 1; }
                    100% { opacity: 0.5; }
                }
                .pulse {
                    animation: pulse 1.5s infinite ease-in-out;
                }
            `}</style>
            </div>

            {/* Popup Box */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '115%',
                    right: 0,
                    width: '220px',
                    background: 'rgba(20, 20, 20, 0.95)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    padding: '16px',
                    zIndex: 1000,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                            Data Source
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--fg-primary)', fontWeight: '500' }}>
                            <span style={{ fontSize: '1.1rem' }}>📈</span> Google Finance
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                            Last Updated
                        </div>
                        <div style={{ color: 'var(--fg-primary)', fontWeight: '500' }}>
                            Today at {formattedTime}
                        </div>
                    </div>

                    <style jsx>{`
                        @keyframes fadeIn {
                            from { opacity: 0; transform: translateY(-8px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
