import type {
    CurrencyRates,
    FxHistoryMap,
    RealEstateData,
} from '@/types/portfolio.types';

// ═══════════ Internal types ═══════════

interface TransactionInput {
    equity?: RawEquityTx[];
    crypto?: RawCryptoTx[];
    pensions?: RawPensionTx[];
    debt?: RawDebtTx[];
    funds?: RawFundTx[];
    fixedIncome?: RawFixedIncomeTx[];
    realEstate?: RealEstateData | null;
}

interface RawEquityTx {
    id?: string | number;
    date: string;
    ticker?: string;
    broker?: string;
    type?: string;
    quantity?: number;
    price?: number;
    investment?: number;
    currency?: string;
    isSalaryContribution?: boolean;
}

interface RawCryptoTx {
    id?: string | number;
    date: string;
    ticker?: string;
    type?: string;
    quantity?: number;
    price?: number;
    investment?: number;
    currency?: string;
    isSalaryContribution?: boolean;
}

interface RawPensionTx {
    id?: string | number;
    date: string;
    asset?: string;
    broker?: string;
    type?: string;
    value?: number;
    isSalaryContribution?: boolean;
}

interface RawDebtTx {
    id?: string | number;
    date: string;
    lender?: string;
    obs?: string;
    value_brl?: number;
    isSalaryContribution?: boolean;
}

interface RawFundTx {
    id?: string | number;
    date: string;
    [key: string]: unknown;
}

interface RawFixedIncomeTx {
    id?: string | number;
    date: string;
    investment?: number;
    amount?: number;
    account?: string;
    description?: string;
    notes?: string;
    type?: string;
    category?: string;
    currency?: string;
    interest?: number;
    isSalaryContribution?: boolean;
}

export interface NormalizedLedgerEntry {
    id: string | number;
    originalDate: string;
    date: string;
    type: string;
    category: string;
    description: string;
    flow: number;
    amount?: number;
    currency: string;
    isSalaryContribution: boolean;
    tags: (string | undefined)[];
}

export interface IncomeCSVRow {
    month: string;
    salarySavings: number;
    fixedIncome: number;
    equity: number;
    realEstate: number;
    total: number;
}

export interface InvestmentCSVRow {
    month: string;
    fixedIncome: number;
    equity: number;
    realEstate: number;
    pensions: number;
    crypto: number;
    debt: number;
    total: number;
}

export interface MonthlyIncomeEntry {
    month: string;
    salary: number;
    realEstate: number;
    equity: number;
    fixedIncome: number;
    extraordinary: number;
    isHistorical: boolean;
    total?: number;
}

export interface MonthlyInvestmentEntry {
    month: string;
    equity: number;
    fixedIncome: number;
    realEstate: number;
    pensions: number;
    crypto: number;
    debt: number;
    isHistorical: boolean;
    total?: number;
}

// ═══════════ Month name lookup ═══════════

const MONTH_MAP: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

// ═══════════ normalizeTransactions ═══════════

