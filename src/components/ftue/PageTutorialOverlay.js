"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { usePortfolio } from '@/context/PortfolioContext';

const SPOTLIGHT_PADDING = 12;
const SPOTLIGHT_RADIUS = 16;
const TOOLTIP_WIDTH = 360;
const TOOLTIP_HEIGHT_ESTIMATE = 220; // generous estimate for tooltip card height
const VIEWPORT_MARGIN = 16;

/**
 * PageTutorialOverlay — reusable tutorial overlay for individual pages.
 * Same SVG spotlight + Professor F card pattern as the dashboard TutorialOverlay.
 *
 * REACTIVE: Steps whose targetId is missing from the DOM are automatically
 * filtered out at render time. This means the tutorial always matches what
 * the user actually sees — populated data or empty state.
 *
 * SMART POSITIONING: Tooltips auto-flip when they would clip out of viewport.
 *
 * @param {string}   pageId  — unique key (e.g., 'equity', 'crypto')
 * @param {Object[]} steps   — array of { type, targetId, title, message, position }
 *                              type: 'spotlight' (passive) | 'action' (waits for user)
 */
export default function PageTutorialOverlay({ pageId, steps = [] }) {
    const { ftueState, updateFtueProgress } = usePortfolio();
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [actionCompleted, setActionCompleted] = useState(false);
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

    // Check if this page's tutorial has already been completed
    const alreadySeen = ftueState?.pageTutorials?.[pageId] === true;

    // Filter steps to only those whose target element exists in the DOM.
    // Run after a delay to let the page fully render.
    useEffect(() => {
        if (alreadySeen || steps.length === 0) return;

        const timer = setTimeout(() => {
            const available = steps.filter(s => document.getElementById(s.targetId));
            setActiveSteps(available);
            if (available.length > 0) {
                setCurrentStep(0);
                setIsVisible(true);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [alreadySeen, isMobile, steps]);

    const totalSteps = activeSteps.length;

    // Measure the target element
    const measureTarget = useCallback((stepIndex) => {
        if (stepIndex >= totalSteps) {
            setTargetRect(null);
            return;
        }
        const step = activeSteps[stepIndex];
        const el = document.getElementById(step.targetId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            setTimeout(() => {
                const rect = el.getBoundingClientRect();
                const padding = step.padding !== undefined ? step.padding : SPOTLIGHT_PADDING;
                setTargetRect({
                    x: rect.x - padding,
                    y: rect.y - padding,
                    width: rect.width + padding * 2,
                    height: rect.height + padding * 2,
                    shape: step.shape || 'rect'
                });
            }, 400);
        } else {
            setTargetRect(null);
        }
    }, [totalSteps, activeSteps]);

    // Re-measure on step change and on resize/scroll
    useEffect(() => {
        if (!isVisible) return;
        measureTarget(currentStep);
        setActionCompleted(false);

        const handleResize = () => measureTarget(currentStep);
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize, true);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize, true);
        };
    }, [currentStep, measureTarget, isVisible]);

    // For action steps, observe DOM for the waitForSelector
    useEffect(() => {
        if (!isVisible) return;
        const step = activeSteps[currentStep];
        if (step?.type !== 'action' || !step.waitForSelector) return;

        const observer = new MutationObserver(() => {
            const el = document.querySelector(step.waitForSelector);
            if (el) {
                setActionCompleted(true);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Check immediately
        if (document.querySelector(step.waitForSelector)) {
            setActionCompleted(true);
        }

        return () => observer.disconnect();
    }, [currentStep, isVisible, activeSteps]);

    const goNext = useCallback(async () => {
        const nextStep = currentStep + 1;
        if (nextStep >= totalSteps) {
            // Tutorial complete
            await updateFtueProgress({
                pageTutorials: { ...ftueState?.pageTutorials, [pageId]: true }
            });
            setIsVisible(false);
            return;
        }
        setCurrentStep(nextStep);
    }, [currentStep, totalSteps, updateFtueProgress, ftueState, pageId]);

    const skipTour = useCallback(async () => {
        await updateFtueProgress({
            pageTutorials: { ...ftueState?.pageTutorials, [pageId]: true }
        });
        setIsVisible(false);
    }, [updateFtueProgress, ftueState, pageId]);

    // Smart tooltip positioning with auto-flip to prevent clipping
    const getTooltipStyle = () => {
        if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        const step = activeSteps[currentStep];
        if (!step) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

        const preferred = step.position || 'bottom';
        const gap = 16;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Calculate position for a given placement
        const calcPos = (pos) => {
            let top, left;
            switch (pos) {
                case 'top':
                    top = targetRect.y - gap - TOOLTIP_HEIGHT_ESTIMATE;
                    left = targetRect.x + targetRect.width / 2 - TOOLTIP_WIDTH / 2;
                    break;
                case 'left':
                    top = targetRect.y + targetRect.height / 2 - TOOLTIP_HEIGHT_ESTIMATE / 2;
                    left = targetRect.x - gap - TOOLTIP_WIDTH;
                    break;
                case 'right':
                    top = targetRect.y + targetRect.height / 2 - TOOLTIP_HEIGHT_ESTIMATE / 2;
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
            return { top, left };
        };

        // Opposite placements for auto-flip
        const flipMap = { top: 'bottom', bottom: 'top', left: 'right', right: 'left', 'bottom-end': 'top' };

        // Try preferred placement first
        let { top, left } = calcPos(preferred);

        // Check if it clips and auto-flip if needed
        const clips = (t, l) =>
            t < VIEWPORT_MARGIN ||
            t + TOOLTIP_HEIGHT_ESTIMATE > vh - VIEWPORT_MARGIN ||
            l < VIEWPORT_MARGIN ||
            l + TOOLTIP_WIDTH > vw - VIEWPORT_MARGIN;

        if (clips(top, left)) {
            const flipped = calcPos(flipMap[preferred] || 'bottom');
            if (!clips(flipped.top, flipped.left)) {
                top = flipped.top;
                left = flipped.left;
            }
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
        top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - TOOLTIP_HEIGHT_ESTIMATE - VIEWPORT_MARGIN));

        return { top, left, width: TOOLTIP_WIDTH };
    };

    // Don't render if already seen, not visible, or no active steps
    if (!mounted || alreadySeen || !isVisible || activeSteps.length === 0) return null;

    const step = activeSteps[currentStep];
    const tooltipStyle = getTooltipStyle();
    const isActionStep = step?.type === 'action';
    const canProceed = !isActionStep || actionCompleted;
    const isLastStep = currentStep === totalSteps - 1;

    const content = (
        <div className="fixed inset-0 z-[9998] pointer-events-none">
            {/* SVG Mask Overlay */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-auto"
                style={{ cursor: 'default' }}
            >
                <defs>
                    <mask id={`spotlight-mask-${pageId}`}>
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
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
                                rx={targetRect.shape === 'circle' ? targetRect.width / 2 : SPOTLIGHT_RADIUS}
                                ry={targetRect.shape === 'circle' ? targetRect.height / 2 : SPOTLIGHT_RADIUS}
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect
                    x="0" y="0"
                    width="100%" height="100%"
                    fill="rgba(0, 0, 0, 0.65)"
                    mask={`url(#spotlight-mask-${pageId})`}
                />
            </svg>

            {/* Glow ring */}
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
                        borderRadius: targetRect.shape === 'circle' ? '50%' : SPOTLIGHT_RADIUS,
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

                            <p className="text-[13px] text-[#F5F5DC]/70 font-space leading-relaxed m-0 mb-1">
                                {step.message}
                            </p>

                            {/* Action step prompt */}
                            {isActionStep && !actionCompleted && (
                                <p className="text-[11px] text-[#D4AF37]/60 font-space italic m-0 mb-3">
                                    👆 Complete the action above to continue...
                                </p>
                            )}
                            {isActionStep && actionCompleted && (
                                <p className="text-[11px] text-emerald-400/80 font-space font-semibold m-0 mb-3">
                                    ✓ Done! Click Next to continue.
                                </p>
                            )}
                            {!isActionStep && <div className="mb-3" />}

                            {/* Reset tip on last step */}
                            {isLastStep && (
                                <p className="text-[10px] text-[#F5F5DC]/30 font-space m-0 mb-3 italic">
                                    You can replay this tour anytime from Profile → Replay Tutorial.
                                </p>
                            )}

                            {/* Controls */}
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={skipTour}
                                    className="text-[11px] text-[#F5F5DC]/30 hover:text-[#F5F5DC]/60 font-space tracking-wide uppercase transition-colors bg-transparent border-none cursor-pointer"
                                >
                                    Skip
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
                                    whileHover={canProceed ? { scale: 1.05 } : {}}
                                    whileTap={canProceed ? { scale: 0.95 } : {}}
                                    onClick={canProceed ? goNext : undefined}
                                    disabled={!canProceed}
                                    className={`px-4 py-1.5 rounded-lg font-space text-[11px] tracking-wide font-bold transition-all duration-300 border-none cursor-pointer
                                        ${canProceed
                                            ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0B0611] hover:shadow-md hover:shadow-[#D4AF37]/20'
                                            : 'bg-white/10 text-white/30 cursor-not-allowed'
                                        }`}
                                >
                                    {isLastStep ? "Got it!" : "Next →"}
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
