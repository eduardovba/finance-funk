"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

function generateConfetti(count = 40) {
    const colors = ['#D4AF37', '#E5C349', '#CC5500', '#F5F5DC', '#B8962E', '#FFD700'];
    const shapes = ['circle', 'square', 'strip'];
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        size: 4 + Math.random() * 8,
        delay: Math.random() * 0.8,
        duration: 1.5 + Math.random() * 2,
        rotation: Math.random() * 360,
        drift: -30 + Math.random() * 60,
    }));
}

export default function CelebrationOverlay({ 
    title,
    subtitle,
    metric,
    ctaLabel,
    onDismiss,
    autoDismissMs = 6000,
}) {
    const [confetti] = useState(() => generateConfetti(50));
    const [visible, setVisible] = useState(true);

    const handleDismiss = useCallback(() => {
        setVisible(false);
        setTimeout(() => onDismiss?.(), 400);
    }, [onDismiss]);

    useEffect(() => {
        if (autoDismissMs > 0) {
            const timer = setTimeout(handleDismiss, autoDismissMs);
            return () => clearTimeout(timer);
        }
    }, [autoDismissMs, handleDismiss]);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto"
                >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                    {/* Confetti */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {confetti.map(p => (
                            <motion.div
                                key={p.id}
                                initial={{ opacity: 1, y: -20, x: `${p.x}vw`, rotate: 0, scale: 1 }}
                                animate={{
                                    y: '110vh',
                                    x: `${p.x + p.drift}vw`,
                                    rotate: p.rotation + 720,
                                    opacity: [1, 1, 0],
                                    scale: [1, 1, 0.5],
                                }}
                                transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
                                className="absolute top-0"
                                style={{
                                    width: p.shape === 'strip' ? p.size * 0.4 : p.size,
                                    height: p.shape === 'strip' ? p.size * 2.5 : p.size,
                                    backgroundColor: p.color,
                                    borderRadius: p.shape === 'circle' ? '50%' : '2px',
                                }}
                            />
                        ))}
                    </div>

                    {/* Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="relative z-10 bg-gradient-to-br from-[#1A0F2E] to-[#0B0611] border border-[#D4AF37]/40 rounded-3xl p-8 max-w-md mx-4 shadow-2xl shadow-[#D4AF37]/20 text-center"
                    >
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border-2 border-[#D4AF37]/50 shadow-lg shadow-[#D4AF37]/20">
                            <Image src="/ftue/funk-master-celebrating.png" alt="Professor F celebrating" width={80} height={80} className="object-cover" />
                        </div>

                        <h2 className="text-2xl font-bebas tracking-wider text-[#D4AF37] mb-2">{title}</h2>
                        <p className="text-sm text-[#F5F5DC]/60 font-space leading-relaxed mb-4">{subtitle}</p>

                        {metric && (
                            <div className="mb-5 py-3 px-4 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl inline-block">
                                <span className="text-[0.7rem] uppercase tracking-[3px] text-[#D4AF37]/60 font-space block mb-1">{metric.label}</span>
                                <span className="text-2xl font-bebas tracking-wider text-[#D4AF37]">{metric.value}</span>
                            </div>
                        )}

                        <div>
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={handleDismiss}
                                className="px-8 py-3 rounded-xl font-space text-sm tracking-wide font-bold bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0B0611] hover:shadow-lg hover:shadow-[#D4AF37]/20 border-none cursor-pointer transition-all duration-300"
                            >
                                {ctaLabel || '🎸 Keep Going!'}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
