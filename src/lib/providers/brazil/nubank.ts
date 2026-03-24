/**
 * Nubank — Extrato da Conta Parser
 *
 * Nubank exports simple account statements:
 * Data, Descrição, Valor
 * Primarily used for Fixed Income (CDB/RDB/Cofrinhos).
 */

import { matchHeaderPatterns, parseDateBR, parseNumericBR } from '../baseProvider';

const REQUIRED_HEADERS = [
    /^data$/i,
    /^(descri[çc][ãa]o|detalhes)$/i,
    /^valor$/i,
];

export const nubank = {
    id: 'nubank',
    name: 'Nubank',
    country: 'BR',
    icon: '💜',
    logo: '/providers/nubank.png',
    color: '#8A05BE',
    description: 'Importe seu extrato do Nubank (conta ou investimentos).',
    supportedFormats: ['csv'],
    assetClasses: ['Fixed Income'],
    exportInstructions: [
        'Abra o app Nubank → Conta',
        'Toque em "Pedir extrato"',
        'Selecione o mês desejado',
        'Escolha formato CSV — o arquivo será enviado ao seu e-mail',
    ],

    detect(headers) {
        const score = matchHeaderPatterns(headers, REQUIRED_HEADERS);
        // Nubank CSVs are very simple; boost if we DON'T see complex headers
        const isSimple = headers.length <= 5;
        return isSimple ? Math.min(score + 0.1, 1) : score * 0.8;
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

            const description = String(findCol(row, [/descri|detalhes/i]) || '').trim();
            const valor = parseNumericBR(findCol(row, [/valor/i]));

            if (!valor && valor !== 0) { summary.skipped++; continue; }

            // Filter for investment-related transactions
            const descLower = description.toLowerCase();
            const isInvestment = /cdb|rdb|rendimento|aplica|resgate|investimento|cofrinho|renda fixa/i.test(descLower);

            if (!isInvestment) {
                summary.skipped++;
                continue;
            }

            let type = 'Buy';
            if (/resgate|retirada|venda/i.test(descLower)) type = 'Sell';
            else if (/aplica|dep[óo]sito|compra|rendimento/i.test(descLower)) type = 'Buy';

            const assetClass = 'Fixed Income';
            summary.assetClasses.add(assetClass);

            transactions.push({
                date,
                type,
                asset: description.length > 50 ? description.slice(0, 50) + '…' : description,
                ticker: '',
                quantity: 0,
                price: 0,
                amount: Math.abs(valor),
                currency: 'BRL',
                broker: 'Nubank',
                notes: description,
                assetClass,
            });
        }

        summary.assetClasses = [...summary.assetClasses];
        return { transactions, summary };
    },
};
