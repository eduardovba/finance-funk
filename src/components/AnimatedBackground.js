"use client";

import React from 'react';
import { usePortfolio } from '@/context/PortfolioContext';

/* ═══════════════════════════════════════════════════════════════
   AnimatedBackground — Image-based wallpapers.
   Serves the uploaded backgrounds from /backgrounds/ folder.
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
    'mosaic': '/backgrounds/Mosaic.jpeg',
    'paper-large': '/backgrounds/Paper Large.jpeg',
    'paper-small': '/backgrounds/Paper Small.jpeg',
    'walnut': '/backgrounds/Walnut.jpeg',
};

export default function AnimatedBackground() {
    const { appSettings } = usePortfolio();
    const themeId = appSettings?.backgroundSelection || 'leather';

    const imagePath = IMAGE_WALLPAPERS[themeId] || IMAGE_WALLPAPERS['leather'];

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: -2,
            backgroundImage: `url("${imagePath}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
        }} />
    );
}
