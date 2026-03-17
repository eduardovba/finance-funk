/**
 * Vanguard UK — Transaction History CSV Parser
 *
 * Expected columns:
 * Date, Transaction Type, Description/Fund Name, Quantity/Shares, Price, Amount, Account
 */

import { matchHeaderPatterns } from '../baseProvider';
import { normalizeDate, parseNumeric } from '@/lib/spreadsheetParser';

const REQUIRED_HEADERS = [
    /^date$/i,
    /^transaction\s*type$/i,
    /^(fund\s*name|description|investment\s*name)$/i,
    /^(shares|quantity|units)$/i,
    /^(price|price\s*per\s*unit)$/i,
    /^(amount|value)$/i,
];

export const vanguardUk = {
    id: 'vanguard-uk',
    name: 'Vanguard UK',
    country: 'UK',
    icon: '⛵',
    logo: '/providers/vanguard.png',
    color: '#96151D',
    description: 'Import your Vanguard UK transaction history CSV.',
    supportedFormats: ['csv'],
    assetClasses: ['Equity', 'Pension'],
    exportInstructions: [
        'Log in to Vanguard UK → My Accounts & Transaction History',
        'Go to Download Centre',
        'Select "CSV file" format and your date range (up to 18 months)',
        'Download the file',
    ],

    detect(headers) {
        const score = matchHeaderPatterns(headers, REQUIRED_HEADERS);
        // Boost confidence if "Vanguard" appears in any header or row
        return score;
    },

    parse(headers, rows, options = {}) {
        const { defaultCurrency = 'GBP' } = options;
        const transactions = [];
        const summary = { total: rows.length, skipped: 0, assetClasses: new Set() };

        // Find the right header names (Vanguard may vary slightly)
        const findCol = (row, patterns) => {
            for (const key of Object.keys(row)) {
                if (patterns.some(p => p.test(key))) return row[key];
            }
            return undefined;
        };

        for (const row of rows) {
            const dateStr = findCol(row, [/^date$/i]) || '';
            const date = normalizeDate(dateStr);
            if (!date) { summary.skipped++; continue; }

            const txType = String(findCol(row, [/^transaction\s*type$/i]) || '').trim().toLowerCase();
            const fundName = findCol(row, [/^(fund|investment|description)/i]) || 'Vanguard Fund';
            const quantity = parseNumeric(findCol(row, [/^(shares|quantity|units)$/i]));
            const price = parseNumeric(findCol(row, [/^(price)$/i]));
            const amount = Math.abs(parseNumeric(findCol(row, [/^(amount|value)$/i])));

            // Map Vanguard transaction types
            let type;
            if (/sell|redemption|withdrawal/i.test(txType)) type = 'Sell';
            else if (/buy|purchase|reinvest/i.test(txType)) type = 'Buy';
            else if (/dividend|income|interest/i.test(txType)) { summary.skipped++; continue; }
            else type = amount < 0 ? 'Sell' : 'Buy';

            // Detect if SIPP → Pension, otherwise Equity
            const account = String(findCol(row, [/^account/i]) || '').toLowerCase();
            const assetClass = /sipp|pension/i.test(account) ? 'Pension' : 'Equity';
            summary.assetClasses.add(assetClass);

            transactions.push({
                date,
                type,
                asset: String(fundName).trim(),
                ticker: '',
                quantity: Math.abs(quantity),
                price,
                amount: amount || Math.abs(quantity * price),
                currency: defaultCurrency,
                broker: 'Vanguard',
                notes: '',
                assetClass,
            });
        }

        summary.assetClasses = [...summary.assetClasses];
        return { transactions, summary };
    },
};
