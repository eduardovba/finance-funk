/**
 * XP Investimentos — Extrato de Conta Parser
 *
 * XP exports account statements with columns like:
 * Data, Movimentação/Descrição, Valor, Saldo
 * The description field contains asset names and operation types.
 */

import { matchHeaderPatterns, parseDateBR, parseNumericBR, inferTransactionType } from '../baseProvider';

const REQUIRED_HEADERS = [
    /^data$/i,
    /^(movimenta[çc][ãa]o|descri[çc][ãa]o|hist[óo]rico)$/i,
    /^valor$/i,
];

export const xpInvestimentos = {
    id: 'xp-investimentos',
    name: 'XP Investimentos',
    country: 'BR',
    icon: '💛',
    logo: '/providers/xp.png',
    color: '#FFCC00',
    description: 'Importe seu extrato de conta da XP Investimentos.',
    supportedFormats: ['csv', 'xlsx', 'xls'],
    assetClasses: ['Equity', 'Fixed Income', 'Crypto'],
    exportInstructions: [
        'Acesse a conta XP pelo site ou app',
        'Vá em Minha Conta → Extrato',
        'Selecione o período (máx. 90 dias)',
        'Exporte em formato Excel/CSV',
    ],

    detect(headers) {
        const score = matchHeaderPatterns(headers, REQUIRED_HEADERS);
        // Boost if we see XP-specific columns
        const hasXpMarker = headers.some(h => /saldo|liquida[çc][ãa]o/i.test(String(h)));
        return hasXpMarker ? Math.min(score + 0.15, 1) : score;
    },

    parse(headers, rows, options = {}) {
        const transactions = [];
        const summary = { total: rows.length, skipped: 0, assetClasses: new Set() };

        const findCol = (row, patterns) => {
            for (const key of Object.keys(row)) {
                if (patterns.some(p => p.test(key))) return row[key];
            }
            return undefined;
        };

        for (const row of rows) {
            const dateStr = findCol(row, [/data/i]) || '';
            const date = parseDateBR(dateStr);
            if (!date) { summary.skipped++; continue; }

            const description = String(findCol(row, [/movimenta|descri|hist[óo]rico/i]) || '').trim();
            const valor = parseNumericBR(findCol(row, [/valor/i]));

            if (!valor && valor !== 0) { summary.skipped++; continue; }

            // Skip balance-only rows
            if (/saldo/i.test(description) && !description.match(/aplica|resgate|compra|venda/i)) {
                summary.skipped++;
                continue;
            }

            // Infer asset class from description keywords
            let assetClass = 'Equity';
            const descLower = description.toLowerCase();
            if (/cdb|lci|lca|renda fixa|tesouro|debenture|cri|cra/i.test(descLower)) {
                assetClass = 'Fixed Income';
            } else if (/bitcoin|btc|ethereum|eth|crypto|cripto/i.test(descLower)) {
                assetClass = 'Crypto';
            }

            // Infer type from description
            let type = 'Buy';
            if (/resgate|venda|sold|sell|liquida[çc][ãa]o/i.test(descLower)) type = 'Sell';
            else if (/aplica[çc][ãa]o|compra|bought|buy|dep[óo]sito/i.test(descLower)) type = 'Buy';
            else type = valor < 0 ? 'Sell' : 'Buy';

            summary.assetClasses.add(assetClass);

            // Try to extract asset name from description
            const assetName = description.replace(/(compra|venda|aplica[çc][ãa]o|resgate|liquida[çc][ãa]o)\s*(de)?\s*/gi, '').trim() || 'XP Investment';

            transactions.push({
                date,
                type,
                asset: assetName,
                ticker: '',
                quantity: 0,
                price: 0,
                amount: Math.abs(valor),
                currency: 'BRL',
                broker: 'XP Investimentos',
                notes: description,
                assetClass,
            });
        }

        summary.assetClasses = [...summary.assetClasses];
        return { transactions, summary };
    },
};
