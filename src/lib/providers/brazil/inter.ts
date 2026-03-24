/**
 * Banco Inter — Extrato de Investimentos Parser
 *
 * Inter exports investment statements in CSV/Excel format.
 * Columns may include: Data, Descrição/Produto, Tipo, Valor, Aplicação, Resgate
 */

import { matchHeaderPatterns, parseDateBR, parseNumericBR } from '../baseProvider';

const REQUIRED_HEADERS = [
    /^data$/i,
    /^(descri[çc][ãa]o|produto|ativo|lan[çc]amento)$/i,
    /^(valor|aplica[çc][ãa]o|resgate)$/i,
];

export const inter = {
    id: 'inter',
    name: 'Banco Inter',
    country: 'BR',
    icon: '🟧',
    logo: '/providers/inter.png',
    color: '#FF7A00',
    description: 'Importe seu extrato de investimentos do Banco Inter.',
    supportedFormats: ['csv', 'xlsx', 'xls'],
    assetClasses: ['Equity', 'Fixed Income'],
    exportInstructions: [
        'Acesse o app ou site do Banco Inter',
        'Vá em Investimentos → Extrato',
        'Selecione o período desejado',
        'Exporte em formato CSV ou Excel',
    ],

    detect(headers: any[]) {
        const score = matchHeaderPatterns(headers, REQUIRED_HEADERS);
        const hasInterMarker = headers.some(h => /inter|banco inter/i.test(String(h)));
        return hasInterMarker ? Math.min(score + 0.3, 1) : score;
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

            const description = String(findCol(row, [/descri|produto|ativo|lan[çc]amento/i]) || '').trim();

            // Inter sometimes has separate Aplicação and Resgate columns
            const aplicacao = parseNumericBR(findCol(row, [/aplica/i]));
            const resgate = parseNumericBR(findCol(row, [/resgate/i]));
            const valor = parseNumericBR(findCol(row, [/^valor$/i]));

            let amount, type;
            if (aplicacao && aplicacao > 0) {
                amount = aplicacao;
                type = 'Buy';
            } else if (resgate && resgate > 0) {
                amount = resgate;
                type = 'Sell';
            } else if (valor) {
                amount = Math.abs(valor);
                type = valor < 0 ? 'Sell' : 'Buy';
            } else {
                summary.skipped++;
                continue;
            }

            // Skip non-investment rows
            if (/saldo|tarifa|taxa|iof/i.test(description) && !/aplica|resgate|cdb|lci/i.test(description)) {
                summary.skipped++;
                continue;
            }

            const descLower = description.toLowerCase();
            let assetClass = 'Equity';
            if (/cdb|lci|lca|renda fixa|tesouro|debenture|cri|cra|poupan[çc]a/i.test(descLower)) {
                assetClass = 'Fixed Income';
            }

            // Override type from description if clear keywords present
            if (/resgate|venda/i.test(descLower)) type = 'Sell';
            else if (/aplica|compra/i.test(descLower)) type = 'Buy';

            summary.assetClasses.add(assetClass);

            transactions.push({
                date,
                type,
                asset: description || 'Inter Investment',
                ticker: '',
                quantity: 0,
                price: 0,
                amount,
                currency: 'BRL',
                broker: 'Banco Inter',
                notes: description,
                assetClass,
            });
        }

        summary.assetClasses = [...summary.assetClasses] as any;
        return { transactions, summary };
    },
};
