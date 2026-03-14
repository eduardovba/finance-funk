"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { usePortfolio } from '@/context/PortfolioContext';

const TUTORIAL_STEPS = [
    {
        targetId: 'ftue-hero',
        title: 'Your Command Center',
        message: "This is your financial command center — your total net worth at a glance, plus Month-over-Month performance and ROI. Everything starts here.",
        position: 'bottom',
    },
    {
        targetId: 'ftue-sidebar',
        mobileTargetId: 'ftue-sidebar-mobile',
        title: 'Asset Breakdown',
        message: "Each asset class gets its own card — equities, fixed income, real estate, crypto, pensions, and debt. Tap any card to drill into that category.",
        position: 'left',
    },
    {
        targetId: 'ftue-currency-pill',
        title: 'Currency Switcher',
        message: "Switch between your base currencies here. See your portfolio in BRL, GBP, USD — whatever you need.",
        position: 'bottom',
    },
    {
        targetId: 'ftue-charts',
        title: 'Visual Analytics',
        message: "Your portfolio over time — growth curves, allocation donuts, performance charts. Customize the layout to see what matters most.",
        position: 'top',
    },
    {
        targetId: 'ftue-tables',
        title: 'Position Details',
        message: "The nitty-gritty — every holding, every position, organized by asset class. This is where you see it all.",
        position: 'top',
    },
    {
        targetId: 'ftue-nav',
        mobileTargetId: 'ftue-nav-mobile',
        title: 'Navigation',
        message: "Use the menu to jump to specific asset pages, planning tools, forecasts, or the general ledger.",
        position: 'bottom',
    },
    {
        targetId: 'ftue-settings',
        mobileTargetId: 'ftue-settings-mobile',
        title: 'Profile & Settings',
        message: "Manage your profile, preferences, and account settings right here.",
        position: 'bottom-end',
    },
];

// Padding around the highlighted element
const SPOTLIGHT_PADDING = 12;
const SPOTLIGHT_RADIUS = 16;

