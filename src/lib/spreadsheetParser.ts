/**
 * Spreadsheet Parser — AI-powered column detection + CSV/XLSX parsing
 * Uses SheetJS loaded from CDN for zero-dependency XLSX/CSV support
 */

// ═══════════ XLSX Module Types ═══════════

interface XLSXWorkbook {
    SheetNames: string[];
    Sheets: Record<string, XLSXSheet>;
}

interface XLSXSheet {
    [cell: string]: unknown;
}

interface XLSXUtils {
    sheet_to_json(sheet: XLSXSheet, opts?: { header?: number | 1; defval?: unknown }): unknown[][];
}

interface XLSXModule {
    read(data: ArrayBuffer, opts?: { type?: string; cellDates?: boolean }): XLSXWorkbook;
    utils: XLSXUtils;
}

declare const window: Window & { XLSX?: XLSXModule };

let XLSX: XLSXModule | null = null;

// ═══════════ Parsed Sheet Types ═══════════

export interface ParsedSheet {
    sheetName: string;
    headers: string[];
    rows: Record<string, unknown>[];
}

export interface SpreadsheetResult {
    sheets: ParsedSheet[];
    headers: string[];
    rows: Record<string, unknown>[];
    sheetNames: string[];
}

// ═══════════ Column Mapping Types ═══════════

export type FieldName =
    | 'date' | 'asset' | 'ticker' | 'quantity' | 'price'
    | 'amount' | 'currency' | 'broker' | 'type' | 'pnl'
    | 'notes' | 'lender' | 'assetClass' | 'ignore';

export type ColumnMapping = Record<string, FieldName>;

interface FieldPatternConfig {
    headerPatterns: RegExp[];
    fuzzyTokens?: string[];
    dataValidator: (values: unknown[]) => number;
}

// ═══════════ Transaction Output Types ═══════════

export interface TransformedTransaction {
    _rowIndex: number;
    date: string;
    type: 'Buy' | 'Sell';
    currency: string;
    broker: string;
    amount: number;
    notes: string;
    assetClass: string;
    asset?: string;
    ticker?: string;
    quantity?: number;
    price?: number;
    pnl?: number | null;
    [key: string]: unknown;
}

// ═══════════ loadXLSX ═══════════

/** Dynamically load SheetJS from CDN (cached after first load) */
async function loadXLSX(): Promise<XLSXModule> {
    if (XLSX) return XLSX;
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load SheetJS. Please check your internet connection.'));
        document.head.appendChild(script);
    });
    XLSX = window.XLSX!;
    return XLSX;
}

// ═══════════ parseSheet ═══════════

function parseSheet(xlsx: XLSXModule, sheet: XLSXSheet, sheetName: string): ParsedSheet | null {
    const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];

    if (jsonData.length < 2) return null;

    const headerRowIndex = jsonData.findIndex(row => row.some((cell) => cell !== ''));
    if (headerRowIndex === -1) return null;

    const rawHeaders = (jsonData[headerRowIndex] as unknown[]).map((h) => String(h || '').trim());
    const dataRows = jsonData.slice(headerRowIndex + 1)
        .filter((row) => (row as unknown[]).some((cell) => cell !== '' && cell !== null && cell !== undefined));

    if (dataRows.length === 0) return null;

    const headers = rawHeaders.filter((h) => h !== '');
    const rows = dataRows.map((row) => {
        const obj: Record<string, unknown> = {};
        rawHeaders.forEach((header, i: number) => {
            if (header) obj[header] = (row as unknown[])[i] !== undefined ? (row as unknown[])[i] : '';
        });
        return obj;
    });

    return { sheetName, headers, rows };
}

// ═══════════ parseSpreadsheetFile ═══════════

export async function parseSpreadsheetFile(file: File): Promise<SpreadsheetResult> {
    const xlsx = await loadXLSX();

    const data = await file.arrayBuffer();
    const workbook = xlsx.read(data, { type: 'array', cellDates: true });

    const sheets: ParsedSheet[] = [];
    for (const name of workbook.SheetNames) {
        const parsed = parseSheet(xlsx, workbook.Sheets[name], name);
        if (parsed) sheets.push(parsed);
    }

    if (sheets.length === 0) {
        throw new Error('Spreadsheet must have at least a header row and one data row.');
    }

    return {
        sheets,
        headers: sheets[0].headers,
        rows: sheets[0].rows,
        sheetNames: workbook.SheetNames,
    };
}

