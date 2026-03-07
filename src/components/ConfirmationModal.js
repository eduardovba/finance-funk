"use client";

import React from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmationModal({ isOpen, title, message, onConfirm, onCancel }) {
    if (!isOpen) return null;

    const modalContent = (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
            }}
            onClick={onCancel}
        >
            <div
                className="glass-card"
                style={{
                    width: '90%',
                    maxWidth: '400px',
                    padding: '32px',
                    border: '1px solid var(--glass-border)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-gradient">{title}</h3>
                <p style={{ color: 'var(--fg-secondary)', margin: '16px 0 24px 0', lineHeight: '1.5' }}>
                    {message}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        className="btn-secondary"
                        style={{ padding: '10px 20px' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="btn-primary"
                        style={{
                            padding: '10px 20px',
                            backgroundColor: 'var(--error)',
                            borderColor: 'var(--error)'
                        }}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );

    // Use Portal to render directly to document.body,
    // escaping any parent CSS transforms (like PullToRefresh)
    // that would break position:fixed centering.
    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }

    return modalContent;
}
