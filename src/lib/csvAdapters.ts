/**
 * CSV Bank Statement Adapters — Registry Pattern
 *
 * Each supported bank is a self-contained BankAdapter with its own
 * detection heuristic and parser. Adding a new bank = adding one object.
 *
 * Supported: HSBC · Amex · Barclays · Lloyds · Monzo · Santander UK · Nubank
 *
 * RULES:
 * - Strip negative sign + thousands-commas BEFORE parseToCents
 * - parseToCents expects a positive locale string — never parseFloat
 * - Use sign only to derive is_income boolean
 * - HSBC: negative = expense, positive = income
 * - Amex: INVERTED — positive = expense, negative = income
 * - Nubank: uses parseBrCents (period=thousands, comma=decimal)
 */

import Papa from 'papaparse';
import { parseToCents } from '@/lib/budgetUtils';

// ═══════════ Public types ═══════════

export interface StagedTransaction {
    id: string;
    date: string;            // YYYY-MM-DD
    description: string;
    amount_cents: number;    // always positive integer
    is_income: boolean;
    category_id: number | null;
    currency: string;
    source: string;          // adapter label, e.g. 'HSBC', 'NUBANK'
}

export interface BankAdapter {
    id: string;              // slug: 'hsbc', 'amex', 'barclays', ...
    label: string;           // display name: 'HSBC UK', 'Amex UK', ...
    currency: string;        // 'GBP' | 'BRL'
    detect: (firstLine: string) => boolean;
    parse: (csvText: string) => StagedTransaction[];
}

export type DetectedFormat = string;  // adapter.id or 'unknown'

// ═══════════ Shared helpers ═══════════

/** Strip leading minus and thousands-commas, leaving a clean positive decimal string */
function cleanAmount(raw: string): { isNegative: boolean; clean: string } {
    const trimmed = raw.trim();
    const isNegative = trimmed.startsWith('-');
    const clean = trimmed
        .replace(/^-/, '')            // strip leading minus
        .replace(/,(?=\d{3})/g, ''); // strip thousands commas (e.g. "2,596.03" → "2596.03")
    return { isNegative, clean };
}