// ─── AI-Powered Smart Column Detection ────────────────────────────────────────

const FIELD_PATTERNS: Record<string, FieldPatternConfig> = {
    date: {
        headerPatterns: [
            /^date$/i, /transaction.?date/i, /trade.?date/i, /settlement/i,
            /^data$/i, /^datum$/i, /^fecha$/i, /purchased/i, /^when$/i,
            /entry.?date/i, /open.?date/i, /sold.?date/i, /acquired/i,
            /purchase.?date/i, /buy.?date/i, /sell.?date/i,
        ],
        fuzzyTokens: ['date', 'data', 'when', 'purchased', 'acquired'],
        dataValidator: (values) => {
            const dateCount = values.filter((v) => isDateLike(v)).length;
            return dateCount / values.length;
        }
    },
    asset: {
        headerPatterns: [
            /^(asset|name|stock|fund|instrument|security|holding|description|ticker.?name)$/i,
            /asset.?name/i, /stock.?name/i, /fund.?name/i, /instrument.?name/i,
            /^nome$/i, /^ativo$/i, /^título$/i, /^titulo$/i,
            /^product$/i, /^investment$/i, /^company$/i, /^paper$/i, /^papel$/i,
        ],
        fuzzyTokens: ['asset', 'name', 'stock', 'fund', 'holding', 'investment', 'company', 'product', 'ativo', 'papel'],
        dataValidator: (values) => {
            const textCount = values.filter((v) => typeof v === 'string' && v.length > 1 && !/^\d+([.,]\d+)?$/.test(v)).length;
            return textCount / values.length;
        }
    },
    ticker: {
        headerPatterns: [
            /^(ticker|symbol|code|isin|epic|sedol|cusip)$/i, /ticker.?symbol/i,
            /^código$/i, /^codigo$/i, /^id$/i,
        ],
        fuzzyTokens: ['ticker', 'symbol', 'isin', 'sedol', 'cusip', 'code'],
        dataValidator: (values) => {
            const tickerCount = values.filter((v) => /^[A-Z0-9]{1,8}(\.[A-Z]{1,3})?$/i.test(String(v).trim())).length;
            return tickerCount / values.length;
        }
    },
    quantity: {
        headerPatterns: [
            /^(qty|quantity|shares|units|amount.?of|no.?of|number|qtd|qtde|quantidade)$/i,
            /^shares$/i, /^units$/i, /^lots$/i, /^volume$/i, /^count$/i,
        ],
        fuzzyTokens: ['quantity', 'qty', 'shares', 'units', 'qtd', 'volume'],
        dataValidator: (values) => {
            const numCount = values.filter((v) => isNumericLike(v)).length;
            return numCount / values.length * 0.8;
        }
    },
    price: {
        headerPatterns: [
            /^(price|cost|cost.?per.?share|unit.?price|avg.?price|purchase.?price|preço|preco)$/i,
            /price.?per/i, /cost.?basis/i
        ],
        dataValidator: (values) => {
            const numCount = values.filter((v) => isNumericLike(v)).length;
            return numCount / values.length * 0.7;
        }
    },
    amount: {
        headerPatterns: [
            /^(amount|total|value|investment|invested|cost|net|market.?value|valor|valor.?total|montante)$/i,
            /total.?amount/i, /total.?cost/i, /total.?value/i, /net.?amount/i,
            /^balance$/i, /^sum$/i, /^mv$/i, /^mkt$/i, /^spend$/i,
        ],
        fuzzyTokens: ['amount', 'total', 'value', 'cost', 'invested', 'balance', 'valor', 'sum'],
        dataValidator: (values) => {
            const numCount = values.filter((v) => isNumericLike(v)).length;
            const hasCurrencySigns = values.some((v) => /[$£€R\$¥]/.test(String(v)));
            return (numCount / values.length * 0.75) + (hasCurrencySigns ? 0.15 : 0);
        }
    },
    currency: {
        headerPatterns: [
            /^(currency|ccy|curr|moeda|divisa)$/i
        ],
        dataValidator: (values) => {
            const ccyCount = values.filter((v) => /^[A-Z]{3}$/.test(String(v).trim())).length;
            return ccyCount / values.length;
        }
    },
    broker: {
        headerPatterns: [
            /^(broker|platform|exchange|account|provider|corretora|conta)$/i
        ],
        dataValidator: (values) => {
            const textCount = values.filter((v) => typeof v === 'string' && v.length > 1).length;
            return textCount / values.length * 0.5;
        }
    },
    type: {
        headerPatterns: [
            /^(type|side|action|direction|buy.?sell|operation|tipo|operação|operacao)$/i,
            /transaction.?type/i, /^op$/i, /tx.?type/i,
        ],
        fuzzyTokens: ['type', 'side', 'action', 'operation', 'direction', 'tipo'],
        dataValidator: (values) => {
            const typeWords = /^(buy|sell|purchase|sale|deposit|withdrawal|investment|divestment|compra|venda)$/i;
            const matchCount = values.filter((v) => typeWords.test(String(v).trim())).length;
            return matchCount / values.length;
        }
    },
    pnl: {
        headerPatterns: [
            /^(pnl|p&l|profit|loss|gain|realized|result|lucro|resultado)$/i,
            /profit.?loss/i, /realized.?p/i
        ],
        dataValidator: (values) => {
            const numCount = values.filter((v) => isNumericLike(v)).length;
            const hasNegatives = values.some((v) => parseNumeric(v) < 0);
            return (numCount / values.length * 0.5) + (hasNegatives ? 0.2 : 0);
        }
    },
    notes: {
        headerPatterns: [
            /^(notes?|memo|comment|description|obs|observação|observacao)$/i
        ],
        dataValidator: () => 0.3
    },
    lender: {
        headerPatterns: [
            /^(lender|creditor|bank|institution|credor)$/i
        ],
        dataValidator: (values) => {
            const textCount = values.filter((v) => typeof v === 'string' && v.length > 1).length;
            return textCount / values.length * 0.4;
        }
    },
    assetClass: {
        headerPatterns: [
            /^(asset.?class|asset.?type|class|tipo.?de.?ativo|classe)$/i
        ],
        dataValidator: (values) => {
            const knownClasses = /^(equity|stocks?|crypto|fixed.?income|pension|real.?estate|debt|renda.?fixa|ações|cripto)$/i;
            const matchCount = values.filter((v) => knownClasses.test(String(v).trim())).length;
            return matchCount / values.length;
        }
    }
};

