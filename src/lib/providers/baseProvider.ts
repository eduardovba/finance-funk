/**
 * Base Provider Utilities — shared helpers and interface definition
 * for all provider statement parsers.
 */

import { normalizeDate, parseNumeric } from '@/lib/spreadsheetParser';

// ─── Brazilian number format: 1.234,56 → 1234.56 ──────────────────────────────

/**
 * Parse a number in Brazilian format (period = thousands, comma = decimal)
 * Falls back to standard parseNumeric for non-BR formats.
 */
export function parseNumericBR(value: any) {
    if (typeof value === 'number') return value;
    if (value === null || value === undefined || value === '') return 0;
    const s = String(value).trim().replace(/[R$\s]/g, '');
    // Brazilian format: 1.234,56 or 1.234.567,89
    if (/^-?\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(s)) {
        return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
    }
    // Fall back to generic parser
    return parseNumeric(value);
}

/**
 * Parse a date in DD/MM/YYYY format (common in Brazil)
 * Returns YYYY-MM-DD string.
 */
export function parseDateBR(value: any) {
    if (!value) return null;
    const s = String(value).trim();
    const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    }
    // Try DD/MM/YY
    const matchShort = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (matchShort) {
        return `20${matchShort[3]}-${matchShort[2].padStart(2, '0')}-${matchShort[1].padStart(2, '0')}`;
    }
    // If it's already ISO-ish, fall back to normalizeDate
    return normalizeDate(value);
}

/**
 * Parse a date in DD/MM/YYYY format (also common in UK)
 */
export const parseDateUK = parseDateBR;

// ─── Header Detection Helpers ──────────────────────────────────────────────────

/**
 * Check if a file's headers contain ALL of the required headers (case-insensitive).
 * @param {string[]} fileHeaders - Actual headers from the file
 * @param {string[]} requiredHeaders - Headers that must all be present
 * @returns {number} Score 0-1 based on how many required headers match
 */
export function matchHeaders(fileHeaders: any[], requiredHeaders: string[]) {
    const normalised = fileHeaders.map(h => String(h).trim().toLowerCase());
    let matches = 0;
    for (const req of requiredHeaders) {
        if (normalised.includes(req.toLowerCase())) {
            matches++;
        }
    }
    return matches / requiredHeaders.length;
}

/**
 * Fuzzy-match headers: returns a score based on how many of the required
 * patterns match any of the file headers.
 * @param {string[]} fileHeaders
 * @param {RegExp[]} patterns
 * @returns {number} Score 0-1
 */
export function matchHeaderPatterns(fileHeaders: any[], patterns: RegExp[]) {
    const normalised = fileHeaders.map(h => String(h).trim());
    let matches = 0;
    for (const pattern of patterns) {
        if (normalised.some(h => pattern.test(h))) {
            matches++;
        }
    }
    return matches / patterns.length;
}

/**
 * Infer Buy/Sell type from raw text.
 * Supports English and Portuguese.
 */
export function inferTransactionType(rawType: any, amount: number) {
    if (!rawType) {
        return amount < 0 ? 'Sell' : 'Buy';
    }
    const s = String(rawType).trim().toLowerCase();
    if (/^(sell|sale|venda|divestment|withdrawal|resgate|market sell)$/i.test(s)) return 'Sell';
    if (/^(buy|purchase|compra|investment|deposit|aplicação|aplicacao|market buy)$/i.test(s)) return 'Buy';
    if (/^(dividend|dividendo|jcp|rendimento|interest|yield)$/i.test(s)) return 'Dividend';
    return amount < 0 ? 'Sell' : 'Buy';
}
