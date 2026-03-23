import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';

const HardwareDial = ({
    value,
    min,
    max,
    onChange,
    label,
    subtitle,
    formatValue = (v) => v,
    size = 120, // Small or Large size in pixels
    glowColor = "#ff7f00", // Default orange neon glow
    step = 1
}) => {
    const dialRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [displayValue, setDisplayValue] = useState(value);

    // Readout Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState("");
    const inputRef = useRef(null);

    // Convert value to an angle from -135 to +135 degrees
    const valueToAngle = (val) => {
        const clamped = Math.max(min, Math.min(max, val));
        const percentage = (clamped - min) / (max - min);
        // Map 0-1 to -135 to +135
        return (percentage * 270) - 135;
    };

    const angleToValue = (angle) => {
        // Map -135 to +135 back to 0-1
        let percentage = (angle + 135) / 270;
        percentage = Math.max(0, Math.min(1, percentage));
        let val = min + (percentage * (max - min));
        val = Math.round(val / step) * step;
        return val;
    };

    const [rotation, setRotation] = useState(valueToAngle(value));

    // Prop sync
    useEffect(() => {
        if (!isDragging) {
            setDisplayValue(value);
            setRotation(valueToAngle(value));
        }
    }, [value, isDragging, min, max]);

    const handlePointerDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        updateRotation(e);
    };

    const handlePointerMove = useCallback((e) => {
        if (!isDragging) return;
        updateRotation(e);
    }, [isDragging]);

    const handlePointerUp = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            if (onChange) {
                onChange(displayValue);
            }
        }
    }, [isDragging, displayValue, onChange]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        } else {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        }
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging, handlePointerMove, handlePointerUp]);

    const updateRotation = (e) => {
        if (!dialRef.current) return;

        const rect = dialRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let clientX = e.clientX;
        let clientY = e.clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        const deltaX = clientX - centerX;
        const deltaY = clientY - centerY;

        // Atan2 gives angle in radians from -PI to PI
        let rad = Math.atan2(deltaY, deltaX);
        let deg = rad * (180 / Math.PI);

        // Adjust so 0 is straight up, -135 is bottom left, +135 is bottom right
        deg = deg + 90;

        // Handle wrap around at bottom
        if (deg < -180) deg += 360;
        if (deg > 180) deg -= 360;

        // Clamp to allowed range (-135 to 135)
        let clampedDeg = Math.max(-135, Math.min(135, deg));

        // Prevent jumping across the gap at the bottom
        if (deg > 135 && deg < 180 && rotation < -90) clampedDeg = -135;
        if (deg < -135 && deg > -180 && rotation > 90) clampedDeg = 135;

        setRotation(clampedDeg);

        const newVal = angleToValue(clampedDeg);
        setDisplayValue(newVal);
    };

    const handleReadoutClick = (e) => {
        e.stopPropagation();
        setIsEditing(true);
        setTempValue(value.toString());
    };

    const handleInputBlur = () => {
        setIsEditing(false);
        const parsed = parseFloat(tempValue);
        if (!isNaN(parsed)) {
            onChange(parsed);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleInputBlur();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
        }
    };

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Calculate percentage for SVG ring fill (0 to 1)
    const fillPercentage = (displayValue - min) / (max - min);
    // SVG Path arc length for a 270 deg circle is roughly 2.35 * r
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    // We only use 270 degrees of the circle (75%)
    const arcLength = circumference * 0.75;
    const strokeDashoffset = arcLength - (arcLength * fillPercentage);

    return (
        <div className="flex flex-col items-center select-none" style={{ width: size + 40 }}>
            {/* Labels */}
            <div className="text-center mb-2 h-10 flex flex-col justify-end">
                <div className="font-bebas tracking-widest text-parchment text-sm drop-shadow-[0_1px_rgba(0,0,0,0.8)]">
                    {label}
                </div>
                {subtitle && (
                    <div className="font-space  text-data-xs text-parchment/60 tracking-widest uppercase font-bold drop-shadow-[0_1px_rgba(0,0,0,0.8)]">
                        {subtitle}
                    </div>
                )}
            </div>

            {/* Dial Container */}
            <div
                className="relative flex items-center justify-center cursor-pointer group"
                style={{ width: size, height: size }}
                onPointerDown={handlePointerDown}
                ref={dialRef}
            >
                {/* 1. Flat Dark Base Bezel */}
                <div className="absolute inset-0 rounded-full bg-[#111] border border-white/5 opacity-80 m-2"></div>

                {/* 2. Flat Neon Track (SVG) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" style={{ transform: 'rotate(135deg)' }}>
                    {/* Background track (dark) */}
                    <circle
                        cx="50" cy="50" r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="4"
                        strokeDasharray={arcLength + " " + circumference}
                        strokeLinecap="round"
                    />
                    {/* Foreground track (glow) */}
                    <circle
                        cx="50" cy="50" r={radius}
                        fill="none"
                        stroke={glowColor}
                        strokeWidth="4"
                        strokeDasharray={arcLength + " " + circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-75 drop-shadow-[0_0_6px_currentColor]"
                    />
                </svg>

                {/* 3. The Minimalist Knob */}
                <motion.div
                    className="absolute w-[65%] h-[65%] rounded-full bg-[#1A0F2E] border border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.5)] flex items-center justify-center"
                    style={{ rotate: rotation }}
                >
                    {/* Inner raised cap - flattened */}
                    <div className="absolute inset-[15%] rounded-full bg-[#22153b] border border-white/5 shadow-inner"></div>

                    {/* The Indicator Notch (Flat neon slit) */}
                    <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[2px] h-[15%] rounded-lg z-10" style={{ backgroundColor: glowColor, boxShadow: `0 0 4px ${glowColor}` }}></div>
                </motion.div>
            </div>

            {/* Readout Display (Minimal flat pill) */}
            <div
                className={`mt-4 bg-black/40 border border-white/10 px-4 py-1.5 rounded-lg min-w-[100px] text-center transition-all ${!isEditing ? 'hover:border-white/30 cursor-text' : 'ring-1 ring-white/20'}`}
                onClick={handleReadoutClick}
            >
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={handleInputBlur}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-transparent border-none outline-none text-center font-space  text-data-sm tracking-wider font-bold p-0"
                        style={{ color: glowColor }}
                    />
                ) : (
                    <span className="font-space  text-data-sm tracking-wider font-bold" style={{ color: glowColor }}>
                        {formatValue(displayValue)}
                    </span>
                )}
            </div>
        </div>
    );
};

export default HardwareDial;
