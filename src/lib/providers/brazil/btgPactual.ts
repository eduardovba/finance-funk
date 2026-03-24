/**
 * BTG Pactual — Extrato de Investimentos Parser
 *
 * BTG exports account/investment statements in Excel format.
 * Columns may include: Data, Descrição/Produto, Tipo, Valor, Saldo
 */

import { matchHeaderPatterns, parseDateBR, parseNumericBR } from '../baseProvider';

const REQUIRED_HEADERS = [
    /^data$/i,
    /^(descri[çc][ãa]o|produto|ativo)$/i,
    /^(valor|montante)$/i,
];

export const btgPactual = {
    id: 'btg-pactual',
    name: 'BTG Pactual',
    country: 'BR',
    icon: '🔵',
    logo: '/providers/btg.png',
    color: '#002F6C',
    description: 'Importe seu extrato de investimentos do BTG Pactual.',
    supportedFormats: ['xlsx', 'xls', 'csv'],
    assetClasses: ['Equity', 'Fixed Income'],
    exportInstructions: [
        'Acesse o app ou site do BTG Pactual',
        'Vá em Conta → Extrato',
        'Selecione o período (30, 60 ou 90 dias)',
        'Exporte em formato Excel',
    ],

    detect(headers: any[]) {
        const score = matchHeaderPatterns(headers, REQUIRED_HEADERS);
        const hasBtgMarker = headers.some(h => /btg|pactual|segmento/i.test(String(h)));
        return hasBtgMarker ? Math.min(score + 0.3, 1) : score;
    },

    parse(headers: any[], rows: any[], options: any = {}) {
        const transactions = [];
        const summary = { total: rows.length, skipped: 0, assetClasses: new Set() };

        const findCol = (row: any, patterns: any[]) => {
            for (const key of Object.keys(row)) {
                if (patterns.some(p => p.test(key))) return row[key];
            }
            return undefined;
        };

        for (const row of rows as any[]) {
            const dateStr = findCol(row, [/data/i]) || '';
            const date = parseDateBR(dateStr);
            if (!date) { summary.skipped++; continue; }

            const description = String(findCol(row, [/descri|produto|ativo/i]) || '').trim();
            const valor = parseNumericBR(findCol(row, [/valor|montante/i]));
            const tipo = String(findCol(row, [/tipo|opera/i]) || '').trim().toLowerCase();

            if (!valor && valor !== 0) { summary.skipped++; continue; }
            if (/saldo/i.test(description) && !/aplica|resgate/i.test(description)) {
                summary.skipped++;
                continue;
            }

            const descLower = description.toLowerCase();
            let assetClass = 'Equity';
            if (/cdb|lci|lca|renda fixa|tesouro|debenture|cri|cra|fundo.*(?:rf|renda)/i.test(descLower)) {
                assetClass = 'Fixed Income';
            }

            let type = 'Buy';
            if (/resgate|venda|sell/i.test(tipo) || /resgate|venda/i.test(descLower)) type = 'Sell';
            else if (/aplica|compra|buy/i.test(tipo) || /aplica|compra/i.test(descLower)) type = 'Buy';
            else type = valor < 0 ? 'Sell' : 'Buy';

            summary.assetClasses.add(assetClass);

            transactions.push({
                date,
                type,
                asset: description || 'BTG Investment',
                ticker: '',
                quantity: 0,
                price: 0,
                amount: Math.abs(valor),
                currency: 'BRL',
                broker: 'BTG Pactual',
                notes: description,
                assetClass,
            });
        }

        summary.assetClasses = [...summary.assetClasses] as any;
        return { transactions, summary };
    },
};
