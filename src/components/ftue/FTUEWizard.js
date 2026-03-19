"use client";

import React from 'react';
import { motion } from 'framer-motion';
import ProfessorF from './ProfessorF';

export default function FTUEWizard({ onTakeTour, onSkipTour }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center"
        >
            {/* Frosted backdrop — dashboard is visible behind */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Welcome Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 flex flex-col items-center text-center max-w-md mx-4"
            >
                {/* Logo */}
                <motion.img
                    src="/logos/ff-logo.png"
                    alt="Finance Funk"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="h-28 w-auto mb-1 drop-shadow-[0_0_30px_rgba(212,175,55,0.4)]"
                />
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-[#F5F5DC]/40 text-[0.75rem] uppercase tracking-[5px] font-space mb-6"
                >
                    Put some funk in your funds
                </motion.p>

                {/* Professor F */}
                <ProfessorF
                    pose="welcome"
                    size="lg"
                    message="Welcome to Finance Funk! Forget boring spreadsheets - you've just stepped into a smarter and groovier way to manage your money. Shall we do a quick tour?"
                />

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex flex-col sm:flex-row gap-3 mt-6 w-full max-w-sm"
                >
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onTakeTour}
                        className="flex-1 px-6 py-3.5 rounded-xl font-space text-sm tracking-wide font-bold transition-all duration-300
                            bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0B0611]
                            hover:shadow-lg hover:shadow-[#D4AF37]/20
                            flex flex-col items-center gap-0.5 border-none cursor-pointer"
                    >
                        <span>🎸 Show Me Around</span>
                        <span className="text-[0.75rem] font-normal opacity-60">Quick guided tour</span>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onSkipTour}
                        className="flex-1 px-6 py-3.5 rounded-xl font-space text-sm tracking-wide font-bold transition-all duration-300
                            border border-[#F5F5DC]/10 bg-white/[0.03] text-[#F5F5DC]/50
                            hover:bg-white/[0.06] hover:text-[#F5F5DC]/70
                            flex flex-col items-center gap-0.5 cursor-pointer"
                    >
                        <span>Skip, I&apos;ll figure it out</span>
                        <span className="text-[0.75rem] font-normal opacity-40">Dive right in</span>
                    </motion.button>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}
