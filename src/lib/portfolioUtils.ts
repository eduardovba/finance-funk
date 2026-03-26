import pensionMap from '../data/pension_fund_map.json';
import type {
    CurrencyRates,
    AssetClassesMap,
    MarketDataMap,
    PensionPricesMap,
    AssetHolding,
    IndividualHolding,
    TotalRow,
    CategorySummaryResult,
    PensionFundMapEntry,
    RealEstateData,
    CurrencyCode,
} from '@/types/portfolio.types';

// ═══════════ Helpers ═══════════

const parseDate = (d: string | number | Date | null | undefined): Date => {
    if (!d) return new Date(0);
    if (typeof d !== 'string') return new Date(d);
    if (d.includes('/')) {
        const [day, month, year] = d.split('/');
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
    return new Date(d);
};

const BROKER_CURRENCY: Record<string, CurrencyCode> = {
    'Trading 212': 'GBP', 'XP': 'BRL', 'Amazon': 'USD', 'GGF': 'USD', 'Green Gold Farms': 'USD', 'Monzo': 'GBP', 'Fidelity': 'GBP',
    'Hargreaves Lansdown': 'GBP', 'Legal & General': 'GBP', 'OAB': 'GBP'
};

const normalizeName = (name: string | null | undefined): string => {
    if (!name) return 'Unknown';
    const lower = name.toLowerCase();
    if (lower.includes('nubank')) return 'NuBank';
    if (lower.includes('xp')) return 'XP';
    if (lower.includes('inter')) return 'Inter';
    if (lower.includes('santander')) return 'Santander';
    if (lower.includes('monzo')) return 'Monzo';
    if (lower.includes('fidelity')) return 'Fidelity';

    // Fallback for sub-account names that should be under XP
    if (['post-fixated', 'inflation', 'pre-fixated'].includes(lower)) return 'XP';

    return name;
};

// ═══════════ Internal Types ═══════════

interface FixedIncomeAccount {
    name: string;
    gbp: number;
    brl: number;
    investmentGBP: number;
    investmentBRL: number;
    grossInvGBP: number;
    nativeCurrency: string;
    syncValue: number | null;
    interestTotal: number;
}

interface FixedIncomeTx {
    id?: string | number;
    date: string;
    currency?: string;
    investment?: number;
    interest?: number;
    broker?: string;
    account?: string;
    asset?: string;
    notes?: string;
    type?: string;
}

interface EquityTx {
    id?: string | number;
    date: string;
    asset: string;
    ticker?: string;
    broker: string;
    currency?: string;
    quantity?: number;
    investment: number;
    type?: string;
    pnl?: number;
    isSalaryContribution?: boolean;
}

interface CryptoTx {
    id?: string | number;
    date: string;
    ticker: string;
    asset?: string;
    currency?: string;
    quantity?: number;
    investment: number;
    type?: string;
}

interface PensionTx {
    id?: string | number;
    date: string;
    asset: string;
    broker: string;
    allocationClass?: string;
    quantity?: number | string;
    price?: number | string;
    value?: number | string;
    type?: string;
}

interface DebtTx {
    id?: string | number;
    date: string;
    lender?: string;
    value_brl?: number;
    obs?: string;
}

interface RealEstatePropertyInput {
    id?: string;
    name: string;
    status?: string;
    investment?: number;
    currentValue?: number;
    taxes?: number;
    salePrice?: number;
    currency?: string;
    airbnbData?: { monthlyData?: Record<string, { costs?: number; revenue?: number }> };
    [key: string]: unknown;
}

interface EquityHoldingInternal {
    asset: string;
    qty: number;
    totalCost: number;
    broker: string;
    currency: string;
    ticker: string | null;
}

interface BrokerAccum {
    cvGBP: number;
    ppGBP: number;
    lockedGBP?: number;
}

interface CryptoHolding {
    ticker: string;
    qty: number;
    netInvestment: number;
    name: string;
}

interface PensionHoldingInternal {
    asset: string;
    qty: number;
    totalCost: number;
    broker: string;
}

interface PensionMasterHolding {
    asset: string;
    qty: number;
    broker: string;
    allocationClass?: string;
}

// ═══════════ Currency Conversion Helpers ═══════════

const toGBPSimple = (val: number, cur: string, rates: CurrencyRates): number => {
    if (cur === 'GBP') return val;
    if (cur === 'BRL') return val / rates.BRL;
    if (cur === 'USD') return val / rates.USD;
    return val;
};

// ═══════════ getFixedIncomeSummary ═══════════

export const getFixedIncomeSummary = (
    transactions: FixedIncomeTx[],
    rates: CurrencyRates,
    endDate: string | null = null,
    assetClasses: AssetClassesMap = {}
): CategorySummaryResult => {
    const accountMap: Record<string, FixedIncomeAccount> = {};

    transactions.forEach((tr) => {
        if (endDate && parseDate(tr.date) > parseDate(endDate)) return;

        const cur = tr.currency || 'BRL';

        const toGBP = (val: number): number => cur === 'GBP' ? val : val / (cur === 'BRL' ? rates.BRL : rates.USD);

        const investment = tr.investment || 0;
        const interest = tr.interest || 0;

        const gbpVal = toGBP(investment + interest);
        const invGbp = toGBP(investment);

        const name = normalizeName(tr.broker || tr.account || tr.asset);
        if (!accountMap[name]) {
            accountMap[name] = { name, gbp: 0, brl: 0, investmentGBP: 0, investmentBRL: 0, grossInvGBP: 0, nativeCurrency: cur, syncValue: null, interestTotal: 0 };
        }

        // Pass 1 logic: gather stats
        if (tr.notes === 'Pluggy Sync') {
            accountMap[name].syncValue = (accountMap[name].syncValue || 0) + (investment + interest);
        } else if (tr.type === 'Interest') {
            accountMap[name].interestTotal += (investment + interest);
        } else {
            if (accountMap[name].syncValue === null) {
                accountMap[name].investmentGBP += invGbp;
                accountMap[name].investmentBRL += invGbp * rates.BRL;
                if (investment > 0) {
                    accountMap[name].grossInvGBP += invGbp;
                }
            }
        }

        accountMap[name].gbp += gbpVal;
        accountMap[name].brl += gbpVal * rates.BRL;
    });

    // Pass 2 logic: override synced totals
    Object.values(accountMap).forEach((acc) => {
        if (acc.syncValue !== null) {
            const finalLocalVal = acc.syncValue + acc.interestTotal;
            const toGBP = (val: number): number => acc.nativeCurrency === 'GBP' ? val : val / (acc.nativeCurrency === 'BRL' ? rates.BRL : rates.USD);

            acc.gbp = toGBP(finalLocalVal);
            acc.brl = acc.nativeCurrency === 'BRL' ? finalLocalVal : acc.gbp * rates.BRL;

            const invLocal = acc.syncValue;
            acc.investmentGBP = toGBP(invLocal);
            acc.investmentBRL = acc.nativeCurrency === 'BRL' ? invLocal : acc.investmentGBP * rates.BRL;
            acc.grossInvGBP = acc.investmentGBP;
        }
    });

    const assetList = Object.values(accountMap);

    const assets: AssetHolding[] = assetList
        .map((acc) => {
            const roi = acc.investmentGBP !== 0 ? ((acc.gbp - acc.investmentGBP) / Math.abs(acc.investmentGBP)) * 100 : 0;
            const roiBRL = Math.abs(acc.investmentBRL) > 0.1 ? ((acc.brl - acc.investmentBRL) / Math.abs(acc.investmentBRL)) * 100 : 0;
            const interestBRL = acc.brl - acc.investmentBRL;
            const overrideCur = assetClasses[acc.name]?.currency || acc.nativeCurrency;
            const overrideCat = assetClasses[acc.name]?.category || 'Fixed Income';

            return {
                name: acc.name,
                brl: acc.brl,
                gbp: acc.gbp,
                investmentGBP: acc.investmentGBP,
                investmentBRL: acc.investmentBRL,
                interestBRL,
                grossInvGBP: acc.grossInvGBP,
                roi,
                roiBRL,
                nativeCurrency: overrideCur,
                category: overrideCat
            };
        })
        .filter(asset => asset.brl >= 10)
        .sort((a, b) => b.brl - a.brl);

    const totalGbp = assets.reduce((sum, a) => sum + a.gbp, 0);
    const totalBrl = assets.reduce((sum, a) => sum + a.brl, 0);
    const totalInv = assets.reduce((sum, a) => sum + (a.investmentGBP || 0), 0);
    const totalGrossInv = assets.reduce((sum, a) => sum + (a.grossInvGBP || 0), 0);
    const totalRoi = totalInv !== 0 ? ((totalGbp - totalInv) / Math.abs(totalInv)) * 100 : 0;

    const individualHoldings: IndividualHolding[] = assets.map((a) => ({
        name: a.name,
        brl: a.brl,
        gbp: a.gbp
    }));

    return {
        assets,
        individualHoldings,
        total: {
            name: 'Total',
            brl: totalBrl,
            gbp: totalGbp,
            investmentGBP: totalInv,
            grossInvGBP: totalGrossInv,
            roi: totalRoi,
            isTotal: true as const
        }
    };
};

// ═══════════ getRealEstateSummary ═══════════

interface InkCourtData {
    ledger?: Array<{ date: string; principal?: number; [key: string]: unknown }>;
    mortgageAmount?: number;
    propertyValue?: number;
    [key: string]: unknown;
}

interface AirbnbMonthEntry {
    transactions?: Array<{ type: string; amount: number }>;
    costs?: number;
    revenue?: number;
}

interface FundTransaction {
    date: string;
    fund?: string;
    ticker?: string;
    quantity?: number;
    investment?: number;
    [key: string]: unknown;
}

interface FundHolding {
    ticker: string;
    qty: number;
    [key: string]: unknown;
}

interface FundsData {
    transactions?: FundTransaction[];
    holdings?: FundHolding[];
}

export const getRealEstateSummary = (
    data: RealEstateData | Record<string, unknown> | null = {},
    marketData: MarketDataMap = {},
    rates: CurrencyRates,
    endDate: string | null = null,
    assetClasses: AssetClassesMap = {}
): CategorySummaryResult => {
    const safeData = (data || {}) as Record<string, unknown>;
    const properties = (safeData.properties || []) as RealEstatePropertyInput[];
    const funds = (safeData.funds || {}) as FundsData;
    const airbnb = safeData.airbnb as { ledger?: AirbnbMonthEntry[] } | null;
    const inkCourt = safeData.inkCourt as InkCourtData | null;
    const BRL = rates?.BRL || 7.10;

    // 1. Funds
    const fundSummary: Record<string, { totalQuantity: number; totalInvestment: number }> = {};
    let fundsTotalValueBrl = 0;
    let fundsTotalInvestmentBrl = 0;

    if (funds && funds.transactions) {
        funds.transactions.forEach((tr) => {
            if (endDate && parseDate(tr.date) > parseDate(endDate)) return;
            // API returns 'fund' name e.g. "FII - HGLG11" or just "HGLG11"
            let ticker = tr.fund || '';
            if (tr.fund && tr.fund.includes(' - ')) {
                ticker = tr.fund.split(' - ')[1];
            } else if (tr.ticker) {
                ticker = tr.ticker;
            }

            if (!fundSummary[ticker]) fundSummary[ticker] = { totalQuantity: 0, totalInvestment: 0 };

            fundSummary[ticker].totalQuantity += (tr.quantity || 0);
            fundSummary[ticker].totalInvestment += (tr.investment || 0);
        });

        Object.entries(fundSummary).forEach(([ticker, summary]) => {
            const liveData = marketData[`${ticker}.SA`] || marketData[ticker];
            const currentPrice = liveData?.price || 0;

            fundsTotalValueBrl += summary.totalQuantity * currentPrice;
            fundsTotalInvestmentBrl += summary.totalInvestment;
        });
    }

    // 2. Properties
    const propertyAssets: AssetHolding[] = (properties || []).filter((p) => p.status === 'Owned').map((p) => {
        let displayValue = p.currentValue || 0;
        let investment = p.investment || 0;
        let investmentGBP = p.currency === 'GBP' ? (p.investment || 0) : (p.investment || 0) / BRL;

        // Special cases
        if (p.id === 'andyara-2') {
            displayValue = 290000;
            investment = 290000;
            investmentGBP = 290000 / BRL;
        } else if (p.name.includes('Zara')) {
            displayValue = 444204;
            investment = 444204;
            investmentGBP = 444204 / BRL;
        } else if (p.id === 'ink-court' && inkCourt) {
            const filteredLedger = endDate
                ? (inkCourt.ledger || []).filter((l) => parseDate(l.date) <= parseDate(endDate))
                : (inkCourt.ledger || []);
            const totalPrincipalPaid = filteredLedger.reduce((sum, t) => sum + (t.principal || 0), 0);
            const mortgageBalance = (inkCourt.mortgageAmount || 0) - totalPrincipalPaid;
            const currentPrice = inkCourt.propertyValue || 0;
            const equity = currentPrice - mortgageBalance;
            displayValue = equity;
            investment = equity;
            investmentGBP = equity; // Ink Court is in GBP
        }

        const brl = p.currency === 'GBP' ? displayValue * BRL : displayValue;
        const gbp = p.currency === 'GBP' ? displayValue : displayValue / BRL;

        // P&L and ROI
        let roi = 0;

        // Zara
        if (p.name.includes('Zara') && airbnb) {
            const calculateMonthAggregates = (monthEntry: AirbnbMonthEntry): { costs: number; revenue: number } => {
                if (!monthEntry.transactions || monthEntry.transactions.length === 0) {
                    return { costs: monthEntry.costs || 0, revenue: monthEntry.revenue || 0 };
                }
                let costs = 0; let revenue = 0;
                monthEntry.transactions.forEach((t) => {
                    if (t.type === 'Revenue') revenue += t.amount;
                    else if (t.type === 'Cost') costs += t.amount;
                });
                return { costs, revenue };
            };
            const airbnbRevenue = (airbnb.ledger || []).reduce((sum, t) => sum + calculateMonthAggregates(t).revenue, 0);
            const airbnbCosts = (airbnb.ledger || []).reduce((sum, t) => sum + calculateMonthAggregates(t).costs, 0);
            const profitLoss = airbnbRevenue - airbnbCosts;
            roi = (profitLoss / investment) * 100;
        } else if (p.id === 'andyara-2') {
            roi = ((500000 - 290000) / 290000) * 100;
        } else {
            if (investment > 0) roi = ((displayValue - investment) / investment) * 100;
        }

        const overrideCur = assetClasses[p.name]?.currency || p.currency || 'BRL';
        const overrideCat = assetClasses[p.name]?.category || 'Real Estate';

        return {
            name: p.name,
            brl,
            gbp,
            investmentGBP,
            grossInvGBP: investmentGBP,
            roi,
            nativeCurrency: overrideCur,
            category: overrideCat
        };
    });

    // Add Funds as a single row
    if (fundsTotalValueBrl > 0 || fundsTotalInvestmentBrl > 0) {
        const fundsRoi = fundsTotalInvestmentBrl !== 0 ? ((fundsTotalValueBrl - fundsTotalInvestmentBrl) / fundsTotalInvestmentBrl * 100) : 0;
        const overrideCur = assetClasses['FIIs (Funds)']?.currency || 'BRL';
        const overrideCat = assetClasses['FIIs (Funds)']?.category || 'Real Estate';

        propertyAssets.push({
            name: 'FIIs (Funds)',
            brl: fundsTotalValueBrl,
            gbp: fundsTotalValueBrl / BRL,
            investmentGBP: fundsTotalInvestmentBrl / BRL,
            roi: fundsRoi,
            nativeCurrency: overrideCur,
            category: overrideCat
        });
    }

    // 3. Realised P&L
    let totalRealisedPnLBrl = 0;
    (properties || []).filter((p) => p.status === 'Sold').forEach((p) => {
        let inv = p.investment || 0;
        let tax = p.taxes || 0;
        let sale = p.salePrice || 0;

        if (p.name.includes('Andyara 1')) {
            inv = 237000; tax = 9074; sale = 360000;
        } else if (p.name.includes('Montes Claros')) {
            inv = 681000; tax = 29748; sale = 822920;
        }

        const profit = sale - (inv + tax);
        if (p.currency === 'GBP') {
            totalRealisedPnLBrl += profit * BRL;
        } else {
            totalRealisedPnLBrl += profit;
        }
    });

    if (totalRealisedPnLBrl !== 0) {
        const overrideCur = assetClasses['Realised P&L']?.currency || 'Mixed';
        const overrideCat = assetClasses['Realised P&L']?.category || 'Real Estate';

        propertyAssets.push({
            name: 'Realised P&L',
            brl: totalRealisedPnLBrl,
            gbp: totalRealisedPnLBrl / BRL,
            investmentGBP: 0,
            roi: 0,
            isRealisedPnL: true,
            nativeCurrency: overrideCur,
            category: overrideCat
        });
    }

    propertyAssets.sort((a, b) => {
        if (a.isRealisedPnL) return 1;
        if (b.isRealisedPnL) return -1;
        return b.brl - a.brl;
    });

    const activeAssets = propertyAssets.filter((a) => !a.isRealisedPnL);
    const totalGbp = activeAssets.reduce((sum, a) => sum + a.gbp, 0);
    const totalBrl = activeAssets.reduce((sum, a) => sum + a.brl, 0);
    const totalInv = activeAssets.reduce((sum, a) => sum + (a.investmentGBP || 0), 0);
    const totalGrossInv = activeAssets.reduce((sum, a) => sum + (a.grossInvGBP || 0), 0);

    const totalRealisedPnLGbp = totalRealisedPnLBrl !== 0 ? (totalRealisedPnLBrl / BRL) : 0;

    // Total ROI should account for realised P&L
    const totalPnL = (totalGbp - totalInv) + totalRealisedPnLGbp;
    const totalRoi = totalInv !== 0 ? (totalPnL / totalInv) * 100 : 0;

    const individualHoldings: IndividualHolding[] = propertyAssets.map((a) => ({
        name: a.name,
        brl: a.brl,
        gbp: a.gbp
    }));

    return {
        assets: propertyAssets,
        individualHoldings,
        total: {
            name: 'Total',
            brl: totalBrl,
            gbp: totalGbp,
            investmentGBP: totalInv,
            grossInvGBP: totalGrossInv,
            roi: totalRoi,
            isTotal: true as const
        }
    };
};

// ═══════════ getEquitySummary ═══════════

export const getEquitySummary = (
    transactions: EquityTx[],
    marketData: MarketDataMap = {},
    rates: CurrencyRates,
    endDate: string | null = null,
    assetClasses: AssetClassesMap = {}
): CategorySummaryResult => {
    const holdings: Record<string, EquityHoldingInternal> = {};
    const lockedPnL: Record<string, number> = {};
    let totalGrossInvGBP = 0;

    const sorted = [...transactions].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
    sorted.forEach((tr) => {
        if (endDate && parseDate(tr.date) > parseDate(endDate)) return;
        const key = `${tr.asset}|${tr.broker}`;
        if (!holdings[key]) {
            holdings[key] = { asset: tr.asset, qty: 0, totalCost: 0, broker: tr.broker, currency: tr.currency || 'GBP', ticker: tr.ticker || null };
        }
        if (tr.ticker && !holdings[key].ticker) holdings[key].ticker = tr.ticker;
        if (!lockedPnL[tr.broker]) lockedPnL[tr.broker] = 0;

        holdings[key].qty += (tr.quantity || 0);
        holdings[key].totalCost += tr.investment;

        if (tr.type === 'Buy') {
            const cur = tr.currency || BROKER_CURRENCY[tr.broker] || 'GBP';
            totalGrossInvGBP += toGBPSimple(Math.abs(tr.investment), cur, rates);
        }

        if (tr.pnl) {
            lockedPnL[tr.broker] += tr.pnl;
        }

        if (Math.abs(holdings[key].qty) < 0.01) {
            holdings[key].totalCost = 0;
            holdings[key].qty = 0;
        }
    });

    const activeHoldings = Object.values(holdings).filter((h) => Math.abs(h.qty) > 0.01);

    const brokers: Record<string, BrokerAccum> = {};
    activeHoldings.forEach((h) => {
        if (!brokers[h.broker]) brokers[h.broker] = { cvGBP: 0, ppGBP: 0 };
        const cur = BROKER_CURRENCY[h.broker] || 'GBP';

        let rawPrice = 0;
        let assetCurrency = cur;

        if (h.asset === 'Cash') rawPrice = 1.0;
        else if (h.asset === 'Monzo - Equity') rawPrice = 14.41;
        else if (h.ticker && marketData[h.ticker]) {
            rawPrice = marketData[h.ticker].price;
            assetCurrency = marketData[h.ticker].currency || 'USD';
        } else {
            rawPrice = h.qty > 0 ? h.totalCost / h.qty : 0;
        }

        let priceInBrokerCur = rawPrice;
        if (assetCurrency !== cur && rawPrice > 0 && rates) {
            const toUSD = (v: number, c: string): number => c === 'USD' ? v : (c === 'GBP' ? v * rates.USD : v * (rates.USD / rates.BRL));
            const fromUSD = (v: number, c: string): number => c === 'USD' ? v : (c === 'GBP' ? v / rates.USD : v * (rates.BRL / rates.USD));
            priceInBrokerCur = fromUSD(toUSD(rawPrice, assetCurrency), cur);
        }

        const cv = priceInBrokerCur * Math.abs(h.qty);
        const pp = h.totalCost;

        brokers[h.broker].cvGBP += toGBPSimple(cv, cur, rates);
        brokers[h.broker].ppGBP += toGBPSimple(pp, cur, rates);
    });

    // Add Locked PnL
    Object.keys(lockedPnL).forEach((b) => {
        if (!brokers[b]) brokers[b] = { cvGBP: 0, ppGBP: 0 };
        const cur = BROKER_CURRENCY[b] || 'GBP';
        const lockedGBP = (lockedPnL[b] || 0) / (cur === 'GBP' ? 1 : (cur === 'BRL' ? rates.BRL : cur === 'USD' ? rates.USD : 1));
        brokers[b].lockedGBP = (brokers[b].lockedGBP || 0) + lockedGBP;
    });

    const assets: AssetHolding[] = Object.keys(brokers).map((b) => {
        const { cvGBP, ppGBP, lockedGBP } = brokers[b];
        const pnl = (cvGBP - ppGBP) + (lockedGBP || 0);
        const roi = ppGBP !== 0 ? (pnl / ppGBP) * 100 : 0;
        const overrideCur = assetClasses[b]?.currency || BROKER_CURRENCY[b] || 'GBP';
        const overrideCat = assetClasses[b]?.category || 'Equity';

        return {
            name: b,
            brl: cvGBP * rates.BRL,
            gbp: cvGBP,
            investmentGBP: ppGBP,
            roi,
            nativeCurrency: overrideCur,
            category: overrideCat
        };
    }).sort((a, b) => b.brl - a.brl);

    const totalGbp = assets.reduce((sum, a) => sum + a.gbp, 0);
    const totalBrl = assets.reduce((sum, a) => sum + a.brl, 0);
    const totalInv = assets.reduce((sum, a) => sum + (a.investmentGBP || 0), 0);

    let grandTotalLockedGBP = 0;
    Object.values(brokers).forEach((b) => grandTotalLockedGBP += (b.lockedGBP || 0));

    const totalPnL = (totalGbp - totalInv) + grandTotalLockedGBP;
    const totalRoi = totalInv !== 0 ? (totalPnL / totalInv) * 100 : 0;
    const totalGrossInv = totalGrossInvGBP;

    const individualHoldings: IndividualHolding[] = activeHoldings.map((h) => {
        const cur = BROKER_CURRENCY[h.broker] || 'GBP';
        let rawPrice = 0;
        let assetCurrency = cur;

        if (h.asset === 'Cash') rawPrice = 1.0;
        else if (h.asset === 'Monzo - Equity') rawPrice = 14.41;
        else if (h.ticker && marketData[h.ticker]) {
            rawPrice = marketData[h.ticker].price;
            assetCurrency = marketData[h.ticker].currency || 'USD';
        } else {
            rawPrice = h.qty > 0 ? h.totalCost / h.qty : 0;
        }

        let priceInBrokerCur = rawPrice;
        if (assetCurrency !== cur && rawPrice > 0 && rates) {
            const toUSD = (v: number, c: string): number => c === 'USD' ? v : (c === 'GBP' ? v * rates.USD : v * (rates.USD / rates.BRL));
            const fromUSD = (v: number, c: string): number => c === 'USD' ? v : (c === 'GBP' ? v / rates.USD : v * (rates.BRL / rates.USD));
            priceInBrokerCur = fromUSD(toUSD(rawPrice, assetCurrency), cur);
        }

        const cv = priceInBrokerCur * Math.abs(h.qty);
        const gbpVal = toGBPSimple(cv, cur, rates);

        return {
            name: h.asset || h.ticker || 'Unknown',
            brl: gbpVal * rates.BRL,
            gbp: gbpVal,
            broker: h.broker
        };
    });

    return {
        assets,
        individualHoldings,
        total: {
            name: 'Total',
            brl: totalBrl,
            gbp: totalGbp,
            investmentGBP: totalInv,
            grossInvGBP: totalGrossInv,
            roi: totalRoi,
            isTotal: true as const
        }
    };
};

// ═══════════ getCryptoSummary ═══════════

export const getCryptoSummary = (
    transactions: CryptoTx[],
    marketData: MarketDataMap = {},
    rates: CurrencyRates,
    endDate: string | null = null,
    assetClasses: AssetClassesMap = {}
): CategorySummaryResult => {
    const holdings: Record<string, CryptoHolding> = {};
    const sorted = [...transactions].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
    let totalGrossInvGBP_sum = 0;

    sorted.forEach((tr) => {
        if (endDate && parseDate(tr.date) > parseDate(endDate)) return;
        const key = tr.ticker;
        if (!holdings[key]) holdings[key] = { ticker: key, qty: 0, netInvestment: 0, name: tr.asset || key };
        holdings[key].qty += (tr.quantity || 0);
        holdings[key].netInvestment += tr.investment;

        if (tr.type === 'Buy') {
            const currency = tr.currency || 'USD';
            const invGBP = Math.abs(tr.investment) / (currency === 'USD' ? rates.USD : rates.BRL);
            totalGrossInvGBP_sum += invGBP;
        }
        if (Math.abs(holdings[key].qty) < 0.000001) {
            holdings[key].netInvestment = 0;
            holdings[key].qty = 0;
        }
    });

    const assets: AssetHolding[] = Object.values(holdings)
        .filter((h) => Math.abs(h.qty) > 0.000001)
        .map((h) => {
            const marketKey = h.ticker.endsWith('-USD') ? h.ticker : h.ticker + '-USD';
            const quote = marketData[marketKey] || marketData[h.ticker];
            const price = quote ? quote.price : 0;

            const valUSD = price * h.qty;
            const valGBP = valUSD / rates.USD;
            const valBRL = valGBP * rates.BRL;

            const investGBP = h.netInvestment / rates.USD;
            const roi = investGBP !== 0 ? ((valGBP - investGBP) / investGBP) * 100 : 0;

            const overrideCur = assetClasses[h.name]?.currency || 'USD';
            const overrideCat = assetClasses[h.name]?.category || 'Crypto';

            return {
                name: h.name,
                brl: valBRL,
                gbp: valGBP,
                investmentGBP: investGBP,
                roi,
                nativeCurrency: overrideCur,
                category: overrideCat
            };
        }).sort((a, b) => b.brl - a.brl);

    const totalGbp = assets.reduce((sum, a) => sum + a.gbp, 0);
    const totalBrl = assets.reduce((sum, a) => sum + a.brl, 0);
    const totalInv = assets.reduce((sum, a) => sum + (a.investmentGBP || 0), 0);
    const totalGrossInv = totalGrossInvGBP_sum;
    const totalRoi = totalInv !== 0 ? ((totalGbp - totalInv) / totalInv) * 100 : 0;

    const individualHoldings: IndividualHolding[] = assets.map((a) => ({
        name: a.name, brl: a.brl, gbp: a.gbp
    }));

    return {
        assets,
        individualHoldings,
        total: { name: 'Total', brl: totalBrl, gbp: totalGbp, investmentGBP: totalInv, grossInvGBP: totalGrossInv, roi: totalRoi, isTotal: true as const }
    };
};

// ═══════════ getPensionSummary ═══════════

export const getPensionSummary = (
    transactions: PensionTx[],
    rates: CurrencyRates,
    pensionPrices: PensionPricesMap = {},
    marketData: MarketDataMap = {},
    endDate: string | null = null,
    assetClasses: AssetClassesMap = {}
): CategorySummaryResult => {
    const holdings: Record<string, PensionHoldingInternal> = {};
    let totalGrossInvGBP_pension = 0;

    const sorted = [...transactions].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

    sorted.forEach((tr) => {
        if (endDate && parseDate(tr.date) > parseDate(endDate)) return;
        const key = `${tr.asset}|${tr.broker}`;
        if (!holdings[key]) holdings[key] = { asset: tr.asset, qty: 0, totalCost: 0, broker: tr.broker };

        const qty = parseFloat(String(tr.quantity)) || 0;
        const val = parseFloat(String(tr.value)) || 0;

        if (tr.type === 'Buy') {
            holdings[key].qty += qty;
            holdings[key].totalCost += val;
            totalGrossInvGBP_pension += val;
        } else if (tr.type === 'Sell') {
            holdings[key].qty -= qty;
            holdings[key].totalCost -= val;
        }

        if (Math.abs(holdings[key].qty) < 0.01) {
            holdings[key].qty = 0;
            if (holdings[key].totalCost !== 0) {
                holdings[key].totalCost = 0;
            }
        }
    });

    const activeHoldings = Object.values(holdings).filter((h) => Math.abs(h.qty) > 0.01);
    const brokers_list = ['Fidelity', 'Hargreaves Lansdown', 'Legal & General', 'OAB'];

    const brokerSummaries: AssetHolding[] = brokers_list.map((b) => {
        const items = activeHoldings.filter((h) => h.broker === b);
        const cur = BROKER_CURRENCY[b] || 'GBP';
        let cv = 0;
        let pp = 0;

        items.forEach((h) => {
            let rawPrice = 0;
            let assetCurrency = cur;
            const mapEntry = (pensionMap as PensionFundMapEntry[]).find((m) => m.asset === h.asset);
            if (h.asset === 'Cash') rawPrice = 1.0;
            else if (mapEntry?.ticker && marketData[mapEntry.ticker]) {
                rawPrice = marketData[mapEntry.ticker].price;
                assetCurrency = marketData[mapEntry.ticker].currency || 'USD';
            } else if (pensionPrices[h.asset]) {
                rawPrice = pensionPrices[h.asset].price;
                assetCurrency = pensionPrices[h.asset].currency;
            } else {
                rawPrice = h.qty > 0 ? h.totalCost / h.qty : 0;
            }

            let lp = rawPrice;
            if (assetCurrency !== cur && rawPrice > 0 && rates) {
                if (cur === 'GBP') {
                    if (assetCurrency === 'USD') lp = rawPrice / rates.USD;
                    else if (assetCurrency === 'BRL') lp = rawPrice / rates.BRL;
                }
            }
            cv += lp * Math.abs(h.qty);
            pp += h.totalCost;
        });

        const pnl = cv - pp;
        const roi = pp !== 0 ? (pnl / pp) * 100 : 0;
        const overrideCur = assetClasses[b]?.currency || 'GBP';
        const overrideCat = assetClasses[b]?.category || 'Equity';

        return {
            name: b, brl: cv * rates.BRL, gbp: cv, investmentGBP: pp, roi,
            nativeCurrency: overrideCur, category: overrideCat
        };
    }).filter(b => b.gbp > 0 || (b.investmentGBP || 0) > 0);

    brokerSummaries.sort((a, b) => b.brl - a.brl);

    const totalGbp = brokerSummaries.reduce((sum, a) => sum + a.gbp, 0);
    const totalBrl = brokerSummaries.reduce((sum, a) => sum + a.brl, 0);
    const totalInv = brokerSummaries.reduce((sum, a) => sum + (a.investmentGBP || 0), 0);
    const totalGrossInv = totalGrossInvGBP_pension;
    const totalPnL = totalGbp - totalInv;
    const totalRoi = totalInv !== 0 ? (totalPnL / totalInv) * 100 : 0;

    const individualHoldings: IndividualHolding[] = activeHoldings.map((h) => {
        const mapEntry = (pensionMap as PensionFundMapEntry[]).find((m) => m.asset === h.asset);
        const cur = BROKER_CURRENCY[h.broker] || 'GBP';
        let rawPrice = 0;
        let assetCurrency = cur;

        if (h.asset === 'Cash') rawPrice = 1.0;
        else if (mapEntry?.ticker && marketData[mapEntry.ticker]) {
            rawPrice = marketData[mapEntry.ticker].price;
            assetCurrency = marketData[mapEntry.ticker].currency || 'USD';
        } else if (pensionPrices[h.asset]) {
            rawPrice = pensionPrices[h.asset].price;
            assetCurrency = pensionPrices[h.asset].currency;
        } else {
            rawPrice = h.qty > 0 ? h.totalCost / h.qty : 0;
        }

        let lp = rawPrice;
        if (assetCurrency !== cur && rawPrice > 0 && rates) {
            const toUSD = (v: number, c: string): number => c === 'USD' ? v : (c === 'GBP' ? v * rates.USD : v * (rates.USD / rates.BRL));
            const fromUSD = (v: number, c: string): number => c === 'USD' ? v : (c === 'GBP' ? v / rates.USD : v * (rates.BRL / rates.USD));
            lp = fromUSD(toUSD(rawPrice, assetCurrency), cur);
        }

        const cv = lp * Math.abs(h.qty);
        const gbp = cur === 'GBP' ? cv : (cur === 'BRL' ? cv / rates.BRL : cv / rates.USD);
        const brl = gbp * rates.BRL;

        return { name: h.asset, brl, gbp, broker: h.broker };
    });

    return {
        assets: brokerSummaries,
        individualHoldings,
        total: { name: 'Total', brl: totalBrl, gbp: totalGbp, investmentGBP: totalInv, grossInvGBP: totalGrossInv, roi: totalRoi, isTotal: true as const }
    };
};

// ═══════════ getDebtSummary ═══════════

export const getDebtSummary = (
    transactions: DebtTx[],
    rates: CurrencyRates,
    endDate: string | null = null,
    assetClasses: AssetClassesMap = {}
): CategorySummaryResult => {
    const summary: Record<string, { name: string; brl: number; gbp: number }> = transactions.reduce((acc, t) => {
        if (endDate && parseDate(t.date) > parseDate(endDate)) return acc;
        const lender = t.lender || 'Unknown';
        if (!acc[lender]) acc[lender] = { name: lender, brl: 0, gbp: 0 };
        acc[lender].brl += (t.value_brl || 0);
        acc[lender].gbp += ((t.value_brl || 0) / rates.BRL);
        return acc;
    }, {} as Record<string, { name: string; brl: number; gbp: number }>);

    const assets: AssetHolding[] = Object.values(summary).map((a) => {
        const overrideCur = assetClasses[a.name]?.currency || 'BRL';
        const overrideCat = assetClasses[a.name]?.category || 'Fixed Income';

        return {
            ...a,
            investmentGBP: a.gbp,
            roi: 0,
            nativeCurrency: overrideCur,
            category: overrideCat
        };
    }).sort((a, b) => b.brl - a.brl);

    const totalBrl = assets.reduce((sum, a) => sum + a.brl, 0);
    const totalGbp = assets.reduce((sum, a) => sum + a.gbp, 0);

    const individualHoldings: IndividualHolding[] = assets.map((a) => ({
        name: a.name, brl: a.brl, gbp: a.gbp
    }));

    return {
        assets,
        individualHoldings,
        total: { name: 'Total', brl: totalBrl, gbp: totalGbp, investmentGBP: totalGbp, roi: 0, isTotal: true as const }
    };
};

// ═══════════ getMasterMixData ═══════════

interface MasterMixResult {
    buckets: { Equity: number; FixedIncome: number; RealEstate: number; Crypto: number; Cash: number };
    percentages: { Equity: number; FixedIncome: number; RealEstate: number; Crypto: number; Cash: number };
    byCurrency: { GBP: number; USD: number; BRL: number };
    total: number;
}

export const getMasterMixData = (
    fixedIncomeTr: FixedIncomeTx[],
    realEstateData: RealEstateData | Record<string, unknown> | null,
    equityTr: EquityTx[],
    cryptoTr: CryptoTx[],
    pensionTr: PensionTx[],
    rates: CurrencyRates,
    pensionMapInput: PensionFundMapEntry[],
    marketData: MarketDataMap,
    pensionPrices: PensionPricesMap,
    currentPrices: Record<string, number> = {},
    assetClasses: AssetClassesMap = {}
): MasterMixResult => {
    const fiData = getFixedIncomeSummary(fixedIncomeTr, rates, null, assetClasses);
    let masterFI = fiData.total.gbp || 0;

    const reData = getRealEstateSummary(realEstateData, marketData, rates, null, assetClasses);
    let masterRE = reData.total.gbp || 0;

    const cryptoData = getCryptoSummary(cryptoTr, marketData, rates, null, assetClasses);
    let masterCrypto = cryptoData.total.gbp || 0;

    const equityData = getEquitySummary(equityTr, marketData, rates, null, assetClasses);
    let masterEquity = equityData.total.gbp || 0;

    // Extract Cash holdings from equity
    let equityCashGBP = 0;
    if (equityTr && equityTr.length > 0) {
        const cashByBroker: Record<string, { qty: number; currency: string }> = {};
        equityTr.forEach((tr) => {
            const isCash = tr.asset === 'Cash' || tr.ticker === 'Cash';
            if (!isCash) return;
            const broker = tr.broker || '__none__';
            if (!cashByBroker[broker]) cashByBroker[broker] = { qty: 0, currency: BROKER_CURRENCY[tr.broker] || 'GBP' };
            cashByBroker[broker].qty += (parseFloat(String(tr.quantity)) || 0);
        });
        Object.values(cashByBroker).forEach(({ qty, currency }) => {
            if (Math.abs(qty) < 0.001) return;
            equityCashGBP += toGBPSimple(Math.abs(qty), currency, rates);
        });
    }
    masterEquity = Math.max(0, masterEquity - equityCashGBP);
    let masterCash = equityCashGBP;

    // 2. Pension Redistribution
    const pensionHoldings: Record<string, PensionMasterHolding> = {};
    pensionTr.forEach((tr) => {
        const key = tr.asset;
        if (!pensionHoldings[key]) pensionHoldings[key] = {
            asset: tr.asset, qty: 0, broker: tr.broker, allocationClass: tr.allocationClass
        };
        const qty = parseFloat(String(tr.quantity)) || 0;
        if (tr.type === 'Buy') pensionHoldings[key].qty += qty;
        else if (tr.type === 'Sell') pensionHoldings[key].qty -= qty;
    });

    Object.values(pensionHoldings).filter((h) => Math.abs(h.qty) > 0.01).forEach((h) => {
        const mapEntry = pensionMapInput.find((m) => m.asset === h.asset);
        const cur = BROKER_CURRENCY[h.broker] || 'GBP';
        let rawPrice = 0;
        let assetCurrency = cur;

        if (h.asset === 'Cash') rawPrice = 1.0;
        else if (mapEntry?.ticker && marketData[mapEntry.ticker]) {
            rawPrice = marketData[mapEntry.ticker].price;
            assetCurrency = marketData[mapEntry.ticker].currency || 'USD';
        } else if (pensionPrices?.[h.asset]) {
            rawPrice = pensionPrices[h.asset].price;
            assetCurrency = pensionPrices[h.asset].currency;
        } else if (currentPrices?.[h.asset]) {
            rawPrice = currentPrices[h.asset];
            if (mapEntry?.currency) assetCurrency = mapEntry.currency;
        }

        let priceInGBP = rawPrice;
        if (assetCurrency !== 'GBP' && rawPrice > 0 && rates) {
            priceInGBP = toGBPSimple(rawPrice, assetCurrency, rates);
        }

        const valGBP = priceInGBP * h.qty;

        if (h.asset === 'Cash') {
            masterCash += valGBP;
        } else if (mapEntry?.allocations) {
            Object.entries(mapEntry.allocations).forEach(([bucket, pct]) => {
                const percentage = pct ?? 0;
                const bucketVal = valGBP * percentage;
                    if (bucket === 'Equity') masterEquity += bucketVal;
                    else if (bucket === 'Fixed Income') masterFI += bucketVal;
                    else if (bucket === 'Real Estate') masterRE += bucketVal;
                    else if (bucket === 'Crypto') masterCrypto += bucketVal;
                    else if (bucket === 'Cash') masterCash += bucketVal;
            });
        } else {
            const alloc = mapEntry?.allocationClass || h.allocationClass || 'Equity';
            if (alloc === 'Fixed Income') masterFI += valGBP;
            else if (alloc === 'Real Estate') masterRE += valGBP;
            else if (alloc === 'Crypto') masterCrypto += valGBP;
            else masterEquity += valGBP;
        }
    });

    const totalCalculated = masterEquity + masterFI + masterRE + masterCrypto + masterCash;

    // --- Currency Exposure Aggregation ---
    let masterGBP = 0;
    let masterUSD = 0;
    let masterBRL = 0;

    const accumulateCurrency = (data: CategorySummaryResult | null) => {
        if (!data || !data.individualHoldings) return;
        data.individualHoldings.forEach((h) => {
            const assetCur = (h as AssetHolding).nativeCurrency || assetClasses[h.name]?.currency || 'GBP';
            if (assetCur === 'BRL') masterBRL += h.gbp;
            else if (assetCur === 'USD') masterUSD += h.gbp;
            else masterGBP += h.gbp;
        });
    };

    accumulateCurrency(fiData);
    accumulateCurrency(reData);
    accumulateCurrency(cryptoData);
    accumulateCurrency(equityData);

    // Pension Currency Exposure
    Object.values(pensionHoldings).filter((h) => Math.abs(h.qty) > 0.01).forEach((h) => {
        const mapEntry = pensionMapInput.find((m) => m.asset === h.asset);
        const cur = BROKER_CURRENCY[h.broker] || 'GBP';
        let assetCurrency = cur;

        let rawPrice = 0;
        if (h.asset === 'Cash') rawPrice = 1.0;
        else if (mapEntry?.ticker && marketData[mapEntry.ticker]) {
            rawPrice = marketData[mapEntry.ticker].price;
            assetCurrency = marketData[mapEntry.ticker].currency || 'USD';
        } else if (pensionPrices?.[h.asset]) {
            rawPrice = pensionPrices[h.asset].price;
            assetCurrency = pensionPrices[h.asset].currency;
        } else if (currentPrices?.[h.asset]) {
            rawPrice = currentPrices[h.asset];
            if (mapEntry?.currency) assetCurrency = mapEntry.currency;
        }

        let priceInGBP = rawPrice;
        if (assetCurrency !== 'GBP' && rawPrice > 0 && rates) {
            priceInGBP = toGBPSimple(rawPrice, assetCurrency, rates);
        }

        const valGBP = priceInGBP * h.qty;
        const finalCur = assetClasses[h.asset]?.currency || assetCurrency;
        if (finalCur === 'BRL') masterBRL += valGBP;
        else if (finalCur === 'USD') masterUSD += valGBP;
        else masterGBP += valGBP;
    });

    return {
        buckets: { Equity: masterEquity, FixedIncome: masterFI, RealEstate: masterRE, Crypto: masterCrypto, Cash: masterCash },
        percentages: {
            Equity: totalCalculated > 0 ? (masterEquity / totalCalculated) * 100 : 0,
            FixedIncome: totalCalculated > 0 ? (masterFI / totalCalculated) * 100 : 0,
            RealEstate: totalCalculated > 0 ? (masterRE / totalCalculated) * 100 : 0,
            Crypto: totalCalculated > 0 ? (masterCrypto / totalCalculated) * 100 : 0,
            Cash: totalCalculated > 0 ? (masterCash / totalCalculated) * 100 : 0,
        },
        byCurrency: { GBP: masterGBP, USD: masterUSD, BRL: masterBRL },
        total: totalCalculated
    };
};

// ═══════════ getAllocationSummary ═══════════

interface AllocationResult {
    buckets: { FixedIncome: number; Equity: number; RealEstate: number; Crypto: number };
    total: number;
}

export const getAllocationSummary = (
    fixedIncomeTr: FixedIncomeTx[],
    realEstateData: RealEstateData | Record<string, unknown> | null,
    equityTr: EquityTx[],
    cryptoTr: CryptoTx[],
    pensionTr: PensionTx[],
    rates: CurrencyRates,
    pensionMapInput: PensionFundMapEntry[],
    marketData: MarketDataMap,
    pensionPrices: PensionPricesMap,
    currentPrices: Record<string, number> = {}
): AllocationResult => {
    const fiData = getFixedIncomeSummary(fixedIncomeTr, rates);
    const fiTotal = fiData.total.gbp || 0;

    const reData = getRealEstateSummary(realEstateData, marketData, rates);
    const reTotal = reData.total.gbp || 0;

    const cryptoData = getCryptoSummary(cryptoTr, marketData, rates);
    const cryptoTotal = cryptoData.total.gbp || 0;

    const equityData = getEquitySummary(equityTr, marketData, rates);
    const equityTotal = equityData.total.gbp || 0;

    // 5. Pensions (Split)
    let pensionEquity = 0;
    let pensionFixedIncome = 0;

    const pensionHoldings: Record<string, PensionMasterHolding> = {};
    pensionTr.forEach((tr) => {
        const key = tr.asset;
        if (!pensionHoldings[key]) pensionHoldings[key] = {
            asset: tr.asset, qty: 0, broker: tr.broker, allocationClass: tr.allocationClass
        };

        const qty = parseFloat(String(tr.quantity)) || 0;
        if (tr.type === 'Buy') pensionHoldings[key].qty += qty;
        else if (tr.type === 'Sell') pensionHoldings[key].qty -= qty;
    });

    Object.values(pensionHoldings).filter((h) => Math.abs(h.qty) > 0.01).forEach((h) => {
        let alloc = 'Equity';
        const mapEntry = pensionMapInput.find((m) => m.asset === h.asset);
        if (mapEntry?.allocationClass) alloc = mapEntry.allocationClass;
        else if (h.allocationClass) alloc = h.allocationClass;

        if (alloc === 'Fixed Income') alloc = 'FixedIncome';

        const cur = BROKER_CURRENCY[h.broker] || 'GBP';
        let rawPrice = 0;
        let assetCurrency = cur;

        if (h.asset === 'Cash') rawPrice = 1.0;
        else if (mapEntry?.ticker && marketData[mapEntry.ticker]) {
            rawPrice = marketData[mapEntry.ticker].price;
            assetCurrency = marketData[mapEntry.ticker].currency || 'USD';
        } else if (pensionPrices?.[h.asset]) {
            rawPrice = pensionPrices[h.asset].price;
            assetCurrency = pensionPrices[h.asset].currency;
        } else if (currentPrices?.[h.asset]) {
            rawPrice = currentPrices[h.asset];
            if (mapEntry?.currency) assetCurrency = mapEntry.currency;
        }

        let priceInGBP = rawPrice;
        if (assetCurrency !== 'GBP' && rawPrice > 0 && rates) {
            priceInGBP = toGBPSimple(rawPrice, assetCurrency, rates);
        }

        const valGBP = priceInGBP * h.qty;
        if (alloc === 'FixedIncome') pensionFixedIncome += valGBP;
        else pensionEquity += valGBP;
    });

    const bucketTotals = {
        FixedIncome: fiTotal + pensionFixedIncome,
        Equity: equityTotal + pensionEquity,
        RealEstate: reTotal,
        Crypto: cryptoTotal
    };

    const totalNetWorth = Object.values(bucketTotals).reduce((a, b) => a + b, 0);

    return {
        buckets: bucketTotals,
        total: totalNetWorth
    };
};
