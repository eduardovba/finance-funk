'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error('App error:', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md"
            >
                <div className="text-5xl mb-4">🎸</div>
                <h2 className="text-xl font-bebas tracking-wider text-[#D4AF37] mb-2">
                    Hit a Wrong Note
                </h2>
                <p className="text-sm text-[#F5F5DC]/60 font-space mb-6">
                    Something went wrong. Don&apos;t worry — your data is safe.
                </p>
                <button
                    onClick={reset}
                    className="px-6 py-3 rounded-xl font-space text-sm font-bold bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0B0611] hover:shadow-lg hover:shadow-[#D4AF37]/20 border-none cursor-pointer transition-all"
                >
                    Try Again
                </button>
            </motion.div>
        </div>
    );
}
