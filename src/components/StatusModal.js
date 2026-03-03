import React from 'react';

export default function StatusModal({ isOpen, title, message, type = 'success', onClose }) {
    if (!isOpen) return null;

    const isSuccess = type === 'success';

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-card">
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: isSuccess ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        margin: '0 auto 24px'
                    }}>
                        {isSuccess ? '✅' : '❌'}
                    </div>

                    <h3 className="text-gradient" style={{ marginBottom: '12px' }}>{title}</h3>
                    <p style={{ color: 'var(--fg-secondary)', marginBottom: '32px', lineHeight: '1.5' }}>
                        {message}
                    </p>

                    <button
                        onClick={onClose}
                        className="btn-primary"
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: isSuccess ? 'var(--accent-color)' : 'var(--error)',
                            borderColor: isSuccess ? 'var(--accent-color)' : 'var(--error)',
                            color: 'white',
                            fontWeight: '600'
                        }}
                    >
                        Great!
                    </button>
                </div>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    animation: fadeIn 0.2s ease-out;
                }
                .modal-content {
                    width: 90%;
                    max-width: 360px;
                    padding: 40px;
                    border: 1px solid var(--glass-border);
                    box-shadow: 0 32px 64px rgba(0, 0, 0, 0.4);
                    animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
