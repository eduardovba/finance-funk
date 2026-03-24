/**
 * Interactive Brokers — Activity Statement CSV Parser
 *
 * IBKR CSVs are multi-section. The first two columns are always:
 *   "Statement section" and "row type" (Header/Data)
 *
 * We extract the "Trades" section and parse:
 *   Date/Time, Symbol, Quantity, T. Price, C. Price, Proceeds, Comm/Fee, Code
 */

import { matchHeaders } from '../baseProvider';
import { normalizeDate, parseNumeric } from '@/lib/spreadsheetParser';

export const interactiveBrokers = {
    id: 'interactive-brokers',
    name: 'Interactive Brokers',
    country: 'UK',
    icon: '🏛️',
    logo: '/providers/ibkr.png',
    color: '#D32F2F',
    description: 'Import your IBKR Activity Statement CSV (Trades section).',
    supportedFormats: ['csv'],
    assetClasses: ['Equity', 'Fixed Income', 'Crypto'],
    exportInstructions: [
        'Log into Client Portal → Reports → Statements',
        'Select "Activity" statement type and your date range',
        'Choose CSV format and click "Run"',
        'Download the generated file',
    ],

    detect(headers: any[]) {
        // IBKR files have these distinctive first columns
        const hasSection = headers.some(h => /statement\s*section/i.test(String(h)));
        const hasRowType = headers.some(h => /row\s*type/i.test(String(h)));
        if (hasSection && hasRowType) return 0.95;
        // Also detect if it's a Flex Query export with Trades section
        const hasTrades = headers.some(h => /^trades$/i.test(String(h)));
        if (hasTrades) return 0.7;
        return 0;
    },

    parse(headers: any[], rows: any[], options: any = {}) {
        const { defaultCurrency = 'USD' } = options;
        const transactions: any[] = [];
        const summary = { total: 0, skipped: 0, assetClasses: new Set() };

        // IBKR CSV is multi-section: we need to find the "Trades" section
        // Each row has a section name in the first column and row type in the second
        let inTradesSection = false;
        let tradeHeaders = null;

        for (const row of rows as any[]) {
            const values = Object.values(row);
            const section = String(values[0] || '').trim();
            const rowType = String(values[1] || '').trim();

            // Detect when we enter/leave the Trades section
            if (/^trades$/i.test(section)) {
                if (/^header$/i.test(rowType)) {
                    inTradesSection = true;
                    // Build header mapping from this row
                    tradeHeaders = values.slice(2).map(h => String(h || '').trim());
                    continue;
                }
                if (/^data$/i.test(rowType) && inTradesSection && tradeHeaders) {
                    const data = values.slice(2);
                    const tradeRow: Record<string, any> = {};
                    tradeHeaders.forEach((h, i) => { tradeRow[h] = data[i]; });

                    summary.total++;

                    const dateStr = tradeRow['Date/Time'] || tradeRow['TradeDate'] || '';
                    const date = normalizeDate(dateStr.split(',')[0]?.trim() || dateStr.split(' ')[0]);
                    if (!date) { summary.skipped++; continue; }

                    const symbol = tradeRow['Symbol'] || '';
                    const quantity = parseNumeric(tradeRow['Quantity']);
                    const price = parseNumeric(tradeRow['T. Price'] || tradeRow['Price']);
                    const proceeds = Math.abs(parseNumeric(tradeRow['Proceeds'] || tradeRow['NetCash']));
                    const commission = parseNumeric(tradeRow['Comm/Fee'] || tradeRow['Commission']);
                    const currency = tradeRow['Currency'] || defaultCurrency;
                    const type = quantity >= 0 ? 'Buy' : 'Sell';

                    const amount = proceeds || Math.abs(quantity * price);

                    summary.assetClasses.add('Equity');

                    transactions.push({
                        date,
                        type,
                        asset: symbol,
                        ticker: symbol,
                        quantity: Math.abs(quantity),
                        price: Math.abs(price),
                        amount,
                        currency: String(currency).toUpperCase(),
                        broker: 'Interactive Brokers',
                        notes: commission ? `Commission: ${commission}` : '',
                        assetClass: 'Equity',
                    });
                }
                continue;
            }

            // If we've left the trades section, stop looking
            if (inTradesSection && !/^trades$/i.test(section)) {
                inTradesSection = false;
            }
        }

        // If we couldn't find a multi-section structure, try parsing as a flat Flex Query
        if (transactions.length === 0) {
            for (const row of rows as any[]) {
                const symbol = row['Symbol'] || row['symbol'] || '';
                const dateStr = row['TradeDate'] || row['Date/Time'] || row['DateTime'] || '';
                const date = normalizeDate(dateStr.split(',')[0]?.trim() || dateStr.split(' ')[0]);
                if (!date || !symbol) continue;

                summary.total++;
                const quantity = parseNumeric(row['Quantity']);
                const price = parseNumeric(row['TradePrice'] || row['T. Price'] || row['Price']);
                const proceeds = Math.abs(parseNumeric(row['Proceeds'] || row['NetCash']));
                const currency = row['CurrencyPrimary'] || row['Currency'] || defaultCurrency;
                const type = quantity >= 0 ? 'Buy' : 'Sell';

                summary.assetClasses.add('Equity');

                transactions.push({
                    date,
                    type,
                    asset: symbol,
                    ticker: symbol,
                    quantity: Math.abs(quantity),
                    price: Math.abs(price),
                    amount: proceeds || Math.abs(quantity * price),
                    currency: String(currency).toUpperCase(),
                    broker: 'Interactive Brokers',
                    notes: '',
                    assetClass: 'Equity',
                });
            }
        }

        summary.assetClasses = [...summary.assetClasses] as any;
        return { transactions, summary };
    },
};
