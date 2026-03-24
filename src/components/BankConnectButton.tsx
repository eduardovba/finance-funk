'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { createConnectToken, syncItem } from '@/app/actions/pluggy-sync';

const PluggyConnect = dynamic(
    () => import('react-pluggy-connect').then((mod) => mod.PluggyConnect),
    { ssr: false }
);

export default function BankConnectButton() {
    const [loading, setLoading] = useState(false);
    const [connectToken, setConnectToken] = useState<string | null>(null);

    const handleConnectTrigger = async () => {
        setLoading(true);
        try {
            const { token } = await createConnectToken();
            setConnectToken(token);
        } catch (error) {
            console.error('Connect Token Error:', error);
            alert('Failed to initialize bank connection.');
            setLoading(false);
        }
    };

    const handleSuccess = async (data: any) => {
        console.log('Success!', data.item);
        try {
            const result = await syncItem(data.item.id);
            if (result.error) {
                alert(`Sync failed: ${result.error}`);
            } else {
                // Automatically refresh the page to show new data
                window.location.reload();
            }
        } catch (err) {
            console.error('Sync error after connection:', err);
        } finally {
            setConnectToken(null);
            setLoading(false);
        }
    };

    const handleError = (error: any) => {
        console.error('Pluggy Error:', error);
        setConnectToken(null);
        setLoading(false);
    };

    const handleClose = () => {
        setConnectToken(null);
        setLoading(false);
    };

    return (
        <>
            {connectToken && (
                <PluggyConnect
                    connectToken={connectToken}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    onClose={handleClose}
                />
            )}

            <button
                onClick={handleConnectTrigger}
                disabled={loading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${loading
                    ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    }`}
            >
                {loading ? (
                    <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Connecting...
                    </>
                ) : (
                    <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Connect Bank (Open Finance)
                    </>
                )}
            </button>
        </>
    );
}
