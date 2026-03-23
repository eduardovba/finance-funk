"use client";

import React from 'react';
import { usePortfolio } from '@/context/PortfolioContext';

/* ═══════════════════════════════════════════════════════════════
   AnimatedBackground — Image-based wallpapers with overlays.
   Serves the uploaded backgrounds from /backgrounds/ folder.
   Adds vignette + noise overlays for premium glass depth.
   ═══════════════════════════════════════════════════════════════ */

const IMAGE_WALLPAPERS = {
    'concretely-funky': '/backgrounds/Concretely Funky.jpeg',
    'copper-rise': '/backgrounds/Copper Rise.jpeg',
    'creamy-linen': '/backgrounds/Creamy Linen.jpeg',
    'crystal-of-groove': '/backgrounds/Crystal of Groove.jpeg',
    'envelope-of-funk-light': '/backgrounds/Envelope of Funk Light.jpeg',
    'envelope-of-funk': '/backgrounds/Envelope of Funk.jpeg',
    'frosted-funk': '/backgrounds/Frosted Funk.jpeg',
    'frosted-glass': '/backgrounds/Frosted Glass.jpeg',
    'linen-funk-light': '/backgrounds/Linen Funk Light.jpeg',
    'linen-funk': '/backgrounds/Linen Funk.jpeg',
    'mosaic-dance': '/backgrounds/Mosaic Dance.jpeg',
    'walnut-grooves': '/backgrounds/Walnut Grooves.jpeg',
};

/* Tiny inline SVG noise texture — eliminates color banding in glass effects */
const NOISE_SVG = `data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E`;

export default function AnimatedBackground() {
    const { appSettings } = usePortfolio();
    const themeId = appSettings?.backgroundSelection || 'linen-funk';

    const imagePath = IMAGE_WALLPAPERS[themeId] || IMAGE_WALLPAPERS['linen-funk'];

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
