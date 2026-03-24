/**
 * Rico Investimentos — Extrato / Informe de Rendimentos Parser
 *
 * Rico (part of XP Group) exports statements in Excel.
 * Similar structure to XP: Data, Descrição/Movimentação, Valor, Saldo
 */

import { matchHeaderPatterns, parseDateBR, parseNumericBR } from '../baseProvider';

const REQUIRED_HEADERS = [
    /^data$/i,
    /^(movimenta[çc][ãa]o|descri[çc][ãa]o|hist[óo]rico)$/i,
    /^valor$/i,
];

export const rico = {
    id: 'rico',
    name: 'Rico',
    country: 'BR',
    icon: '🟠',
    logo: '/providers/rico.png',
    color: '#FF6600',
    description: 'Importe seu extrato da Rico Investimentos.',
    supportedFormats: ['xlsx', 'xls', 'csv'],
    assetClasses: ['Equity', 'Fixed Income'],
    exportInstructions: [
        'Acesse a conta Rico pelo site ou app',
        'Vá em Patrimônio → Ver extrato completo',
        'Selecione o período desejado',
        'Exporte em formato Excel',
    ],

    detect(headers) {
        const score = matchHeaderPatterns(headers, REQUIRED_HEADERS);
        const hasRicoMarker = headers.some(h => /rico|corretora/i.test(String(h)));
        return hasRicoMarker ? Math.min(score + 0.2, 1) : score;
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
            if (/saldo/i.test(description) && !/aplica|resgate|compra|venda/i.test(description)) {
                summary.skipped++;
                continue;
            }

            const descLower = description.toLowerCase();
            let assetClass = 'Equity';
            if (/cdb|lci|lca|renda fixa|tesouro|debenture|cri|cra/i.test(descLower)) {
                assetClass = 'Fixed Income';
            }

            let type = 'Buy';
            if (/resgate|venda|sell/i.test(descLower)) type = 'Sell';
            else if (/aplica|compra|buy|dep[óo]sito/i.test(descLower)) type = 'Buy';
            else type = valor < 0 ? 'Sell' : 'Buy';

            summary.assetClasses.add(assetClass);

            const assetName = description.replace(/(compra|venda|aplica[çc][ãa]o|resgate|liquida[çc][ãa]o)\s*(de)?\s*/gi, '').trim() || 'Rico Investment';

            transactions.push({
                date,
                type,
                asset: assetName,
                ticker: '',
                quantity: 0,
                price: 0,
                amount: Math.abs(valor),
                currency: 'BRL',
                broker: 'Rico',
                notes: description,
                assetClass,
            });
        }

        summary.assetClasses = [...summary.assetClasses];
        return { transactions, summary };
    },
};