export const normalizeTransactions = (
    {
        equity = [],
        crypto = [],
        pensions = [],
        debt = [],
        fixedIncome = [],
        realEstate = null
    }: TransactionInput,
    rates: CurrencyRates = { GBP: 1, BRL: 1, USD: 1 },
    fxHistory: FxHistoryMap = {}
): NormalizedLedgerEntry[] => {
    const all: NormalizedLedgerEntry[] = [];

    // Helper to get historical rate
    const getRate = (currency: string, dateStr: string): number => {
        if (!currency || currency === 'GBP') return 1;
        const month = dateStr.substring(0, 7);
        if (fxHistory[month]?.[currency]) {
            return fxHistory[month][currency];
        }
        return rates[currency] || 1;
    };

    // Helper to parse date → YYYY-MM-DD
    const parseDate = (d: string | undefined | null): string => {
        if (!d) return '1970-01-01';
        if (d.includes('/')) {
            const [day, month, year] = d.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return d;
    };

    // 1. Equity
    equity.forEach((tr) => {
        const dateISO = parseDate(tr.date);
        const rate = getRate(tr.currency || 'GBP', dateISO);
        const type = tr.type || 'Buy';

        all.push({
            id: tr.id || `eq-${Math.random()}`,
            originalDate: tr.date,
            date: dateISO,
            type: type === 'Buy' ? 'Investment' : 'Divestment',
            category: 'Equity',
            description: `${type} ${tr.quantity || 0} ${tr.ticker || 'Cash'} @ ${tr.broker || ''}`,
            amount: Math.abs(tr.investment || 0),
            flow: (type === 'Buy' ? -(Math.abs(tr.investment || 0)) : (Math.abs(tr.investment || 0))) / rate,
            currency: 'GBP',
            isSalaryContribution: tr.isSalaryContribution || false,
            tags: [tr.broker, tr.ticker]
        });
    });

    // 2. Crypto
    crypto.forEach((tr) => {
        const dateISO = parseDate(tr.date);
        const currency = tr.currency || 'USD';
        const rate = getRate(currency, dateISO);

        all.push({
            id: tr.id || `cr-${Math.random()}`,
            originalDate: tr.date,
            date: dateISO,
            type: tr.type === 'Buy' ? 'Investment' : 'Divestment',
            category: 'Crypto',
            description: `${tr.type || 'Buy'} ${tr.quantity || 0} ${tr.ticker || ''}`,
            flow: (tr.type === 'Buy' ? -(Math.abs(tr.investment || 0)) : (Math.abs(tr.investment || 0))) / rate,
            currency: 'GBP',
            isSalaryContribution: tr.isSalaryContribution || false,
            tags: [tr.ticker]
        });
    });

    // 3. Debt
    debt.forEach((tr) => {
        const dateISO = parseDate(tr.date);
        const rate = getRate('BRL', dateISO);

        all.push({
            id: tr.id || `db-${Math.random()}`,
            originalDate: tr.date,
            date: dateISO,
            type: 'Debt Repayment',
            category: 'Debt',
            description: `Payment to ${tr.lender || ''} (${tr.obs || ''})`,
            flow: -(Math.abs(tr.value_brl || 0)) / rate,
            currency: 'GBP',
            isSalaryContribution: tr.isSalaryContribution || false,
            tags: [tr.lender]
        });
    });

    // 4. Pensions
    pensions.forEach((tr) => {
        const dateISO = parseDate(tr.date);
        const rate = getRate('GBP', dateISO);

        all.push({
            id: tr.id || `pn-${Math.random()}`,
            originalDate: tr.date,
            date: dateISO,
            type: tr.type === 'Buy' ? 'Contribution' : 'Withdrawal',
            category: 'Pension',
            description: `${tr.type || ''} ${tr.asset || ''} @ ${tr.broker || ''}`,
            flow: (tr.type === 'Buy' ? -(Math.abs(tr.value || 0)) : (Math.abs(tr.value || 0))) / rate,
            currency: 'GBP',
            isSalaryContribution: tr.isSalaryContribution || false,
            tags: [tr.broker, 'Retirement']
        });
    });

    // 5. Fixed Income / Funds
    fixedIncome.forEach((tr) => {
        if (tr.category && tr.category !== 'Fixed Income') return;

        const dateISO = parseDate(tr.date);
        const currency = tr.currency || 'GBP';
        const rate = getRate(currency, dateISO);

        const investmentVal = tr.investment !== undefined ? tr.investment : (tr.amount || 0);
        const accountName = tr.account || tr.description || '';
        const notesVal = tr.notes || '';

        let flowType: string;
        if (tr.type === 'Investment' || tr.type === 'Expense') {
            flowType = investmentVal > 0 ? 'Investment' : 'Withdrawal';
        } else if (tr.type === 'Income') {
            flowType = 'Withdrawal';
        } else {
            flowType = investmentVal > 0 ? 'Investment' : 'Withdrawal';
        }

        all.push({
            id: tr.id || `fi-${Math.random()}`,
            originalDate: tr.date,
            date: dateISO,
            type: flowType,
            category: tr.category || 'Fixed Income',
            description: `${accountName} (${notesVal})`,
            flow: -(investmentVal) / rate,
            currency: 'GBP',
            isSalaryContribution: tr.isSalaryContribution || false,
            tags: [accountName]
        });
    });

    // 6. Real Estate (Ink Court ledger)
    if (realEstate?.inkCourt?.ledger) {
        interface InkCourtLedgerEntry {
            id?: string | number;
            date?: string;
            month?: string;
            source?: string;
            type?: string;
            category?: string;
            item?: string;
            amount?: number;
            cost?: number;
            principal?: number;
            isSalaryContribution?: boolean;
        }

        (realEstate.inkCourt.ledger as InkCourtLedgerEntry[]).forEach((tr) => {
            let dateISO = parseDate(tr.date);
            if ((!tr.date || dateISO === '1970-01-01') && tr.month) {
                const [mmm, yy] = tr.month.split('-');
                dateISO = `20${yy}-${MONTH_MAP[mmm] || '01'}-01`;
            }

            const rate = getRate('GBP', dateISO);

            let amount = 0;
            let type = 'Real Estate Cost';

            if (tr.source === 'Mortgage') {
                amount = tr.principal || 0;
                type = 'Mortgage Principal';
            } else if (tr.type === 'Investment' || tr.category === 'Investment' || tr.source === 'Deposit' || tr.source === 'Stamp Duty') {
                amount = tr.amount || tr.cost || tr.principal || 0;
                type = 'Investment';
            }

            if (amount > 0) {
                all.push({
                    id: tr.id || `re-ink-${Math.random()}`,
                    originalDate: tr.date || tr.month || '',
                    date: dateISO,
                    type: type,
                    category: 'Real Estate',
                    description: `Ink Court: ${tr.item || tr.source || ''} (${tr.category || ''})`,
                    flow: -(Math.abs(amount)) / rate,
                    currency: 'GBP',
                    isSalaryContribution: tr.isSalaryContribution || false,
                    tags: ['Ink Court', tr.category]
                });
            }
        });
    }

    // Sort by date desc
    return all.sort((a, b) => b.date.localeCompare(a.date));
};

// ═══════════ parseLedgerCSV ═══════════

export const parseLedgerCSV = (csvText: string | null | undefined): { income: IncomeCSVRow[]; investments: InvestmentCSVRow[] } => {
    if (!csvText) return { income: [], investments: [] };

    const lines = csvText.split('\n');
    const incomeData: IncomeCSVRow[] = [];
    const investmentData: InvestmentCSVRow[] = [];

    let dataStartIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Month/Year')) {
            dataStartIndex = i + 1;
            break;
        }
    }

    if (dataStartIndex === -1) return { income: [], investments: [] };

    const parseVal = (v: string | undefined): number => {
        if (!v) return 0;
        const clean = v.replace(/[£,\s]/g, '');
        return parseFloat(clean) || 0;
    };

    for (let i = dataStartIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c: string) => c.trim().replace(/^"|"$/g, '').trim());

        const dateStr = cols[1];
        if (!dateStr || !dateStr.includes('/')) continue;

        const [mmm, yyyy] = dateStr.split('/');
        const mm = MONTH_MAP[mmm] || '01';
        const isoMonth = `${yyyy}-${mm}`;

        // Income
        incomeData.push({
            month: isoMonth,
            salarySavings: parseVal(cols[2]),
            fixedIncome: parseVal(cols[3]),
            equity: parseVal(cols[4]),
            realEstate: parseVal(cols[5]),
            total: parseVal(cols[6])
        });

        // Investments
        investmentData.push({
            month: isoMonth,
            fixedIncome: parseVal(cols[9]),
            equity: parseVal(cols[10]),
            realEstate: parseVal(cols[11]),
            pensions: parseVal(cols[12]),
            crypto: parseVal(cols[13]),
            debt: parseVal(cols[14]),
            total: parseVal(cols[15])
        });
    }

    return { income: incomeData, investments: investmentData };
};