export default function TutorialOverlay() {
    const { ftueState, updateFtueProgress, refreshAllData } = usePortfolio();
    const [currentStep, setCurrentStep] = useState(ftueState?.tutorialStep || 0);
    const [targetRect, setTargetRect] = useState(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [activeSteps, setActiveSteps] = useState([]);
    
    // Check if mobile (< 1024px)
    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
        const check = () => setIsMobile(window.innerWidth < 1024);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Filter steps to those valid in the current viewport DOM
    useEffect(() => {
        if (!mounted || ftueState?.wizardCompleted !== true) return;
        
        // Short delay to let the page render properly
        const timer = setTimeout(() => {
            const isMob = window.innerWidth < 1024;
            const validSteps = TUTORIAL_STEPS.filter(step => {
                const elId = (isMob && step.mobileTargetId) ? step.mobileTargetId : step.targetId;
                const el = document.getElementById(elId);
                if (!el) return false;
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });
            setActiveSteps(validSteps);
            if (currentStep > validSteps.length) {
                setCurrentStep(validSteps.length); // clamp to end screen if bound exceeded
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [mounted, ftueState?.wizardCompleted, currentStep]);

    const observerRef = useRef(null);
    const totalSteps = activeSteps.length;
    // Show end screen only when we legitimately reach the end of the loaded step array
    const isLastTutorialStep = totalSteps > 0 && currentStep === totalSteps;

    // Measure the target element
    const measureTarget = useCallback((stepIndex) => {
        if (stepIndex >= totalSteps || activeSteps.length === 0) {
            setTargetRect(null);
            return;
        }
        const step = activeSteps[stepIndex];
        const isMob = window.innerWidth < 1024;
        const elId = (isMob && step.mobileTargetId) ? step.mobileTargetId : step.targetId;
        const el = document.getElementById(elId);
        if (el) {
            // Scroll into view smoothly
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            // Wait for scroll to settle, then measure
            setTimeout(() => {
                const rect = el.getBoundingClientRect();
                setTargetRect({
                    x: rect.x - SPOTLIGHT_PADDING,
                    y: rect.y - SPOTLIGHT_PADDING,
                    width: rect.width + SPOTLIGHT_PADDING * 2,
                    height: rect.height + SPOTLIGHT_PADDING * 2,
                });
            }, 400);
        } else {
            setTargetRect(null);
        }
    }, [totalSteps, activeSteps]);

    useEffect(() => {
        if (mounted && ftueState?.wizardCompleted === true) {
            measureTarget(currentStep);

            const handleResize = () => measureTarget(currentStep);
            window.addEventListener('resize', handleResize);
            window.addEventListener('scroll', handleResize, true);
            return () => {
                window.removeEventListener('resize', handleResize);
                window.removeEventListener('scroll', handleResize, true);
            };
        }
    }, [currentStep, measureTarget, mounted, ftueState?.wizardCompleted]);

    const goNext = useCallback(async () => {
        setIsTransitioning(true);
        const nextStep = currentStep + 1;
        if (nextStep >= totalSteps) {
            // They clicked "Next" on the very last step
            setCurrentStep(nextStep);
            await updateFtueProgress({ tutorialStep: nextStep });
            return;
        }
        setCurrentStep(nextStep);
        // Persist step
        await updateFtueProgress({ tutorialStep: nextStep });
        setTimeout(() => setIsTransitioning(false), 100);
    }, [currentStep, totalSteps, updateFtueProgress]);

    const skipTour = useCallback(async () => {
        // Jump to the end screen
        setCurrentStep(totalSteps);
        await updateFtueProgress({ tutorialStep: totalSteps });
    }, [totalSteps, updateFtueProgress]);

    const handleImportData = useCallback(async () => {
        await updateFtueProgress({
            isTutorialActive: false,
            tutorialStep: 0,
            usingDemoData: false,
            wizardCompleted: true,
            showCurrencyPicker: true,
        });
        await refreshAllData();
    }, [updateFtueProgress, refreshAllData]);

    const handleKeepExploring = useCallback(async () => {
        await updateFtueProgress({
            isTutorialActive: false,
            tutorialStep: 0,
            wizardCompleted: true,
            showCurrencyPicker: true,
        });
    }, [updateFtueProgress]);

    // Tooltip positioning — viewport-clamped to prevent clipping
    const TOOLTIP_WIDTH = 340; // approximate rendered width
    const VIEWPORT_MARGIN = 16;

    const getTooltipStyle = () => {
        if (!targetRect || activeSteps.length === 0) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        const step = activeSteps[currentStep];
        if (!step) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

        const pos = step.position || 'bottom';
        const gap = 16;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let top, left;

        // Calculate ideal position
        switch (pos) {
            case 'top':
                top = targetRect.y - gap - 180; // approximate tooltip height
                left = targetRect.x + targetRect.width / 2 - TOOLTIP_WIDTH / 2;
                break;
            case 'left':
                top = targetRect.y + targetRect.height / 2 - 90;
                left = targetRect.x - gap - TOOLTIP_WIDTH;
                break;
            case 'right':
                top = targetRect.y + targetRect.height / 2 - 90;
                left = targetRect.x + targetRect.width + gap;
                break;
            case 'bottom-end':
                top = targetRect.y + targetRect.height + gap;
                left = targetRect.x + targetRect.width - TOOLTIP_WIDTH;
                break;
            case 'bottom':
            default:
                top = targetRect.y + targetRect.height + gap;
                left = targetRect.x + targetRect.width / 2 - TOOLTIP_WIDTH / 2;
                break;
        }

        // --- Mobile Specific Positioning ---
        if (window.innerWidth < 1024) {
            // Check if target is in the top half of the screen
            const isTargetTopHalf = targetRect.y + (targetRect.height / 2) < vh / 2;
            
            return {
                position: 'fixed',
                left: VIEWPORT_MARGIN,
                right: VIEWPORT_MARGIN,
                width: 'auto',
                maxWidth: 'none',
                ...(isTargetTopHalf 
                    ? { bottom: VIEWPORT_MARGIN + 64, top: 'auto', transform: 'none' } // Bottom sheet (above nav)
                    : { top: VIEWPORT_MARGIN + 64, bottom: 'auto', transform: 'none' } // Top sheet
                )
            };
        }

        // --- Desktop Positioning ---
        // Clamp to viewport
        left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - TOOLTIP_WIDTH - VIEWPORT_MARGIN));
        top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - 200)); // 200 ~ tooltip height

        return { top, left, width: TOOLTIP_WIDTH };
    };

    // ─── END SCREEN: Import Data / Keep Exploring ───
    // Don't render until client mounts or if wizard isn't completed
    if (!mounted || ftueState?.wizardCompleted !== true) return null;

    if (isLastTutorialStep) {
        return createPortal((
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[9998] flex items-center justify-center"
            >
                {/* Dark backdrop */}
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

                {/* End card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-10 bg-gradient-to-br from-[#1A0F2E] to-[#0B0611] border border-[#D4AF37]/30 rounded-3xl p-8 max-w-md mx-4 shadow-2xl shadow-[#D4AF37]/10"
                >
                    <div className="flex flex-col items-center text-center gap-5">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#D4AF37]/40 shadow-lg shadow-[#D4AF37]/20">
                            <Image
                                src="/ftue/funk-master-celebrating.png"
                                alt="Professor F"
                                width={96}
                                height={96}
                                className="object-cover"
                            />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bebas tracking-wider text-[#D4AF37] mb-2">
                                That&apos;s the Tour!
                            </h2>
                            <p className="text-sm text-[#F5F5DC]/60 font-space leading-relaxed">
                                You&apos;ve seen the highlights. Ready to bring your own data in, or keep exploring with demo data?
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={handleImportData}
                                className="flex-1 px-5 py-3.5 rounded-xl font-space text-sm tracking-wide font-bold transition-all duration-300
                                    bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0B0611]
                                    hover:shadow-lg hover:shadow-[#D4AF37]/20
                                    flex flex-col items-center gap-0.5"
                            >
                                <span>🎸 Import My Data</span>
                                <span className="text-[10px] font-normal opacity-60">Start with your real portfolio</span>
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={handleKeepExploring}
                                className="flex-1 px-5 py-3.5 rounded-xl font-space text-sm tracking-wide font-bold transition-all duration-300
                                    border border-[#D4AF37]/30 bg-[#D4AF37]/[0.05] text-[#D4AF37]
                                    hover:bg-[#D4AF37]/[0.1] hover:border-[#D4AF37]/50
                                    flex flex-col items-center gap-0.5"
                            >
                                <span>🎧 Keep Exploring</span>
                                <span className="text-[10px] font-normal opacity-40">Stay with demo data</span>
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        ), document.body);
    }

    const step = activeSteps[currentStep];
    if (!step) return null;

    const tooltipStyle = getTooltipStyle();

    const content = (
        <div className="fixed inset-0 z-[9998] pointer-events-none">
            {/* SVG Mask Overlay */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-auto"
                style={{ cursor: 'default' }}
            >
                <defs>
                    <mask id="spotlight-mask">
                        {/* White = visible (dark overlay shows) */}
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {/* Black = hidden (spotlight cutout) */}
                        {targetRect && (
                            <motion.rect
                                initial={{ opacity: 0 }}
                                animate={{
                                    x: targetRect.x,
                                    y: targetRect.y,
                                    width: targetRect.width,
                                    height: targetRect.height,
                                    opacity: 1,
                                }}
                                transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                                rx={SPOTLIGHT_RADIUS}
                                ry={SPOTLIGHT_RADIUS}
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                {/* Semi-transparent overlay with mask cutout */}
                <rect
                    x="0" y="0"
                    width="100%" height="100%"
                    fill="rgba(0, 0, 0, 0.65)"
                    mask="url(#spotlight-mask)"
                />
            </svg>

            {/* Glow ring around spotlight */}
            {targetRect && (
                <motion.div
                    className="absolute pointer-events-none rounded-2xl"
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: 1,
                        left: targetRect.x,
                        top: targetRect.y,
                        width: targetRect.width,
                        height: targetRect.height,
                    }}
                    transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                    style={{
                        boxShadow: '0 0 0 2px rgba(212,175,55,0.4), 0 0 30px rgba(212,175,55,0.15)',
                        borderRadius: SPOTLIGHT_RADIUS,
                    }}
                />
            )}

            {/* Tooltip Card */}
            <AnimatePresence mode="wait">
                {step && (
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                        className="absolute z-10 pointer-events-auto"
                        style={tooltipStyle}
                    >
                        <div className="bg-gradient-to-br from-[#1A0F2E] to-[#0B0611] border border-[#D4AF37]/30 rounded-2xl p-5 shadow-2xl shadow-black/50">
                            {/* Professor F mini avatar + step title */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-[#D4AF37]/40 shrink-0 bg-[#D4AF37]/10">
                                    <Image
                                        src="/ftue/funk-master-avatar.png"
                                        alt="Professor F"
                                        width={40}
                                        height={40}
                                        className="object-cover"
                                    />
                                </div>
                                <div>
                                    <h3 className="text-[#D4AF37] font-space font-bold text-sm m-0">{step.title}</h3>
                                    <span className="text-[9px] text-[#F5F5DC]/30 font-space uppercase tracking-[2px]">
                                        Step {currentStep + 1} of {totalSteps}
                                    </span>
                                </div>
                            </div>

                            <p className="text-[13px] text-[#F5F5DC]/70 font-space leading-relaxed m-0 mb-4">
                                {step.message}
                            </p>

                            {/* Controls */}
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={skipTour}
                                    className="text-[11px] text-[#F5F5DC]/30 hover:text-[#F5F5DC]/60 font-space tracking-wide uppercase transition-colors bg-transparent border-none cursor-pointer"
                                >
                                    Skip Tour
                                </button>

                                {/* Step dots */}
                                <div className="flex gap-1.5">
                                    {Array.from({ length: totalSteps }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1 rounded-full transition-all duration-300 ${
                                                i === currentStep
                                                    ? 'bg-[#D4AF37] w-5'
                                                    : i < currentStep
                                                    ? 'bg-[#D4AF37]/40 w-2'
                                                    : 'bg-white/10 w-2'
                                            }`}
                                        />
                                    ))}
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={goNext}
                                    className="px-4 py-1.5 rounded-lg font-space text-[11px] tracking-wide font-bold transition-all duration-300
                                        bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0B0611]
                                        hover:shadow-md hover:shadow-[#D4AF37]/20 border-none cursor-pointer"
                                >
                                    {currentStep === totalSteps - 1 ? "Finish" : "Next →"}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    return createPortal(content, document.body);
}
