"use client";
import React, { useEffect, useRef } from 'react';

const InteractiveDots = () => {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: -1000, y: -1000 }); // Start far away

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationFrameId;
        const dots = [];

        // Configuration
        const spacing = 56; // Even wider spacing for cleaner look
        const dotSize = 0.7; // Brushing on the edge of visibility
        const pullRadius = 150; // Wider but weaker influence
        const pullStrength = 0.005; // Ghost-like pull
        const friction = 0.97; // Extremely syrupy
        const spring = 0.004; // Very lazy return
        const maxDisplace = 12; // Capping displacement to prevent clumping

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.scale(dpr, dpr);
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            initDots();
        };

        const initDots = () => {
            dots.length = 0;
            const cols = Math.ceil(window.innerWidth / spacing);
            const rows = Math.ceil(window.innerHeight / spacing);

            for (let i = 0; i <= cols; i++) {
                for (let j = 0; j <= rows; j++) {
                    const x = i * spacing;
                    const y = j * spacing;
                    dots.push({
                        x, y,
                        originX: x,
                        originY: y,
                        vx: 0,
                        vy: 0,
                        opacity: 0.12
                    });
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            dots.forEach(dot => {
                const dx = mouseRef.current.x - dot.x;
                const dy = mouseRef.current.y - dot.y;
                const distSq = dx * dx + dy * dy;
                const dist = Math.sqrt(distSq);

                if (dist < pullRadius) {
                    const force = (pullRadius - dist) / pullRadius;
                    const pull = force * pullStrength;

                    dot.vx += dx * pull;
                    dot.vy += dy * pull;
                    dot.opacity = 0.12 + (force * 0.08);
                } else {
                    dot.opacity = 0.12;
                }

                // Spring back to origin
                dot.vx += (dot.originX - dot.x) * spring;
                dot.vy += (dot.originY - dot.y) * spring;

                // Physics
                dot.vx *= friction;
                dot.vy *= friction;
                dot.x += dot.vx;
                dot.y += dot.vy;

                // Clamp displacement from origin to prevent clumping
                const totalDX = dot.x - dot.originX;
                const totalDY = dot.y - dot.originY;
                const totalDist = Math.sqrt(totalDX * totalDX + totalDY * totalDY);
                if (totalDist > maxDisplace) {
                    const ratio = maxDisplace / totalDist;
                    dot.x = dot.originX + totalDX * ratio;
                    dot.y = dot.originY + totalDY * ratio;
                }

                // Render
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, dotSize, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(212, 175, 55, ${dot.opacity})`;
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        const onMouseMove = (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', onMouseMove);

        resize();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: -1,
                pointerEvents: 'none',
                opacity: 0.6
            }}
        />
    );
};

export default InteractiveDots;