// ═══════════ calculateMonthlyIncome ═══════════

export const calculateMonthlyIncome = (
    transactions: NormalizedLedgerEntry[],
    realEstate: RealEstateData | null,
    historicalIncome: IncomeCSVRow[],
    fixedIncomeTransactions: RawFixedIncomeTx[] = []
): MonthlyIncomeEntry[] => {
    const map: Record<string, MonthlyIncomeEntry> = {};

    const newEntry = (month: string, isHistorical: boolean): MonthlyIncomeEntry => ({
        month, salary: 0, realEstate: 0, equity: 0, fixedIncome: 0, extraordinary: 0, isHistorical
    });

    historicalIncome.forEach((h) => {
        if (!map[h.month]) map[h.month] = newEntry(h.month, true);
        map[h.month].salary += h.salarySavings || 0;
        map[h.month].fixedIncome += h.fixedIncome || 0;
        map[h.month].realEstate += h.realEstate || 0;
        map[h.month].equity += h.equity || 0;
    });

    // 2. Process Live Data
    transactions.forEach((tr) => {
        const m = tr.date.slice(0, 7);
        if (!map[m]) map[m] = newEntry(m, false);

        // A. Salary Contributions
        if (tr.isSalaryContribution) {
            if (!map[m].isHistorical || map[m].salary === 0) {
                map[m].salary += Math.abs(tr.flow || 0);
            }
        }

        // B. Equity Income (Amazon Vesting)
        if (tr.category === 'Equity' && (tr.tags.includes('Amazon') || tr.description.includes('Amazon')) && tr.type === 'Investment') {
            if (!tr.isSalaryContribution) {
                if (!map[m].isHistorical || map[m].equity === 0) {
                    map[m].equity += Math.abs(tr.flow || 0);
                }
            }
        }
    });

    // C. Real Estate Revenue (Airbnb Ledger)
    interface AirbnbLedgerRow { month?: string; revenue?: number }
    const airbnb = realEstate as Record<string, unknown> | null;
    const airbnbObj = airbnb?.airbnb as { ledger?: AirbnbLedgerRow[] } | undefined;
    if (airbnbObj?.ledger) {
        airbnbObj.ledger.forEach((row) => {
            if (!row.month || !row.month.includes('-')) return;
            const [mmm, yy] = row.month.split('-');
            const m = `20${yy}-${MONTH_MAP[mmm] || '01'}`;
            if (!map[m]) map[m] = newEntry(m, false);

            if (!map[m].isHistorical || map[m].realEstate === 0) {
                const BRL_TO_GBP = 7.0;
                map[m].realEstate += (row.revenue || 0) / BRL_TO_GBP;
            }
        });
    }

    // D. Fixed Income Interest
    if (fixedIncomeTransactions.length > 0) {
        fixedIncomeTransactions.forEach((tr) => {
            if (tr.interest && tr.interest > 0) {
                let m = '';
                if (tr.date.includes('/')) {
                    const [, mm, yyyy] = tr.date.split('/');
                    m = `${yyyy}-${mm}`;
                } else {
                    m = tr.date.slice(0, 7);
                }

                if (!map[m]) map[m] = newEntry(m, false);

                if (!map[m].isHistorical || map[m].fixedIncome === 0) {
                    let val = tr.interest;
                    if (tr.currency === 'BRL') val /= 7.0;
                    else if (tr.currency === 'USD') val /= 1.25;
                    map[m].fixedIncome += val;
                }
            }
        });
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (!map[currentMonth]) {
        map[currentMonth] = newEntry(currentMonth, false);
    }

    return Object.values(map)
        .map((d) => ({
            ...d,
            total: d.salary + d.realEstate + d.equity + d.fixedIncome + d.extraordinary
        }))
        .filter((d) => d.month <= currentMonth && (d.month === currentMonth || d.salary !== 0 || d.realEstate !== 0 || d.equity !== 0 || d.fixedIncome !== 0 || d.extraordinary !== 0))
        .sort((a, b) => b.month.localeCompare(a.month));
};

// ═══════════ calculateMonthlyInvestments ═══════════

export const calculateMonthlyInvestments = (
    allTransactions: NormalizedLedgerEntry[],
    historicalInvestments: InvestmentCSVRow[]
): MonthlyInvestmentEntry[] => {
    const map: Record<string, MonthlyInvestmentEntry> = {};

    const newEntry = (month: string, isHistorical: boolean): MonthlyInvestmentEntry => ({
        month, equity: 0, fixedIncome: 0, realEstate: 0, pensions: 0, crypto: 0, debt: 0, isHistorical
    });

    // 1. Historical
    historicalInvestments.forEach((h) => {
        if (!map[h.month]) map[h.month] = newEntry(h.month, true);
        map[h.month].equity += (h.equity || 0);
        map[h.month].fixedIncome += (h.fixedIncome || 0);
        map[h.month].realEstate += (h.realEstate || 0);
        map[h.month].pensions += (h.pensions || 0);
        map[h.month].crypto += (h.crypto || 0);
        map[h.month].debt += (h.debt || 0);
    });

    // 2. Live
    allTransactions.forEach((tr) => {
        const m = tr.date.slice(0, 7);
        if (!m || m < '2020-01') return;

        if (!map[m]) map[m] = newEntry(m, false);

        // RECONCILIATION: If month exists in CSV history, use CSV data ONLY.
        if (map[m].isHistorical) return;

        const val = -(tr.flow || 0);

        if (tr.category === 'Equity') map[m].equity += val;
        else if (tr.category === 'Crypto') map[m].crypto += val;
        else if (tr.category === 'Pension') map[m].pensions += val;
        else if (tr.category === 'Real Estate') map[m].realEstate += val;
        else if (tr.category === 'Fixed Income') map[m].fixedIncome += val;
        else if (tr.category === 'Debt' || tr.type === 'Debt Repayment') map[m].debt += val;
    });

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (!map[currentMonth]) {
        map[currentMonth] = newEntry(currentMonth, false);
    }

    return Object.values(map)
        .map((d) => ({
            ...d,
            total: d.equity + d.fixedIncome + d.realEstate + d.pensions + d.crypto + d.debt
        }))
        .filter((d) => d.month <= currentMonth)
        .sort((a, b) => b.month.localeCompare(a.month));
};
