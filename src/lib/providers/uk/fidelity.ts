/**
 * Fidelity UK — Transaction History CSV Parser
 *
 * Expected columns:
 * Date, Account, Fund, Type, Units/Shares, Price, Amount, Reference
 */

import { matchHeaderPatterns, parseDateUK } from '../baseProvider';
import { normalizeDate, parseNumeric } from '@/lib/spreadsheetParser';

const REQUIRED_HEADERS = [
    /^date$/i,
    /^(fund|investment|security|name)$/i,
    /^(type|transaction\s*type)$/i,
    /^(units|shares|quantity)$/i,
    /^(amount|value|cost)$/i,
];

export const fidelity = {
    id: 'fidelity',
    name: 'Fidelity',
    country: 'UK',
    icon: '💚',
    logo: '/providers/fidelity.png',
    color: '#007934',
    description: 'Import your Fidelity UK transaction history CSV.',
    supportedFormats: ['csv'],
    assetClasses: ['Equity', 'Pension'],
    exportInstructions: [
        'Log in to Fidelity → My Accounts → Transaction History',
        'Select the account and date range',
        'Export as CSV and download',
    ],

    detect(headers: any[]) {
        const score = matchHeaderPatterns(headers, REQUIRED_HEADERS);
        const hasFidelity = headers.some(h => /fidelity/i.test(String(h)));
        return hasFidelity ? Math.min(score + 0.2, 1) : score;
    },

    parse(headers: any[], rows: any[], options: any = {}) {
        const { defaultCurrency = 'GBP' } = options;
        const transactions = [];
        const summary = { total: rows.length, skipped: 0, assetClasses: new Set() };

        for (const row of rows as any[]) {
            const dateStr = row['Date'] || row['Trade Date'] || '';
            const date = normalizeDate(dateStr) || parseDateUK(dateStr);
            if (!date) { summary.skipped++; continue; }

            const fund = row['Fund'] || row['Investment'] || row['Security'] || row['Name'] || 'Fidelity Fund';
            const txType = String(row['Type'] || row['Transaction Type'] || '').trim().toLowerCase();
            const quantity = parseNumeric(row['Units'] || row['Shares'] || row['Quantity'] || 0);
            const price = parseNumeric(row['Price'] || 0);
            const amount = Math.abs(parseNumeric(row['Amount'] || row['Value'] || row['Cost'] || 0));

            let type;
            if (/sell|redemption|withdrawal/i.test(txType)) type = 'Sell';
            else if (/buy|purchase|reinvest|contribution/i.test(txType)) type = 'Buy';
            else if (/dividend|income|interest/i.test(txType)) { summary.skipped++; continue; }
            else type = 'Buy';

            const account = String(row['Account'] || row['Account Name'] || '').toLowerCase();
            const assetClass = /sipp|pension/i.test(account) ? 'Pension' : 'Equity';
            summary.assetClasses.add(assetClass);

            transactions.push({
                date,
                type,
                asset: String(fund).trim(),
                ticker: row['ISIN'] || row['SEDOL'] || '',
                quantity: Math.abs(quantity),
                price,
                amount: amount || Math.abs(quantity * price),
                currency: defaultCurrency,
                broker: 'Fidelity',
                notes: row['Reference'] || '',
                assetClass,
            });
        }

        summary.assetClasses = [...summary.assetClasses] as any;
        return { transactions, summary };
    },
};