// ═══════════ smartMapColumns ═══════════

interface ColumnScore {
    header: string;
    field: string;
    score: number;
}

export function smartMapColumns(
    headers: string[],
    sampleRows: Record<string, unknown>[],
    targetAssetClass: string
): ColumnMapping {
    const mapping: ColumnMapping = {};
    const usedFields = new Set<string>();

    const scores: ColumnScore[] = [];

    for (const header of headers) {
        if (!header) continue;
        const columnValues = sampleRows.map((row) => row[header]).filter((v) => v !== '' && v !== null && v !== undefined);

        for (const [field, config] of Object.entries(FIELD_PATTERNS)) {
            let score = 0;

            // 1. Header name matching (50% weight)
            const headerScore = config.headerPatterns.reduce((best: number, pattern) => {
                return pattern.test(header) ? Math.max(best, 1) : best;
            }, 0);
            score += headerScore * 0.5;

            // 2. Fuzzy token matching (15% weight)
            if (!headerScore && config.fuzzyTokens) {
                const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, ' ');
                const tokenMatch = config.fuzzyTokens.some((token) => normalizedHeader.includes(token));
                if (tokenMatch) score += 0.15;
            }

            // 3. Data content analysis (35% weight)
            if (columnValues.length > 0 && config.dataValidator) {
                const dataScore = config.dataValidator(columnValues);
                score += dataScore * 0.35;
            }

            // Boost fields that match the target asset class context
            if (targetAssetClass === 'Debt' && field === 'lender') score += 0.2;
            if (['Equity', 'Crypto'].includes(targetAssetClass) && field === 'ticker') score += 0.1;

            if (score > 0.10) {
                scores.push({ header, field, score });
            }
        }
    }

    // Sort by score descending, then greedily assign
    scores.sort((a, b) => b.score - a.score);

    for (const { header, field } of scores) {
        if (mapping[header] || usedFields.has(field)) continue;
        mapping[header] = field as FieldName;
        usedFields.add(field);
    }

    // Unmatched headers get 'ignore'
    for (const header of headers) {
        if (header && !mapping[header]) {
            mapping[header] = 'ignore';
        }
    }

    return mapping;
}

