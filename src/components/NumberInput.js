import React, { useState, useEffect } from 'react';

/**
 * NumberInput
 * 
 * A controlled input field that visually formats numbers with commas (e.g. 50,000) 
 * while returning clean, raw numeric strings to the parent via onChange.
 */
export default function NumberInput({ value, onChange, className, placeholder = "0", ...props }) {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        // Only update local format if the parent's value changed independently 
        // (to prevent cursor jumping on every keystroke)
        if (value !== undefined && value !== null) {
            const strVal = value.toString();
            // Don't format if user is just typing a decimal point
            if (!strVal.endsWith('.')) {
                setDisplayValue(formatNumber(strVal));
            } else if (displayValue !== strVal) {
                setDisplayValue(strVal);
            }
        } else {
            setDisplayValue('');
        }
    }, [value]);

    const formatNumber = (val) => {
        if (!val) return '';
        // Remove everything except numbers and decimal points
        const cleaned = val.toString().replace(/[^\d.]/g, '');

        // Split by decimal
        const parts = cleaned.split('.');

        // Add commas to the integer part
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        // Rejoin if there was a decimal part (keep up to 2 decimal places optional)
        return parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}` : parts[0];
    };

    const handleChange = (e) => {
        const raw = e.target.value;
        const cleaned = raw.replace(/[^\d.]/g, '');

        // If there's multiple decimals, ignore the last one
        if ((cleaned.match(/\./g) || []).length > 1) return;

        setDisplayValue(formatNumber(raw));

        // Bubble up raw numeric string to parent
        if (onChange) {
            onChange(cleaned);
        }
    };

    return (
        <input
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onFocus={(e) => e.target.select()}
            className={className}
            placeholder={placeholder}
            {...props}
        />
    );
}