/** Convert DD/MM/YYYY → YYYY-MM-DD. Returns empty string on invalid input. */
function parseDdMmYyyy(raw: string): string {
    const parts = raw.trim().split('/');
    if (parts.length !== 3) return '';
    const [dd, mm, yyyy] = parts;
    if (!dd || !mm || !yyyy || yyyy.length !== 4) return '';
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

/**
 * Parse Brazilian-format amount string into integer cents.
 *
 * BR format: period = thousands separator, comma = decimal separator.
 *   "-1.250,50" → { isNegative: true, cents: 125050 }
 *   "350,00"    → { isNegative: false, cents: 35000 }
 *
 * Steps:
 *   1. Strip negative sign
 *   2. Remove periods (thousands separator)
 *   3. Replace comma with period (decimal separator)
 *   4. Pass resulting clean string to parseToCents
 */
export function parseBrCents(rawAmount: string): { isNegative: boolean; cents: number } {
    const trimmed = rawAmount.trim();
    const isNegative = trimmed.startsWith('-');
    const clean = trimmed
        .replace(/^-/, '')       // strip leading minus
        .replace(/\./g, '')      // remove period thousands separators
        .replace(/,/g, '.');     // comma → period for decimal
    return { isNegative, cents: parseToCents(clean) };
}

// ═══════════ Bank Adapters ═══════════

// ─── HSBC UK ────────────────────────────────────────────────

const hsbcAdapter: BankAdapter = {
    id: 'hsbc',
    label: 'HSBC UK',
    currency: 'GBP',
    detect: (firstLine) => /^\d{2}\/\d{2}\/\d{4}/.test(firstLine),
    parse(csvText) {
        const { data } = Papa.parse<string[]>(csvText, {
            header: false,
            skipEmptyLines: true,
        });

        return data
            .filter(row => {
                const rawDate = row[0] ?? '';
                const rawAmount = row[2] ?? '';
                return rawDate.includes('/') && rawAmount.trim().length > 0;
            })
            .map(row => {
                const date = parseDdMmYyyy(row[0] ?? '');
                const description = (row[1] ?? '').trim();
                const { isNegative, clean } = cleanAmount(row[2] ?? '0');
                const amount_cents = parseToCents(clean);

                return {
                    id: crypto.randomUUID(),
                    date,
                    description,
                    amount_cents,
                    is_income: !isNegative, // HSBC: negative = expense
                    category_id: null,
                    currency: 'GBP',
                    source: 'HSBC',
                };
            })
            .filter(t => t.date.length > 0 && t.amount_cents > 0);
    },
};

// ─── Amex UK ────────────────────────────────────────────────

const amexAdapter: BankAdapter = {
    id: 'amex',
    label: 'Amex UK',
    currency: 'GBP',
    detect: (firstLine) =>
        firstLine.includes('Card Member') || firstLine.includes('Account #'),
    parse(csvText) {
        const { data } = Papa.parse<Record<string, string>>(csvText, {
            header: true,
            skipEmptyLines: true,
        });

        return data
            .filter(row => {
                const rawDate = row['Date'] ?? '';
                const rawAmount = row['Amount'] ?? '';
                return rawDate.includes('/') && rawAmount.trim().length > 0;
            })
            .map(row => {
                const date = parseDdMmYyyy(row['Date'] ?? '');
                const description = (row['Description'] ?? '').trim();
                const { isNegative, clean } = cleanAmount(row['Amount'] ?? '0');
                const amount_cents = parseToCents(clean);

                return {
                    id: crypto.randomUUID(),
                    date,
                    description,
                    amount_cents,
                    is_income: isNegative, // Amex INVERTED: negative = income
                    category_id: null,
                    currency: 'GBP',
                    source: 'AMEX',
                };
            })
            .filter(t => t.date.length > 0 && t.amount_cents > 0);
    },
};

// ─── Barclays UK ────────────────────────────────────────────

const barclaysAdapter: BankAdapter = {
    id: 'barclays',
    label: 'Barclays UK',
    currency: 'GBP',
    detect: (firstLine) =>
        firstLine.includes('Subcategory') || firstLine.includes('Memo'),
    parse(csvText) {
        const { data } = Papa.parse<Record<string, string>>(csvText, {
            header: true,
            skipEmptyLines: true,
        });

        return data
            .filter(row => {
                const rawDate = row['Date'] ?? '';
                const rawAmount = row['Amount'] ?? '';
                return rawDate.trim().length > 0 && rawAmount.trim().length > 0;
            })
            .map(row => {
                const date = parseDdMmYyyy(row['Date'] ?? '');
                const description = (row['Memo'] ?? row['Description'] ?? '').trim();
                const { isNegative, clean } = cleanAmount(row['Amount'] ?? '0');
                const amount_cents = parseToCents(clean);

                return {
                    id: crypto.randomUUID(),
                    date,
                    description,
                    amount_cents,
                    is_income: !isNegative, // Barclays: negative = expense
                    category_id: null,
                    currency: 'GBP',
                    source: 'BARCLAYS',
                };
            })
            .filter(t => t.date.length > 0 && t.amount_cents > 0);
    },
};

// ─── Lloyds UK ──────────────────────────────────────────────

const lloydsAdapter: BankAdapter = {
    id: 'lloyds',
    label: 'Lloyds UK',
    currency: 'GBP',
    detect: (firstLine) => firstLine.includes('Money In'),
    parse(csvText) {
        const { data } = Papa.parse<Record<string, string>>(csvText, {
            header: true,
            skipEmptyLines: true,
        });

        return data
            .filter(row => {
                const rawDate = row['Date'] ?? '';
                const moneyIn = (row['Money In'] ?? row['Credit Amount'] ?? '').trim();
                const moneyOut = (row['Money Out'] ?? row['Debit Amount'] ?? '').trim();
                return rawDate.trim().length > 0 && (moneyIn.length > 0 || moneyOut.length > 0);
            })
            .map(row => {
                const date = parseDdMmYyyy(row['Date'] ?? '');
                const description = (row['Description'] ?? row['Type'] ?? '').trim();

                const moneyIn = (row['Money In'] ?? row['Credit Amount'] ?? '').trim();
                const moneyOut = (row['Money Out'] ?? row['Debit Amount'] ?? '').trim();

                const is_income = moneyIn.length > 0 && moneyIn !== '0' && moneyIn !== '0.00';
                const rawAmount = is_income ? moneyIn : moneyOut;
                const { clean } = cleanAmount(rawAmount || '0');
                const amount_cents = parseToCents(clean);

                return {
                    id: crypto.randomUUID(),
                    date,
                    description,
                    amount_cents,
                    is_income,
                    category_id: null,
                    currency: 'GBP',
                    source: 'LLOYDS',
                };
            })
            .filter(t => t.date.length > 0 && t.amount_cents > 0);
    },
};

// ─── Monzo ──────────────────────────────────────────────────

const monzoAdapter: BankAdapter = {
    id: 'monzo',
    label: 'Monzo',
    currency: 'GBP',
    detect: (firstLine) =>
        firstLine.includes('Transaction ID') && firstLine.includes('Emoji'),
    parse(csvText) {
        const { data } = Papa.parse<Record<string, string>>(csvText, {
            header: true,
            skipEmptyLines: true,
        });

        return data
            .filter(row => {
                const rawDate = row['Date'] ?? '';
                const rawAmount = row['Amount'] ?? '';
                return rawDate.trim().length > 0 && rawAmount.trim().length > 0;
            })
            .map(row => {
                const date = parseDdMmYyyy(row['Date'] ?? '');
                const description = (row['Name'] ?? row['Description'] ?? '').trim();
                const { isNegative, clean } = cleanAmount(row['Amount'] ?? '0');
                const amount_cents = parseToCents(clean);

                return {
                    id: crypto.randomUUID(),
                    date,
                    description,
                    amount_cents,
                    is_income: !isNegative, // Monzo: negative = expense
                    category_id: null,
                    currency: row['Currency'] ?? 'GBP',
                    source: 'MONZO',
                };
            })
            .filter(t => t.date.length > 0 && t.amount_cents > 0);
    },
};

// ─── Santander UK ───────────────────────────────────────────

const santanderUkAdapter: BankAdapter = {
    id: 'santander_uk',
    label: 'Santander UK',
    currency: 'GBP',
    detect: (firstLine) => {
        // Santander UK has a simple 3-column CSV: Date, Description, Amount
        const cols = firstLine.split(',').map(c => c.trim().replace(/"/g, ''));
        return (
            cols.length >= 3 &&
            cols[0]?.toLowerCase() === 'date' &&
            cols[1]?.toLowerCase() === 'description' &&
            cols[2]?.toLowerCase() === 'amount'
        );
    },
    parse(csvText) {
        const { data } = Papa.parse<Record<string, string>>(csvText, {
            header: true,
            skipEmptyLines: true,
        });

        return data
            .filter(row => {
                const rawDate = row['Date'] ?? '';
                const rawAmount = row['Amount'] ?? '';
                return rawDate.trim().length > 0 && rawAmount.trim().length > 0;
            })
            .map(row => {
                const date = parseDdMmYyyy(row['Date'] ?? '');
                const description = (row['Description'] ?? '').trim();
                const { isNegative, clean } = cleanAmount(row['Amount'] ?? '0');
                const amount_cents = parseToCents(clean);

                return {
                    id: crypto.randomUUID(),
                    date,
                    description,
                    amount_cents,
                    is_income: !isNegative, // Santander: negative = expense
                    category_id: null,
                    currency: 'GBP',
                    source: 'SANTANDER',
                };
            })
            .filter(t => t.date.length > 0 && t.amount_cents > 0);
    },
};

// ─── Nubank (Brazil) ────────────────────────────────────────

const nubankAdapter: BankAdapter = {
    id: 'nubank',
    label: 'Nubank',
    currency: 'BRL',
    detect: (firstLine) => {
        // Nubank uses semicolons and Portuguese headers: Data;Valor or Data;Descrição
        const lower = firstLine.toLowerCase();
        return (
            (lower.includes(';') && (lower.includes('valor') || lower.includes('descrição') || lower.includes('descricao'))) ||
            (lower.includes('data') && lower.includes(';'))
        );
    },
    parse(csvText) {
        const { data } = Papa.parse<Record<string, string>>(csvText, {
            header: true,
            delimiter: ';',
            skipEmptyLines: true,
        });

        return data
            .filter(row => {
                // Support both 'Data' and 'Date' header naming
                const rawDate = row['Data'] ?? row['Date'] ?? '';
                const rawAmount = row['Valor'] ?? row['Amount'] ?? '';
                return rawDate.trim().length > 0 && rawAmount.trim().length > 0;
            })
            .map(row => {
                const rawDate = row['Data'] ?? row['Date'] ?? '';
                const date = parseDdMmYyyy(rawDate);
                const description = (row['Descrição'] ?? row['Descricao'] ?? row['Description'] ?? '').trim();
                const rawAmount = row['Valor'] ?? row['Amount'] ?? '0';

                // Use BR-specific parser: period=thousands, comma=decimal
                const { isNegative, cents } = parseBrCents(rawAmount);

                return {
                    id: crypto.randomUUID(),
                    date,
                    description,
                    amount_cents: cents,
                    is_income: !isNegative, // Nubank: negative = expense
                    category_id: null,
                    currency: 'BRL',
                    source: 'NUBANK',
                };
            })
            .filter(t => t.date.length > 0 && t.amount_cents > 0);
    },
};

// ═══════════ Registry ═══════════

/**
 * Ordered list of all bank adapters.
 * Detection is tried in order — first match wins.
 * HSBC must come LAST among header-less formats because its
 * detection (first field looks like DD/MM/YYYY) is very broad.
 */
export const BANK_ADAPTERS: BankAdapter[] = [
    amexAdapter,
    barclaysAdapter,
    lloydsAdapter,
    monzoAdapter,
    santanderUkAdapter,
    nubankAdapter,
    hsbcAdapter,   // broadest detector — must be last
];

/**
 * Sniff the CSV format from the first line using the adapter registry.
 * Returns the adapter id or 'unknown'.
 */
export function detectCsvFormat(csvText: string): DetectedFormat {
    const nlIndex = csvText.indexOf('\n');
    const firstLine = (nlIndex > -1 ? csvText.slice(0, nlIndex) : csvText).trim();

    for (const adapter of BANK_ADAPTERS) {
        if (adapter.detect(firstLine)) {
            return adapter.id;
        }
    }
    return 'unknown';
}

/**
 * Find a bank adapter by its detected id.
 */
export function getAdapter(formatId: string): BankAdapter | undefined {
    return BANK_ADAPTERS.find(a => a.id === formatId);
}

/**
 * Convenience: detect format + parse in one call.
 * Returns { format, adapter, transactions } or format='unknown' with empty transactions.
 */
export function detectAndParse(csvText: string): {
    format: DetectedFormat;
    adapter: BankAdapter | undefined;
    transactions: StagedTransaction[];
} {
    const format = detectCsvFormat(csvText);
    const adapter = getAdapter(format);
    const transactions = adapter ? adapter.parse(csvText) : [];
    return { format, adapter, transactions };
}

// ═══════════ Legacy exports (backward compat) ═══════════

/** @deprecated Use BANK_ADAPTERS registry + detectAndParse() instead */
export function parseHsbcCsv(csvText: string): StagedTransaction[] {
    return hsbcAdapter.parse(csvText);
}

/** @deprecated Use BANK_ADAPTERS registry + detectAndParse() instead */
export function parseAmexCsv(csvText: string): StagedTransaction[] {
    return amexAdapter.parse(csvText);
}

// Re-export CsvFormat for backward compat
export type CsvFormat = 'hsbc' | 'amex' | 'barclays' | 'lloyds' | 'monzo' | 'santander_uk' | 'nubank';
