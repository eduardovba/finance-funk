/**
 * Trading 212 — Transaction History CSV Parser
 *
 * Expected CSV columns (from export):
 * Action, Time, ISIN, Ticker, Name, No. of shares, Price / share,
 * Currency (Price / share), Exchange rate, Result, Total, Withholding tax,
 * Currency (Withholding tax), Charge amount, Stamp duty reserve tax,
 * Notes, ID, Currency conversion fee
 */

import { matchHeaderPatterns, inferTransactionType } from '../baseProvider';
import { normalizeDate, parseNumeric } from '@/lib/spreadsheetParser';

const REQUIRED_HEADERS = [
    /^action$/i,
    /^time$/i,
    /^ticker$/i,
    /^name$/i,
    /^no\.?\s*of\s*shares$/i,
    /^price\s*\/?\s*share$/i,
    /^total/i,
];

export const trading212 = {
    id: 'trading212',
    name: 'Trading 212',
    country: 'UK',
    icon: '📊',
    logo: '/providers/trading212.png',
    color: '#00B4D8',
    description: 'Import your Trading 212 transaction history CSV.',
    supportedFormats: ['csv'],
    assetClasses: ['Equity'],
    exportInstructions: [
        'Open Trading 212 → Menu → History',
        'Tap "Export History"',
        'Select your date range and download the CSV file',
    ],

    detect(headers) {
        return matchHeaderPatterns(headers, REQUIRED_HEADERS);
    },

    parse(headers, rows, options = {}) {
        const { defaultCurrency = 'GBP' } = options;
        const transactions = [];
        const summary = { total: rows.length, skipped: 0, assetClasses: new Set() };

        for (const row of rows) {
            const action = String(row['Action'] || '').trim().toLowerCase();

            // Skip non-trade actions (deposits, withdrawals, interest, etc.)
            if (!action.includes('buy') && !action.includes('sell')) {
                // Handle dividends as a special note
                if (action.includes('dividend')) {
                    summary.skipped++;
                    continue; // Dividends not supported yet as transaction type
                }
                summary.skipped++;
                continue;
            }

            const timeStr = row['Time'] || '';
            const date = normalizeDate(timeStr.split(' ')[0]); // Take date portion
            if (!date) { summary.skipped++; continue; }

            const name = row['Name'] || row['Ticker'] || 'Unknown';
            const ticker = row['Ticker'] || '';
            const quantity = Math.abs(parseNumeric(row['No. of shares']));
            const price = parseNumeric(row['Price / share']);
            const total = Math.abs(parseNumeric(row['Total'] || row['Total (GBP)'] || row['Total (EUR)'] || row['Total (USD)']));
            const currency = row['Currency (Price / share)'] || defaultCurrency;
            const isin = row['ISIN'] || '';
            const type = action.includes('sell') ? 'Sell' : 'Buy';
            const result = parseNumeric(row['Result'] || row['Result (GBP)'] || row['Result (EUR)'] || row['Result (USD)'] || 0);

            summary.assetClasses.add('Equity');

            transactions.push({
                date,
                type,
                asset: name,
                ticker,
                isin,
                quantity,
                price,
                amount: total || (quantity * price),
                currency: currency.toUpperCase(),
                broker: 'Trading 212',
                pnl: type === 'Sell' && result ? result : null,
                notes: row['Notes'] || '',
                assetClass: 'Equity',
            });
        }

        summary.assetClasses = [...summary.assetClasses];
        return { transactions, summary };
    },
};
