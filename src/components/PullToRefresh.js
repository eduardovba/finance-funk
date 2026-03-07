import React, { useState, useEffect } from 'react';

export default function PullToRefresh({ onRefresh, children }) {
    const [startY, setStartY] = useState(0);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isAtTop, setIsAtTop] = useState(true);

    const pullThreshold = 75;
    const maxPull = 120;

    useEffect(() => {
        const handleScroll = () => {
            setIsAtTop(window.scrollY <= 5);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        // Set body overscroll behavior to prevent native pull-to-refresh
        if (typeof document !== 'undefined') {
            document.body.style.overscrollBehaviorY = 'none';
        }
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (typeof document !== 'undefined') {
                document.body.style.overscrollBehaviorY = 'auto';
            }
        };
    }, []);

    const handleTouchStart = (e) => {
        if (isAtTop && !isRefreshing) {
            setStartY(e.touches[0].clientY);
        }
    };

    const handleTouchMove = (e) => {
        if (startY > 0 && isAtTop && !isRefreshing) {
            const y = e.touches[0].clientY;
            const dist = y - startY;

            // Only capture pull down
            if (dist > 0) {
                // If we're pulling down, we slightly resist the pull to feel like a spring
                const resistance = Math.min(dist * 0.4, maxPull);
                setPullDistance(resistance);

                // Prevent browser default scroll handling when intentionally pulling
                if (e.cancelable && resistance > 10) {
                    e.preventDefault();
                }
            }
        }
    };

    const handleTouchEnd = async () => {
        if (pullDistance > pullThreshold && !isRefreshing && onRefresh) {
            // Haptic feedback if supported
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(10);
            }
            setIsRefreshing(true);
            setPullDistance(50); // Hold at a specific height while refreshing
            try {
                // Assuming onRefresh returns a Promise, wait for it
                const result = onRefresh();
                if (result && typeof result.then === 'function') {
                    await result;
                } else {
                    // Fallback artificial delay if it's synchronous just so the user sees the spinner
                    await new Promise(r => setTimeout(r, 800));
                }
            } catch (e) {
                console.error("Refresh failed", e);
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            // Snap back if didn't pull far enough
            setPullDistance(0);
        }
        setStartY(0);
    };

    return (
        <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative min-h-full w-full"
        >
            {/* Refresh Indicator Container */}
            <div
                className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-50 transition-all duration-300 ease-out"
                style={{
                    height: `${Math.max(0, pullDistance)}px`,
                    opacity: Math.min(1, pullDistance / (pullThreshold * 0.8))
                }}
            >
                {pullDistance > 0 && (
                    <div className="bg-white/10 backdrop-blur-xl rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/20 p-2.5 flex items-center justify-center transform transition-transform">
                        <div
                            className={`w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full ${isRefreshing ? 'animate-spin' : ''}`}
                            style={{
                                transform: isRefreshing ? 'none' : `rotate(${pullDistance * 5}deg)`
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Content Container */}
            <div
                style={{
                    transform: `translateY(${Math.max(0, pullDistance)}px)`,
                    transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
                }}
            >
                {children}
            </div>
        </div>
    );
}
