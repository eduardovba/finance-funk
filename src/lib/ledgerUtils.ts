/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck — To be properly typed in next sprint

export const normalizeTransactions = (
    {
        equity = [],
        crypto = [],
        pensions = [],
        debt = [],
        funds = [], // from Real Estate funds or Fixed Income
        fixedIncome = [], // from manual bank/fixed income
        realEstate = null // real estate object
    }: any,
    rates: any = { GBP: 1, BRL: 1, USD: 1 },
    fxHistory: any = {}
) => {
    let all = [];

    // Helper to get historical rate
    const getRate = (currency: string, dateStr: string): number => {
        if (!currency || currency === 'GBP') return 1;
        // Try to match YYYY-MM
        const month = dateStr.substr(0, 7);
        if (fxHistory && fxHistory[month] && fxHistory[month][currency]) {
            return fxHistory[month][currency];
        }
        return rates[currency] || 1;
    };

    // Helper to parse date
    // Most dates are YYYY-MM-DD from forms, but some might be DD/MM/YYYY?
    // Let's standardise on YYYY-MM-DD strings for sorting
    const parseDate = (d: any): any => {
        if (!d) return '1970-01-01';
        if (d.includes('/')) {
            // assume DD/MM/YYYY
            const [day, month, year] = d.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return d; // assume YYYY-MM-DD
    };

    // 1. Equity
    // Structure: { date, ticker, broker, type (Buy/Sell), quantity, price, investment (total cost), currency, isSalaryContribution }
    equity.forEach((tr: any) => {
        const dateISO = parseDate(tr.date);
        const rate = getRate(tr.currency, dateISO);
        // Default to 'Buy' if type is missing (e.g. Cash deposits)
        const type = tr.type || 'Buy';

        all.push({
            id: tr.id || `eq-${Math.random()}`,
            originalDate: tr.date,
            date: dateISO,
            type: type === 'Buy' ? 'Investment' : 'Divestment',
            category: 'Equity',
            description: `${type} ${tr.quantity} ${tr.ticker || 'Cash'} @ ${tr.broker}`,
            amount: Math.abs(tr.investment),
            flow: (type === 'Buy' ? -(Math.abs(tr.investment)) : (Math.abs(tr.investment))) / rate,
            currency: 'GBP', // Normalized to GBP
            isSalaryContribution: tr.isSalaryContribution || false,
            tags: [tr.broker, tr.ticker]
        });
    });

    // 2. Crypto
    // Structure: { date, ticker, type (Buy/Sell), quantity, price, investment }
    crypto.forEach((tr: any) => {
        const dateISO = parseDate(tr.date);
        const currency = tr.currency || 'USD'; // Default to USD for crypto if not specified
        const rate = getRate(currency, dateISO);

        all.push({
            id: tr.id || `cr-${Math.random()}`,
            originalDate: tr.date,
            date: dateISO,
            type: tr.type === 'Buy' ? 'Investment' : 'Divestment',
            category: 'Crypto',
            description: `${tr.type} ${tr.quantity} ${tr.ticker}`,
            flow: (tr.type === 'Buy' ? -(Math.abs(tr.investment)) : (Math.abs(tr.investment))) / rate,
            currency: 'GBP',
            isSalaryContribution: tr.isSalaryContribution || false,
            tags: [tr.ticker]
        });
    });

    // 3. Debt
    debt.forEach((tr: any) => {
        const dateISO = parseDate(tr.date);
        const rate = getRate('BRL', dateISO); // Debt values are in BRL

        all.push({
            id: tr.id || `db-${Math.random()}`,
            originalDate: tr.date,
            date: dateISO,
            type: 'Debt Repayment',
            category: 'Debt',
            description: `Payment to ${tr.lender} (${tr.obs || ''})`,
            flow: -(Math.abs(tr.value_brl || 0)) / rate, // Convert BRL to GBP using historical rate
            currency: 'GBP',
            isSalaryContribution: tr.isSalaryContribution || false,
            tags: [tr.lender]
        });
    });

    // 4. Pensions
    pensions.forEach((tr: any) => {
        const dateISO = parseDate(tr.date);
        const rate = getRate('GBP', dateISO); // Pensions are GBP

        all.push({
            id: tr.id || `pn-${Math.random()}`,
            originalDate: tr.date,
            date: dateISO,
            type: tr.type === 'Buy' ? 'Contribution' : 'Withdrawal',
            category: 'Pension',
            description: `${tr.type} ${tr.asset} @ ${tr.broker}`,
            flow: (tr.type === 'Buy' ? -(Math.abs(tr.value)) : (Math.abs(tr.value))) / rate,
            currency: 'GBP',
            isSalaryContribution: tr.isSalaryContribution || false, // User likely added this?
            tags: [tr.broker, 'Retirement']
        });
    });

    // 5. Fixed Income / Funds
    fixedIncome.forEach((tr: any) => {
        // Skip entries that belong to other categories (they're handled by their own sections)
        if (tr.category && tr.category !== 'Fixed Income') return;
        
        const dateISO = parseDate(tr.date);
        const currency = tr.currency || 'GBP';
        const rate = getRate(currency, dateISO);

        // Support both legacy format (investment/account/notes) and new API format (amount/description/type)
        const investmentVal = tr.investment !== undefined ? tr.investment : (tr.amount || 0);
        const accountName = tr.account || tr.description || '';
        const notesVal = tr.notes || '';

        // Determine type from the data
        let flowType;
        if (tr.type === 'Investment' || tr.type === 'Expense') {
            flowType = investmentVal > 0 ? 'Investment' : 'Withdrawal';
        } else if (tr.type === 'Income') {
            flowType = 'Withdrawal'; // Income/divestment
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

    // 6. Real Estate Funds (if separate from Fixed Income/Equity)
    // `realEstate.funds.holdings` or `realEstate.json` transactions?
    if (realEstate && realEstate.inkCourt && realEstate.inkCourt.ledger) {
        realEstate.inkCourt.ledger.forEach((tr: any) => {
            // Parse Date from "Feb-26" if date is missing
            let dateISO = parseDate(tr.date);
            if ((!tr.date || tr.date === '1970-01-01') && tr.month) {
                const [mmm, yy] = tr.month.split('-');
                const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
                dateISO = `20${yy}-${months[mmm] || '01'}-01`;
            }

            const rate = getRate('GBP', dateISO); // Ink Court is GBP

            // Determine if this is an Investment (Capital Injection)
            // User Rule: "Real Estate should include the Principal portion of the mortgage payments"
            let amount = 0;
            let type = 'Real Estate Cost';

            if (tr.source === 'Mortgage') {
                // Only count Principal
                amount = tr.principal || 0;
                type = 'Mortgage Principal';
            } else if (tr.type === 'Investment' || tr.category === 'Investment' || tr.source === 'Deposit' || tr.source === 'Stamp Duty') {
                // Initial Investments, Deposits, Stamp Duty are Capital Injections
                amount = tr.amount || tr.cost || tr.principal || 0;
                type = 'Investment';
            }

            if (amount > 0) {
                all.push({
                    id: tr.id || `re-ink-${Math.random()}`,
                    originalDate: tr.date || tr.month,
                    date: dateISO,
                    type: type,
                    category: 'Real Estate',
                    description: `Ink Court: ${tr.item || tr.source} (${tr.category})`,
                    flow: -(Math.abs(amount)) / rate, // Negative flow = Investment
                    currency: 'GBP',
                    isSalaryContribution: tr.isSalaryContribution || false,
                    tags: ['Ink Court', tr.category]
                });
            }
        });
    }

    // Sort by date desc
    return all.sort((a: any, b: any) => b.date.localeCompare(a.date));
};

export const parseLedgerCSV = (csvText) => {
    if (!csvText) return { income: [], investments: [] };

    const lines = csvText.split('\n');
    const incomeData = [];
    const investmentData = [];

    // Columns based on Ledger.csv structure
    // Row 8 (index 7) is header: Month/Year, Salary Savings, Fixed Income, Equity, Real Estate, Total,, Month/Year...
    // But data starts around row 9.
    // Let's find the header row dynamically or hardcode if stable.

    let dataStartIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Month/Year')) {
            dataStartIndex = i + 1;
            break;
        }
    }

    if (dataStartIndex === -1) return { income: [], investments: [] };

    for (let i = dataStartIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // CSV parser (simple split by comma, handling quotes is tricky but data looks simple)
        // Data has " £56,839 " so we need to handle quotes.
        // Let's use a regex to split by comma ignoring commas in quotes
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c: any) => c.trim().replace(/^"|"$/g, '').trim());

        // Income Section (Cols 0-6: Empty, Month/Year, Salary Savings, Fixed Income, Equity, Real Estate, Total)
        // Wait, look at line 8 in viewed file:
        // ,Month/Year,Salary Savings,Fixed Income,Equity,Real Estate,Total,,Month/Year,Fixed Income,Equity,Real Estate,Pension Funds,Crypto,Debt,Total,
        // So:
        // Col 1: Month/Year
        // Col 2: Salary Savings
        // Col 3: Fixed Income (Income)
        // Col 4: Equity (Income - Divs?)
        // Col 5: Real Estate (Income - Rent?)
        // Col 6: Total

        // Investments Section (Cols 8-15)
        // Col 8: Month/Year (Redundant check)
        // Col 9: Fixed Income
        // Col 10: Equity
        // Col 11: Real Estate
        // Col 12: Pension Funds
        // Col 13: Crypto
        // Col 14: Debt
        // Col 15: Total

        const dateStr = cols[1];
        if (!dateStr || !dateStr.includes('/')) continue; // Skip totals or empty lines

        // Parse "Dec/2020" -> "2020-12"
        const [mmm, yyyy] = dateStr.split('/');
        const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
        const mm = months[mmm] || '01';
        const isoMonth = `${yyyy}-${mm}`;

        const parseVal = (v: any): number => {
            if (!v) return 0;
            // Remove £, commas
            const clean = v.replace(/[£,\s]/g, '');
            return parseFloat(clean) || 0;
        };

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

export const calculateMonthlyIncome = (transactions, realEstate, historicalIncome, fixedIncomeTransactions = []) => {
    // 1. Initialize map with historical data
    const map = {};

    historicalIncome.forEach((h: any) => {
        if (!map[h.month]) map[h.month] = {
            month: h.month,
            salary: 0,
            realEstate: 0,
            equity: 0,
            fixedIncome: 0,
            extraordinary: 0,
            isHistorical: true
        };
        map[h.month].salary += h.salarySavings || 0;
        map[h.month].fixedIncome += h.fixedIncome || 0;
        map[h.month].realEstate += h.realEstate || 0;
        map[h.month].equity += h.equity || 0;
        map[h.month].extraordinary += h.extraordinary || 0;
    });

    // 2. Process Live Data
    transactions.forEach((tr: any) => {
        const m = tr.date.slice(0, 7);
        if (!map[m]) map[m] = { month: m, salary: 0, realEstate: 0, equity: 0, fixedIncome: 0, extraordinary: 0, isHistorical: false };

        // A. Salary Contributions
        if (tr.isSalaryContribution) {
            // Only add live salary if historical salary is 0 to avoid double counting
            if (!map[m].isHistorical || map[m].salary === 0) {
                map[m].salary += Math.abs(tr.flow || 0);
            }
        }

        // B. Equity Income (Amazon Vesting)
        if (tr.category === 'Equity' && (tr.tags.includes('Amazon') || tr.description.includes('Amazon')) && tr.type === 'Investment') {
            if (!tr.isSalaryContribution) {
                // If historical equity is 0, supplement with live data
                if (!map[m].isHistorical || map[m].equity === 0) {
                    map[m].equity += Math.abs(tr.flow || 0);
                }
            }
        }
    });

    // C. Real Estate Revenue (Airbnb Ledger)
    if (realEstate && realEstate.airbnb && realEstate.airbnb.ledger) {
        realEstate.airbnb.ledger.forEach((row: any) => {
            // Parse month: "Feb-26" -> "2026-02"
            if (!row.month || !row.month.includes('-')) return;
            const [mmm, yy] = row.month.split('-');
            const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
            const m = `20${yy}-${months[mmm] || '01'}`;
            if (!map[m]) map[m] = { month: m, salary: 0, realEstate: 0, equity: 0, fixedIncome: 0, extraordinary: 0, isHistorical: false };

            // If historical realEstate is 0, supplement with live data
            if (!map[m].isHistorical || map[m].realEstate === 0) {
                // Approximate BRL to GBP conversion based on historical rate
                const BRL_TO_GBP = 7.0;
                map[m].realEstate += (row.revenue || 0) / BRL_TO_GBP;
            }
        });
    }

    // D. Fixed Income Interest (from Transaction Ledger)
    if (fixedIncomeTransactions && fixedIncomeTransactions.length > 0) {
        fixedIncomeTransactions.forEach((tr: any) => {
            if (tr.interest && tr.interest > 0) {
                // tr.date is DD/MM/YYYY or YYYY-MM-DD?
                // `transactions.json` has "13/02/2025".
                let m = '';
                if (tr.date.includes('/')) {
                    const [d, mm, yyyy] = tr.date.split('/');
                    m = `${yyyy}-${mm}`;
                } else {
                    m = tr.date.slice(0, 7);
                }

                if (!map[m]) map[m] = { month: m, salary: 0, realEstate: 0, equity: 0, fixedIncome: 0, extraordinary: 0, isHistorical: false };

                // If historical fixedIncome is 0, supplement with live data
                if (!map[m].isHistorical || map[m].fixedIncome === 0) {
                    let val = tr.interest;
                    if (tr.currency === 'BRL') val /= 7.0; // Fallback
                    else if (tr.currency === 'USD') val /= 1.25; // Fallback
                    map[m].fixedIncome += val;
                }
            }
        });
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Ensure current month exists even if no transactions yet
    if (!map[currentMonth]) {
        map[currentMonth] = { month: currentMonth, salary: 0, realEstate: 0, equity: 0, fixedIncome: 0, extraordinary: 0, isHistorical: false };
    }

    return Object.values(map)
        .map((d: any) => ({
            ...d,
            total: d.salary + d.realEstate + d.equity + d.fixedIncome + d.extraordinary
        }))
        .filter((d: any) => d.month <= currentMonth && (d.month === currentMonth || d.salary !== 0 || d.realEstate !== 0 || d.equity !== 0 || d.fixedIncome !== 0 || d.extraordinary !== 0))
        .sort((a: any, b: any) => b.month.localeCompare(a.month));
};

export const calculateMonthlyInvestments = (allTransactions, historicalInvestments) => {
    const map = {};

    // 1. Historical
    historicalInvestments.forEach((h: any) => {
        if (!map[h.month]) map[h.month] = { month: h.month, equity: 0, fixedIncome: 0, realEstate: 0, pensions: 0, crypto: 0, debt: 0, isHistorical: true };
        map[h.month].equity += (h.equity || 0);
        map[h.month].fixedIncome += (h.fixedIncome || 0);
        map[h.month].realEstate += (h.realEstate || 0);
        map[h.month].pensions += (h.pension || h.pensions || 0); // Handle both singular and plural
        map[h.month].crypto += (h.crypto || 0);
        map[h.month].debt += (h.debt || 0);
    });

    // 2. Live
    allTransactions.forEach((tr: any) => {
        const m = tr.date.slice(0, 7);
        if (!m || m < '2020-01') return; // Skip invalid or very old

        if (!map[m]) map[m] = { month: m, equity: 0, fixedIncome: 0, realEstate: 0, pensions: 0, crypto: 0, debt: 0, isHistorical: false };

        // RECONCILIATION: If month exists in CSV history, use CSV data ONLY.
        if (map[m].isHistorical) return;

        // We calculate NET Investment (Capital Injection - Withdrawals).
        // Flow is Negative for Investment (Money Out), Positive for Divestment (Money In).
        // We want Positive Value for Investment. So we add (-flow).
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

    // Ensure current month exists
    if (!map[currentMonth]) {
        map[currentMonth] = { month: currentMonth, equity: 0, fixedIncome: 0, realEstate: 0, pensions: 0, crypto: 0, debt: 0, isHistorical: false };
    }

    return Object.values(map)
        .map((d: any) => ({
            ...d,
            total: d.equity + d.fixedIncome + d.realEstate + d.pensions + d.crypto + d.debt
        }))
        .filter((d: any) => d.month <= currentMonth)
        .sort((a: any, b: any) => b.month.localeCompare(a.month));
};
