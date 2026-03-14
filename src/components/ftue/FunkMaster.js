"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

const POSES = {
    welcome: '/ftue/funk-master-welcome.png',
    thinking: '/ftue/funk-master-thinking.png',
    celebrating: '/ftue/funk-master-celebrating.png',
};

export default function FunkMaster({ message, pose = 'welcome', size = 'md', animate = true }) {
    const sizeMap = {
        sm: { img: 80, bubble: 'text-xs', maxW: '200px' },
        md: { img: 180, bubble: 'text-sm', maxW: '320px' },
        lg: { img: 280, bubble: 'text-base', maxW: '400px' },
    };

    const s = sizeMap[size] || sizeMap.md;
    const imgSrc = POSES[pose] || POSES.welcome;

    return (
        <div className="flex flex-col items-center gap-3">
            {/* Speech Bubble */}
            {message && (
                <motion.div
                    initial={animate ? { opacity: 0, y: 10, scale: 0.9 } : false}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
                    className={`relative bg-gradient-to-br from-[#2A1F3D] to-[#1A0F2E] border border-[#D4AF37]/30 rounded-2xl px-5 py-3 shadow-lg shadow-[#D4AF37]/10 ${s.bubble}`}
                    style={{ maxWidth: s.maxW }}
                >
                    <p className="text-[#F5F5DC]/90 font-space leading-relaxed m-0 text-center">
                        {message}
                    </p>
                    {/* Triangle pointer */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#1A0F2E] border-b border-r border-[#D4AF37]/30 rotate-45" />
                </motion.div>
            )}

            {/* Mascot Image */}
            <motion.div
                initial={animate ? { opacity: 0, scale: 0.8 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative rounded-2xl overflow-hidden"
                style={{ width: s.img, height: s.img, background: 'radial-gradient(ellipse at center, rgba(26,15,46,0.9) 0%, transparent 80%)' }}
            >
                <Image
                    src={imgSrc}
                    alt="Funk Master"
                    width={s.img}
                    height={s.img}
                    className="object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                    style={{ mixBlendMode: 'normal' }}
                    priority
                />
            </motion.div>
        </div>
    );
}
