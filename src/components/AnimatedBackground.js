"use client";

import React from 'react';
import { usePortfolio } from '@/context/PortfolioContext';

/* ═══════════════════════════════════════════════════════════════
   AnimatedBackground — Image-based wallpapers with overlays.
   Serves the uploaded backgrounds from /backgrounds/ folder.
   Adds vignette + noise overlays for premium glass depth.
   ═══════════════════════════════════════════════════════════════ */

const IMAGE_WALLPAPERS = {
    'concrete': '/backgrounds/Concrete.jpeg',
    'copper-flow': '/backgrounds/Copper Flow.jpeg',
    'copper-rise': '/backgrounds/Copper Rise.jpeg',
    'cream-linen': '/backgrounds/Cream Linen.jpeg',
    'crystal-large': '/backgrounds/Crystal Large.jpeg',
    'crystal-minimal': '/backgrounds/Crystal Minimal.jpeg',
    'frosted-glass': '/backgrounds/Frosted Glass.jpeg',
    'leather': '/backgrounds/Leather.jpeg',
    'linen-detail-large': '/backgrounds/Linen Detail Large.jpeg',
    'linen-detail-minimal': '/backgrounds/Linen Detail Minimal.jpeg',
    'mosaic-large': '/backgrounds/Mosaic Large.jpeg',
    'mosaic-medium': '/backgrounds/Mosaic Medium.jpeg',
    'mosaic-minimal': '/backgrounds/Mosaic Minimal.jpeg',
    'paper-large': '/backgrounds/Paper Large.jpeg',
    'paper-small': '/backgrounds/Paper Small.jpeg',
    'walnut': '/backgrounds/Walnut.jpeg',
};

/* Tiny inline SVG noise texture — eliminates color banding in glass effects */
const NOISE_SVG = `data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E`;

export default function AnimatedBackground() {
    const { appSettings } = usePortfolio();
    const themeId = appSettings?.backgroundSelection || 'frosted-glass';

    const imagePath = IMAGE_WALLPAPERS[themeId] || IMAGE_WALLPAPERS['frosted-glass'];

    return (
        <>
            {/* Wallpaper image layer */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: -3,
                backgroundImage: `url("${imagePath}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }} />

            {/* Vignette overlay — adds depth and focus */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: -2,
                background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.5) 100%)',
                pointerEvents: 'none',
            }} />

            {/* Noise texture overlay — eliminates glass banding */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: -1,
                backgroundImage: `url("${NOISE_SVG}")`,
                backgroundRepeat: 'repeat',
                backgroundSize: '256px 256px',
                opacity: 0.03,
                pointerEvents: 'none',
            }} />
        </>
    );
}
