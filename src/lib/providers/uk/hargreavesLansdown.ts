/**
 * Hargreaves Lansdown — Portfolio Summary / Statement CSV Parser
 *
 * HL CSVs often have a preamble (name, client number) before data.
 * We need to skip these rows and find actual column headers.
 *
 * Expected data columns (once past preamble):
 * Date, Description, Reference, Amount, Balance (for statements)
 * or: Stock, SEDOL, Quantity, Price, Value (for portfolio summary)
 */

import { matchHeaderPatterns, parseDateUK } from '../baseProvider';
import { normalizeDate, parseNumeric } from '@/lib/spreadsheetParser';

const STATEMENT_HEADERS = [
    /^date$/i,
    /^(description|stock|fund)$/i,
    /^(amount|value|price)$/i,
];

const PORTFOLIO_HEADERS = [
    /^(stock|fund|holding)$/i,
    /^(sedol|isin)$/i,
    /^(quantity|units)$/i,
    /^(price)$/i,
    /^(value)$/i,
];

export const hargreavesLansdown = {
    id: 'hargreaves-lansdown',
    name: 'Hargreaves Lansdown',
    country: 'UK',
    icon: '🏦',
    logo: '/providers/hl.png',
    color: '#003366',
    description: 'Import your Hargreaves Lansdown statement or portfolio summary CSV.',
    supportedFormats: ['csv'],
    assetClasses: ['Equity', 'Pension'],
    exportInstructions: [
        'Log in to HL → My Portfolio → Portfolio History',
        'Go to "Statements, valuations and pension illustrations"',
        'Select the report you want and download as CSV',
        'Note: You may need to remove the preamble rows (name, client number)',
    ],

    detect(headers: any[]) {
        // Try statement format
        const stmtScore = matchHeaderPatterns(headers, STATEMENT_HEADERS);
        // Try portfolio format
        const portScore = matchHeaderPatterns(headers, PORTFOLIO_HEADERS);
        // Check for HL-specific markers
        const hasHLMarker = headers.some(h => /hargreaves|hl|lansdown|sedol/i.test(String(h)));
        const bestScore = Math.max(stmtScore, portScore);
        return hasHLMarker ? Math.min(bestScore + 0.3, 1) : bestScore;
    },

    parse(headers: any[], rows: any[], options: any = {}) {
        const { defaultCurrency = 'GBP' } = options;
        const transactions = [];
        const summary = { total: rows.length, skipped: 0, assetClasses: new Set() };

        for (const row of rows as any[]) {
            const dateStr = row['Date'] || row['Trade Date'] || '';
            const date = normalizeDate(dateStr) || parseDateUK(dateStr);
            if (!date) { summary.skipped++; continue; }

            const description = row['Description'] || row['Stock'] || row['Fund'] || row['Holding'] || 'Unknown';
            const quantity = parseNumeric(row['Quantity'] || row['Units'] || 0);
            const price = parseNumeric(row['Price'] || 0);
            const amount = Math.abs(parseNumeric(row['Amount'] || row['Value'] || row['Cost'] || 0));
            const reference = row['Reference'] || '';

            if (!amount && !quantity) { summary.skipped++; continue; }

            // Infer type from description text
            const descLower = description.toLowerCase();
            let type = 'Buy';
            if (/\bsell\b|\bsold\b|\bredeem/i.test(descLower)) type = 'Sell';
            else if (/\bbuy\b|\bbought\b|\bpurchas/i.test(descLower)) type = 'Buy';
            else if (/dividend|income|interest/i.test(descLower)) { summary.skipped++; continue; }

            // HL covers ISA, SIPP, GIA — try to infer from reference or description
            const assetClass = /sipp|pension/i.test(reference + ' ' + description) ? 'Pension' : 'Equity';
            summary.assetClasses.add(assetClass);

            transactions.push({
                date,
                type,
                asset: String(description).trim(),
                ticker: row['SEDOL'] || row['ISIN'] || '',
                quantity: Math.abs(quantity),
                price,
                amount: amount || Math.abs(quantity * price),
                currency: defaultCurrency,
                broker: 'Hargreaves Lansdown',
                notes: reference,
                assetClass,
            });
        }

        summary.assetClasses = [...summary.assetClasses] as any;
        return { transactions, summary };
    },
};