// ─── Date Parsing ─────────────────────────────────────────────────────────────

interface DateFormat {
    regex: RegExp;
    parse: (m: RegExpMatchArray) => string;
}

const DATE_FORMATS: DateFormat[] = [
    { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, parse: (m) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` },
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, parse: (m) => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` },
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, parse: (m) => `20${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` },
    { regex: /^(\d{1,2})-(\w{3})-(\d{4})$/, parse: (m) => { const months: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' }; return `${m[3]}-${months[m[2].toLowerCase()] || '01'}-${m[1].padStart(2, '0')}`; } },
    { regex: /^(\d{1,2})-(\w{3})-(\d{2})$/, parse: (m) => { const months: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' }; return `20${m[3]}-${months[m[2].toLowerCase()] || '01'}-${m[1].padStart(2, '0')}`; } },
];

export function normalizeDate(value: unknown): string | null {
    if (!value) return null;

    if (value instanceof Date) {
        if (isNaN(value.getTime())) return null;
        return value.toISOString().split('T')[0];
    }

    const str = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
        return str.split('T')[0];
    }

    for (const fmt of DATE_FORMATS) {
        const match = str.match(fmt.regex);
        if (match) return fmt.parse(match);
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
    }

    return null;
}

// ─── Numeric Helpers ──────────────────────────────────────────────────────────

function isDateLike(value: unknown): boolean {
    if (value instanceof Date) return true;
    const s = String(value).trim();
    return /\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/.test(s) || /\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(s) || /\d{1,2}-\w{3}-\d{2,4}/.test(s);
}

function isNumericLike(value: unknown): boolean {
    if (typeof value === 'number') return true;
    const s = String(value).trim().replace(/[$£€R\$¥,\s]/g, '');
    return /^-?\d+([.,]\d+)?$/.test(s);
}

export function parseNumeric(value: unknown): number {
    if (typeof value === 'number') return value;
    if (value === null || value === undefined || value === '') return 0;
    const s = String(value).trim().replace(/[$£€R\$¥\s]/g, '');
    // Handle European number format (1.234,56 → 1234.56)
    if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) {
        return parseFloat(s.replace(/\./g, '').replace(',', '.'));
    }
    // Handle comma as grouping (1,234.56)
    return parseFloat(s.replace(/,/g, '')) || 0;
}

// ═══════════ transformRows ═══════════

const ASSET_CLASS_ALIASES: Record<string, string> = {
    'equity': 'Equity', 'stocks': 'Equity', 'stock': 'Equity', 'ações': 'Equity',
    'crypto': 'Crypto', 'cripto': 'Crypto', 'cryptocurrency': 'Crypto',
    'fixed income': 'Fixed Income', 'fixed-income': 'Fixed Income', 'renda fixa': 'Fixed Income', 'bonds': 'Fixed Income',
    'pension': 'Pension', 'pensions': 'Pension', 'retirement': 'Pension',
    'real estate': 'Real Estate', 'property': 'Real Estate', 'imóveis': 'Real Estate',
    'debt': 'Debt', 'loan': 'Debt', 'dívida': 'Debt',
};

export function transformRows(
    rows: Record<string, unknown>[],
    mapping: ColumnMapping,
    assetClass: string,
    defaultCurrency: string,
    defaultBroker: string
): TransformedTransaction[] {
    const fieldToHeader: Record<string, string> = {};
    for (const [header, field] of Object.entries(mapping)) {
        if (field !== 'ignore') {
            fieldToHeader[field] = header;
        }
    }

    const getVal = (row: Record<string, unknown>, field: string): unknown => {
        const header = fieldToHeader[field];
        return header ? row[header] : undefined;
    };

    return rows.map((row, idx): TransformedTransaction | null => {
        const date = normalizeDate(getVal(row, 'date'));
        if (!date) return null;

        const rawAmount = parseNumeric(getVal(row, 'amount'));
        const rawQuantity = parseNumeric(getVal(row, 'quantity'));
        const rawPrice = parseNumeric(getVal(row, 'price'));
        const currency = getVal(row, 'currency') || defaultCurrency;
        const broker = getVal(row, 'broker') || defaultBroker;
        const typeRaw = String(getVal(row, 'type') || '').trim().toLowerCase();
        const pnl = parseNumeric(getVal(row, 'pnl')) || null;
        const notes = getVal(row, 'notes') || '';

        let type: 'Buy' | 'Sell';
        if (/^(sell|sale|venda|divestment|withdrawal)$/i.test(typeRaw)) {
            type = 'Sell';
        } else if (/^(buy|purchase|compra|investment|deposit)$/i.test(typeRaw)) {
            type = 'Buy';
        } else {
            type = rawAmount < 0 || rawQuantity < 0 ? 'Sell' : 'Buy';
        }

        const amount = Math.abs(rawAmount || (rawQuantity * rawPrice));
        const quantity = Math.abs(rawQuantity);
        const price = rawPrice || (quantity ? amount / quantity : 0);

        const rowAssetClassRaw = String(getVal(row, 'assetClass') || '').trim();
        const effectiveClass = ASSET_CLASS_ALIASES[rowAssetClassRaw.toLowerCase()] || (rowAssetClassRaw || assetClass);

        const tx: TransformedTransaction = {
            _rowIndex: idx,
            date,
            type,
            currency: String(currency).trim().toUpperCase() || defaultCurrency,
            broker: String(broker).trim() || defaultBroker,
            amount,
            notes: String(notes),
            assetClass: effectiveClass,
        };

        // Asset class specific fields
        if (effectiveClass === 'Equity' || effectiveClass === 'Crypto') {
            tx.asset = String(getVal(row, 'asset') || getVal(row, 'ticker') || 'Unknown');
            tx.ticker = String(getVal(row, 'ticker') || '');
            tx.quantity = quantity;
            tx.price = price;
            if (pnl) tx.pnl = pnl;
        } else if (effectiveClass === 'Fixed Income') {
            tx.asset = String(getVal(row, 'asset') || 'Fixed Income');
        } else if (effectiveClass === 'Pension') {
            tx.asset = String(getVal(row, 'asset') || 'Pension Fund');
            tx.quantity = quantity;
            tx.price = price;
        } else if (effectiveClass === 'Real Estate') {
            tx.asset = String(getVal(row, 'asset') || 'Property');
        } else if (effectiveClass === 'Debt') {
            tx.asset = String(getVal(row, 'lender') || getVal(row, 'asset') || 'Unknown Lender');
        }

        return tx;
    }).filter((tx): tx is TransformedTransaction => tx !== null);
}

// ═══════════ getFieldsForAssetClass ═══════════

export function getFieldsForAssetClass(assetClass: string): string[] {
    const common = ['date', 'amount', 'currency', 'broker', 'type', 'notes'];
    switch (assetClass) {
        case 'Equity': return ['date', 'asset', 'ticker', 'quantity', 'price', 'amount', 'currency', 'broker', 'type', 'pnl', 'notes'];
        case 'Crypto': return ['date', 'asset', 'ticker', 'quantity', 'price', 'amount', 'currency', 'broker', 'type', 'pnl', 'notes'];
        case 'Fixed Income': return ['date', 'asset', 'amount', 'currency', 'broker', 'type', 'notes'];
        case 'Pension': return ['date', 'asset', 'quantity', 'price', 'amount', 'broker', 'type', 'notes'];
        case 'Real Estate': return ['date', 'asset', 'amount', 'currency', 'type', 'notes'];
        case 'Debt': return ['date', 'lender', 'amount', 'currency', 'notes'];
        case 'Mixed': return ['date', 'assetClass', 'asset', 'ticker', 'quantity', 'price', 'amount', 'currency', 'broker', 'type', 'pnl', 'notes'];
        default: return common;
    }
}

// ═══════════ Field Labels ═══════════

export const FIELD_LABELS: Record<string, string> = {
    date: 'Date',
    asset: 'Asset Name',
    ticker: 'Ticker Symbol',
    quantity: 'Quantity',
    price: 'Price per Unit',
    amount: 'Total Amount',
    currency: 'Currency',
    broker: 'Broker / Platform',
    type: 'Type (Buy/Sell)',
    pnl: 'Realized P&L',
    notes: 'Notes',
    lender: 'Lender',
    assetClass: 'Asset Class',
    ignore: '— Skip this column —',
};
