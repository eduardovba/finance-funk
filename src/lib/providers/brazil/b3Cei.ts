/**
 * B3 / CEI (Área do Investidor) — Extrato de Negociação Parser
 *
 * Expected columns (Portuguese):
 * Data do Negócio, Tipo de Movimentação, Mercado, Prazo/Vencimento,
 * Instituição, Código de Negociação, Quantidade, Preço, Valor
 */

import { matchHeaderPatterns, parseDateBR, parseNumericBR } from '../baseProvider';

const REQUIRED_HEADERS = [
    /^data\s*(do\s*neg[óo]cio|neg\.?)?$/i,
    /^(tipo\s*(de\s*movimenta[çc][ãa]o)?|c\/v)$/i,
    /^(c[óo]digo\s*(de\s*negocia[çc][ãa]o)?|ticker|ativo)$/i,
    /^quantidade$/i,
    /^pre[çc]o$/i,
    /^valor$/i,
];

export const b3Cei = {
    id: 'b3-cei',
    name: 'B3 / CEI',
    country: 'BR',
    icon: '🇧🇷',
    logo: '/providers/b3.png',
    color: '#005BAA',
    description: 'Importe seu extrato de negociação da Área do Investidor B3.',
    supportedFormats: ['csv', 'xlsx', 'xls'],
    assetClasses: ['Equity', 'Fixed Income'],
    exportInstructions: [
        'Acesse investidor.b3.com.br e faça login',
        'Vá em Extratos → Negociação',
        'Selecione o período e clique em "Filtrar"',
        'Clique em "Baixar" → "Arquivo em Excel"',
    ],

    detect(headers) {
        return matchHeaderPatterns(headers, REQUIRED_HEADERS);
    },

    parse(headers, rows, options = {}) {
        const transactions = [];
        const summary = { total: rows.length, skipped: 0, assetClasses: new Set() };

        // Find columns flexibly
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

            const tipoMov = String(findCol(row, [/tipo|c\/v|movimenta/i]) || '').trim().toLowerCase();
            const ticker = String(findCol(row, [/c[óo]digo|ticker|ativo/i]) || '').trim();
            const quantity = Math.abs(parseNumericBR(findCol(row, [/quantidade|qtd/i])));
            const price = parseNumericBR(findCol(row, [/pre[çc]o/i]));
            const valor = Math.abs(parseNumericBR(findCol(row, [/valor/i])));
            const mercado = String(findCol(row, [/mercado/i]) || '').trim().toLowerCase();
            const instituicao = String(findCol(row, [/institui[çc][ãa]o|corretora/i]) || '').trim();

            if (!ticker && !valor) { summary.skipped++; continue; }

            const type = /venda|v|sell/i.test(tipoMov) ? 'Sell' : 'Buy';

            // Infer asset class from market type
            let assetClass = 'Equity';
            if (/renda\s*fixa|tesouro|debenture|cdb|lci|lca/i.test(mercado + ' ' + ticker)) {
                assetClass = 'Fixed Income';
            }
            summary.assetClasses.add(assetClass);

            transactions.push({
                date,
                type,
                asset: ticker,
                ticker: ticker.replace(/F$/, ''), // Remove fractional market suffix
                quantity,
                price,
                amount: valor || (quantity * price),
                currency: 'BRL',
                broker: instituicao || 'B3',
                notes: mercado ? `Mercado: ${mercado}` : '',
                assetClass,
            });
        }

        summary.assetClasses = [...summary.assetClasses];
        return { transactions, summary };
    },
};
