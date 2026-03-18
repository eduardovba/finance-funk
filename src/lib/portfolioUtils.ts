/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck — To be properly typed in next sprint
import pensionMap from '../data/pension_fund_map.json';

const parseDate = (d: any): any => {
    if (!d) return new Date(0);
    if (typeof d !== 'string') return new Date(d);
    if (d.includes('/')) {
        const [day, month, year] = d.split('/');
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
    return new Date(d);
};

const BROKER_CURRENCY = {
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

export const getFixedIncomeSummary = (transactions, rates, endDate = null, assetClasses = {}) => {
    const accountMap = {};

    transactions.forEach((tr: any) => {
        if (endDate && parseDate(tr.date) > parseDate(endDate)) return;
        // API (fixed-income): investment is Principal (+ for Deposit). interest is Interest (+).
        // Logic:
        // Value = Principal + Interest.
        // If Currency = GBP -> Value. Else -> Value / BRL.

        // API returns currency.
        const cur = tr.currency || 'BRL'; // Default BRL if missing?
        const rate = cur === 'GBP' ? 1 : (cur === 'USD' ? rates.USD : rates.BRL); // Simplified rate lookup

        // Convert to GBP logic
        // If BRL: Amount / Rate.
        // If USD: Amount / Rate (if Rate is USD/GBP? No, rates.USD is USD/GBP usually => 1.28. So GBP = USD / 1.28)
        // Wait, standard rates obj: { GBP: 1, BRL: 7.10, USD: 1.28 } (1 GBP = 7.10 BRL).
        // So BRL -> GBP is Amount / 7.10. Correct.

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
            // For manual transactions (not sync and not pure interest updates)
            if (accountMap[name].syncValue === null) {
                accountMap[name].investmentGBP += invGbp;
                accountMap[name].investmentBRL += invGbp * rates.BRL;
                if (investment > 0) {
                    accountMap[name].grossInvGBP += invGbp;
                }
            }
        }

        // Always add to base values for manual accounts or temporarily until Pass 2
        accountMap[name].gbp += gbpVal;
        accountMap[name].brl += gbpVal * rates.BRL;
    });

    // Pass 2 logic: override synced totals
    Object.values(accountMap).forEach((acc: any) => {
        if (acc.syncValue !== null) {
            // If synced, the true current value = syncValue + manual interest
            const finalLocalVal = acc.syncValue + acc.interestTotal;
            const toGBP = (val: number): number => acc.nativeCurrency === 'GBP' ? val : val / (acc.nativeCurrency === 'BRL' ? rates.BRL : rates.USD);

            acc.gbp = toGBP(finalLocalVal);
            acc.brl = acc.nativeCurrency === 'BRL' ? finalLocalVal : acc.gbp * rates.BRL;

            // Reconstruct investment by stripping the interest from the syncValue
            const invLocal = acc.syncValue;
            acc.investmentGBP = toGBP(invLocal);
            acc.investmentBRL = acc.nativeCurrency === 'BRL' ? invLocal : acc.investmentGBP * rates.BRL;
            acc.grossInvGBP = acc.investmentGBP;
        }
    });

    let assetList = Object.values(accountMap);


    const assets = assetList
        .map((acc: any) => {
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
        .sort((a: any, b: any) => b.brl - a.brl);

    const totalGbp = assets.reduce((sum: number, a: any) => sum + a.gbp, 0);
    const totalBrl = assets.reduce((sum: number, a: any) => sum + a.brl, 0);
    const totalInv = assets.reduce((sum: number, a: any) => sum + a.investmentGBP, 0);
    const totalGrossInv = assets.reduce((sum: number, a: any) => sum + a.grossInvGBP, 0);
    const totalRoi = totalInv !== 0 ? ((totalGbp - totalInv) / Math.abs(totalInv)) * 100 : 0;

    const individualHoldings = assets.map((a: any) => ({
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
            isTotal: true
        }
    };
};

export const getRealEstateSummary = (data = {}, marketData = {}, rates, endDate = null, assetClasses = {}) => {
    // data structure from API: { properties: [], inkCourt: { ledger: [] }, funds: { transactions: [], holdings: [] }, airbnb: ... }
    const { properties = [], funds = {}, airbnb = null, inkCourt = null } = data || {};
    const BRL = rates?.BRL || 7.10;

    // 1. Funds
    const fundSummary = {};
    let fundsTotalValueBrl = 0;
    let fundsTotalInvestmentBrl = 0;

    if (funds && funds.transactions) {
        funds.transactions.forEach((tr: any) => {
            if (endDate && parseDate(tr.date) > parseDate(endDate)) return;
            // API returns 'fund' name e.g. "FII - HGLG11" or just "HGLG11"
            let ticker = tr.fund;
            if (tr.fund.includes(' - ')) {
                ticker = tr.fund.split(' - ')[1];
            } else if (tr.ticker) {
                ticker = tr.ticker;
            }

            if (!fundSummary[ticker]) fundSummary[ticker] = { totalQuantity: 0, totalInvestment: 0 };

            // Quantity
            fundSummary[ticker].totalQuantity += (tr.quantity || 0);

            // Investment
            // API returns `investment` (Purchase Cost). If Buy, it's positive.
            // If API `investment` is cost, we sum it.
            fundSummary[ticker].totalInvestment += (tr.investment || 0);
        });

        Object.entries(fundSummary).forEach(([ticker, summary]) => {
            // Price lookup
            const liveData = marketData[`${ticker}.SA`] || marketData[ticker];
            const currentPrice = liveData?.price || 0;

            fundsTotalValueBrl += summary.totalQuantity * currentPrice;
            fundsTotalInvestmentBrl += summary.totalInvestment;
        });
    }

    // 2. Properties
    const propertyAssets = (properties || []).filter((p: any) => p.status === 'Owned').map((p: any) => {
        let displayValue = p.currentValue;
        let investment = p.investment;
        let investmentGBP = p.currency === 'GBP' ? p.investment : p.investment / BRL;

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
            const filteredLedger = endDate ? inkCourt.ledger.filter((l: any) => parseDate(l.date) <= parseDate(endDate)) : inkCourt.ledger;
            const totalPrincipalPaid = filteredLedger.reduce((sum: number, t: any) => sum + (t.principal || 0), 0);
            const mortgageBalance = (inkCourt.mortgageAmount || 0) - totalPrincipalPaid;
            const currentPrice = inkCourt.propertyValue;
            const equity = (currentPrice || 0) - mortgageBalance;
            displayValue = equity;
            investment = equity;
            investmentGBP = equity; // Ink Court is in GBP
        }

        let brl = p.currency === 'GBP' ? displayValue * BRL : displayValue;
        let gbp = p.currency === 'GBP' ? displayValue : displayValue / BRL;

        // P&L and ROI
        let roi = 0;

        // Zara
        if (p.name.includes('Zara') && airbnb) {
            const calculateMonthAggregates = (monthEntry) => {
                if (!monthEntry.transactions || monthEntry.transactions.length === 0) {
                    return { costs: monthEntry.costs || 0, revenue: monthEntry.revenue || 0 };
                }
                let costs = 0; let revenue = 0;
                monthEntry.transactions.forEach((t: any) => {
                    if (t.type === 'Revenue') revenue += t.amount;
                    else if (t.type === 'Cost') costs += t.amount;
                });
                return { costs, revenue };
            };
            const airbnbRevenue = (airbnb.ledger || []).reduce((sum: number, t: any) => sum + calculateMonthAggregates(t).revenue, 0);
            const airbnbCosts = (airbnb.ledger || []).reduce((sum: number, t: any) => sum + calculateMonthAggregates(t).costs, 0);
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
            grossInvGBP: investmentGBP, // For properties, investment equals purchase price
            roi,
            nativeCurrency: overrideCur,
            category: overrideCat
        };
    });

    // Add Funds as a single row
    if (fundsTotalValueBrl > 0 || fundsTotalInvestmentBrl > 0) {
        const fundsRoi = fundsTotalInvestmentBrl !== 0 ? ((fundsTotalValueBrl - fundsTotalInvestmentBrl) / fundsTotalInvestmentBrl * 100) : 0;
        // FIIs (Funds) -> It might have an override for "FIIs (Funds)"
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
    (properties || []).filter((p: any) => p.status === 'Sold').forEach((p: any) => {
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

    propertyAssets.sort((a: any, b: any) => {
        if (a.isRealisedPnL) return 1;
        if (b.isRealisedPnL) return -1;
        return b.brl - a.brl;
    });

    const activeAssets = propertyAssets.filter((a: any) => !a.isRealisedPnL);
    const totalGbp = activeAssets.reduce((sum: number, a: any) => sum + a.gbp, 0);
    const totalBrl = activeAssets.reduce((sum: number, a: any) => sum + a.brl, 0);
    const totalInv = activeAssets.reduce((sum: number, a: any) => sum + a.investmentGBP, 0);
    const totalGrossInv = activeAssets.reduce((sum: number, a: any) => sum + (a.grossInvGBP || 0), 0);

    const totalRealisedPnLGbp = totalRealisedPnLBrl !== 0 ? (totalRealisedPnLBrl / BRL) : 0;

    // Total ROI should account for realised P&L
    // ROI = (Current Value + Realised Gain - Total Cost) / Total Cost
    const totalPnL = (totalGbp - totalInv) + totalRealisedPnLGbp;
    const totalRoi = totalInv !== 0 ? (totalPnL / totalInv) * 100 : 0;

    const individualHoldings = propertyAssets.map((a: any) => ({
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
            isTotal: true
        }
    };
};

export const getEquitySummary = (transactions, marketData = {}, rates, endDate = null, assetClasses = {}) => {
    const holdings = {};
    const lockedPnL = {};
    let totalGrossInvGBP = 0;

    // Transactions array from API. 
    // Fields: { asset, ticker, broker, currency, quantity, investment, pnl, type }
    // API: Buy -> Investment = Negative (-Cost)? Or Positive?
    // Let's check api/equity/route.js.
    // "investment: -r.amount" (where buy amount < 0). So Investment IS POSITIVE cost.
    // "type": 'Buy' / 'Sell'.

    // Previous JSON logic: Buy -> Investment < 0? No, usually JSONs had Investment < 0 for Outflows (Buys).
    // EXCEPT `equity_transactions.json` was weird.
    // Let's rely on `tr.type`.

    const sorted = [...transactions].sort((a: any, b: any) => parseDate(a.date) - parseDate(b.date));
    sorted.forEach((tr: any) => {
        if (endDate && parseDate(tr.date) > parseDate(endDate)) return;
        const key = `${tr.asset}|${tr.broker}`;
        if (!holdings[key]) {
            holdings[key] = { asset: tr.asset, qty: 0, totalCost: 0, broker: tr.broker, currency: tr.currency, ticker: tr.ticker };
        }
        if (tr.ticker && !holdings[key].ticker) holdings[key].ticker = tr.ticker;
        if (!lockedPnL[tr.broker]) lockedPnL[tr.broker] = 0;

        // Quantity (+ for Buy, - for Sell? API returns +/?)
        // API: quantity: r.quantity.
        // Ledger: Buy -> Qty > 0. Sell -> Qty < 0.
        // So API returns raw signed qty.
        holdings[key].qty += (tr.quantity || 0);

        // Cost Basis
        // If Buy: Add to Cost.
        // If Sell: Reduce Cost (pro-rata? or just specific lot?).
        // Simple Average Cost:
        // We accumulate Cost on Buys.
        // On Sell, we reduce Cost proportional to Qty sold?
        // Or did we store "investment" as the cost effect?
        // API "investment" = -Amount.
        // Buy (Amt -100) -> Inv +100.
        // Sell (Amt +120) -> Inv -120.
        // So `totalCost` += tr.investment works?
        // Buy: TotalCost += 100.
        // Sell: TotalCost -= 120 (Proceeds). 
        // Net Cost becomes -20 (Profit). 
        // Value = 0. PnL = Value - Cost = 0 - (-20) = 20. Correct.
        // So summing `investment` (if it represents cash flow inverted) works.

        holdings[key].totalCost += tr.investment;

        // Gross Investment calculation (Buys only)
        if (tr.type === 'Buy') {
            const cur = tr.currency || BROKER_CURRENCY[tr.broker] || 'GBP';
            const toGBP = (val: number): number => {
                if (cur === 'GBP') return val;
                if (cur === 'BRL') return val / rates.BRL;
                if (cur === 'USD') return val / rates.USD;
                return val;
            };
            totalGrossInvGBP += toGBP(Math.abs(tr.investment), cur);
        }

        // Realized PnL field
        // API returns `pnl` field (populated from `realized_pnl` column).
        if (tr.pnl) {
            lockedPnL[tr.broker] += tr.pnl;
        }

        if (Math.abs(holdings[key].qty) < 0.01) {
            holdings[key].totalCost = 0;
            holdings[key].qty = 0;
        }
    });

    const activeHoldings = Object.values(holdings).filter((h: any) => Math.abs(h.qty) > 0.01);

    // Broker grouping similar to before...
    const brokers = {};
    activeHoldings.forEach((h: any) => {
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
            // Fallback
            rawPrice = h.qty > 0 ? h.totalCost / h.qty : 0;
        }

        // Convert Price to Broker Currency
        let priceInBrokerCur = rawPrice;
        // ... (Currency conversion logic same as before, omitted for brevity but assumed present or copied)
        // Re-implementing simplified conversion:
        if (assetCurrency !== cur && rawPrice > 0 && rates) {
            const toUSD = (v: number, c: string): number => c === 'USD' ? v : (c === 'GBP' ? v * rates.USD : v * (rates.USD / rates.BRL));
            const fromUSD = (v: number, c: string): number => c === 'USD' ? v : (c === 'GBP' ? v / rates.USD : v * (rates.BRL / rates.USD));

            // Convert to USD first
            const valUSD = toUSD(rawPrice, assetCurrency);
            // Convert to Target
            priceInBrokerCur = fromUSD(valUSD, cur);
        }

        const cv = priceInBrokerCur * Math.abs(h.qty);
        // Cost is `h.totalCost`.
        const pp = h.totalCost;

        // Convert Totals to GBP
        const toGBP = (val: number, currency: string): number => {
            if (currency === 'GBP') return val;
            if (currency === 'BRL') return val / rates.BRL;
            if (currency === 'USD') return val / rates.USD;
            return val;
        };

        brokers[h.broker].cvGBP += toGBP(cv, cur);
        brokers[h.broker].ppGBP += toGBP(pp, cur);
    });

    // Add Locked PnL
    Object.keys(lockedPnL).forEach((b: any) => {
        if (!brokers[b]) brokers[b] = { cvGBP: 0, ppGBP: 0 };
        const cur = BROKER_CURRENCY[b] || 'GBP';
        const lockedGBP = (lockedPnL[b] || 0) / (cur === 'GBP' ? 1 : (cur === 'BRL' ? rates.BRL : cur === 'USD' ? rates.USD : 1));
        brokers[b].lockedGBP = (brokers[b].lockedGBP || 0) + lockedGBP;
    });

    const assets = Object.keys(brokers).map((b: any) => {
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
    }).sort((a: any, b: any) => b.brl - a.brl);

    const totalGbp = assets.reduce((sum: number, a: any) => sum + a.gbp, 0);
    const totalBrl = assets.reduce((sum: number, a: any) => sum + a.brl, 0);
    const totalInv = assets.reduce((sum: number, a: any) => sum + a.investmentGBP, 0);

    let grandTotalLockedGBP = 0;
    Object.values(brokers).forEach((b: any) => grandTotalLockedGBP += (b.lockedGBP || 0));

    const totalPnL = (totalGbp - totalInv) + grandTotalLockedGBP;
    const totalRoi = totalInv !== 0 ? (totalPnL / totalInv) * 100 : 0;
    const totalGrossInv = totalGrossInvGBP;

    const individualHoldings = activeHoldings.map((h: any) => {
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
        const toGBP = (val: number, currency: string): number => {
            if (currency === 'GBP') return val;
            if (currency === 'BRL') return val / rates.BRL;
            if (currency === 'USD') return val / rates.USD;
            return val;
        };

        const gbpVal = toGBP(cv, cur);

        return {
            name: h.asset || h.ticker || h.name,
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
            isTotal: true
        }
    };
};

export const getCryptoSummary = (transactions, marketData = {}, rates, endDate = null, assetClasses = {}) => {
    // Keep existing logic but adapt to API shape if needed
    // API: { ticker, quantity, investment, type }
    // Logic seems compatible if fields allow.

    const holdings = {};
    const sorted = [...transactions].sort((a: any, b: any) => parseDate(a.date) - parseDate(b.date));
    let totalGrossInvGBP_sum = 0;

    sorted.forEach((tr: any) => {
        if (endDate && parseDate(tr.date) > parseDate(endDate)) return;
        const key = tr.ticker;
        if (!holdings[key]) holdings[key] = { ticker: key, qty: 0, netInvestment: 0, name: tr.asset || key };
        holdings[key].qty += (tr.quantity || 0);
        holdings[key].netInvestment += tr.investment; // +Cost for Buy, -Proceeds for Sell

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

    const assets = Object.values(holdings)
        .filter((h: any) => Math.abs(h.qty) > 0.000001)
        .map((h: any) => {
            const marketKey = h.ticker.endsWith('-USD') ? h.ticker : h.ticker + '-USD';
            const quote = marketData[marketKey] || marketData[h.ticker];
            const price = quote ? quote.price : 0; // USD

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
        }).sort((a: any, b: any) => b.brl - a.brl);

    const totalGbp = assets.reduce((sum: number, a: any) => sum + a.gbp, 0);
    const totalBrl = assets.reduce((sum: number, a: any) => sum + a.brl, 0);
    const totalInv = assets.reduce((sum: number, a: any) => sum + a.investmentGBP, 0);
    const totalGrossInv = totalGrossInvGBP_sum;
    const totalRoi = totalInv !== 0 ? ((totalGbp - totalInv) / totalInv) * 100 : 0;

    const individualHoldings = assets.map((a: any) => ({
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
            isTotal: true
        }
    };
};

export const getPensionSummary = (transactions, rates, pensionPrices = {}, marketData = {}, endDate = null, assetClasses = {}) => {
    // API: { asset, broker, allocationClass, quantity, price, value, type }
    // Logic:
    // Holdings by asset|broker
    const holdings = {};
    const lockedPnL = {}; // if any
    let totalGrossInvGBP_pension = 0;

    // transactions need to be sorted
    const sorted = [...transactions].sort((a: any, b: any) => parseDate(a.date) - parseDate(b.date));

    sorted.forEach((tr: any) => {
        if (endDate && parseDate(tr.date) > parseDate(endDate)) return;
        const key = `${tr.asset}|${tr.broker}`;
        if (!holdings[key]) holdings[key] = { asset: tr.asset, qty: 0, totalCost: 0, broker: tr.broker };

        const qty = parseFloat(tr.quantity) || 0;
        const val = parseFloat(tr.value) || 0;

        // API 'value' IS the transaction amount usually?
        // My API returns `value: Math.abs(r.amount)`.
        // Type: 'Buy' / 'Sell'.

        if (tr.type === 'Buy') {
            holdings[key].qty += qty;
            holdings[key].totalCost += val;
            totalGrossInvGBP_pension += val; // Pensions are assumed to be in GBP for this summary
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

    const activeHoldings = Object.values(holdings).filter((h: any) => Math.abs(h.qty) > 0.01);
    const brokers_list = ['Fidelity', 'Hargreaves Lansdown', 'Legal & General', 'OAB'];

    const brokerSummaries = brokers_list.map((b: any) => {
        const items = activeHoldings.filter((h: any) => h.broker === b);
        const cur = BROKER_CURRENCY[b] || 'GBP';
        let cv = 0;
        let pp = 0;

        items.forEach((h: any) => {
            let rawPrice = 0;
            let assetCurrency = cur;
            const mapEntry = pensionMap.find((m: any) => m.asset === h.asset);
            if (h.asset === 'Cash') rawPrice = 1.0;
            else if (mapEntry && mapEntry.ticker && marketData[mapEntry.ticker]) {
                rawPrice = marketData[mapEntry.ticker].price;
                assetCurrency = marketData[mapEntry.ticker].currency || 'USD';
            } else if (pensionPrices[h.asset]) {
                rawPrice = pensionPrices[h.asset].price;
                assetCurrency = pensionPrices[h.asset].currency;
            } else {
                rawPrice = h.qty > 0 ? h.totalCost / h.qty : 0;
            }

            // Convert
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
        const overrideCat = assetClasses[b]?.category || 'Equity'; // Default broker boxes safely to Equity; underneath items have precise mapping

        return {
            name: b,
            brl: cv * rates.BRL,
            gbp: cv,
            investmentGBP: pp,
            roi,
            nativeCurrency: overrideCur,
            category: overrideCat
        };
    }).filter(b => b.gbp > 0 || b.investmentGBP > 0);

    brokerSummaries.sort((a: any, b: any) => b.brl - a.brl);

    const totalGbp = brokerSummaries.reduce((sum: number, a: any) => sum + a.gbp, 0);
    const totalBrl = brokerSummaries.reduce((sum: number, a: any) => sum + a.brl, 0);
    const totalInv = brokerSummaries.reduce((sum: number, a: any) => sum + a.investmentGBP, 0);
    const totalGrossInv = totalGrossInvGBP_pension;
    const totalPnL = totalGbp - totalInv;
    const totalRoi = totalInv !== 0 ? (totalPnL / totalInv) * 100 : 0;

    const individualHoldings = activeHoldings.map((h: any) => {
        const mapEntry = pensionMap.find((m: any) => m.asset === h.asset);
        const cur = BROKER_CURRENCY[h.broker] || 'GBP';
        let rawPrice = 0;
        let assetCurrency = cur;

        if (h.asset === 'Cash') rawPrice = 1.0;
        else if (mapEntry && mapEntry.ticker && marketData[mapEntry.ticker]) {
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

        return {
            name: h.asset,
            brl,
            gbp,
            broker: h.broker
        };
    });

    return {
        assets: brokerSummaries,
        individualHoldings,
        total: {
            name: 'Total',
            brl: totalBrl,
            gbp: totalGbp,
            investmentGBP: totalInv,
            grossInvGBP: totalGrossInv,
            roi: totalRoi,
            isTotal: true
        }
    };
};

export const getDebtSummary = (transactions, rates, endDate = null, assetClasses = {}) => {
    // API: { lender, value_brl, obs }
    const summary = transactions.reduce((acc, t) => {
        if (endDate && parseDate(t.date) > parseDate(endDate)) return acc;
        const lender = t.lender || 'Unknown';
        if (!acc[lender]) acc[lender] = { name: lender, brl: 0, gbp: 0 };
        acc[lender].brl += (t.value_brl || 0);
        // Calc GBP
        acc[lender].gbp += ((t.value_brl || 0) / rates.BRL);
        return acc;
    }, {});

    // ... rest same as before
    const assets = Object.values(summary).map((a: any) => {
        const overrideCur = assetClasses[a.name]?.currency || 'BRL';
        const overrideCat = assetClasses[a.name]?.category || 'Fixed Income';

        return {
            ...a,
            investmentGBP: a.gbp,
            roi: 0,
            nativeCurrency: overrideCur,
            category: overrideCat
        };
    }).sort((a: any, b: any) => b.brl - a.brl);

    const totalBrl = assets.reduce((sum: number, a: any) => sum + a.brl, 0);
    const totalGbp = assets.reduce((sum: number, a: any) => sum + a.gbp, 0);

    const individualHoldings = assets.map((a: any) => ({
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
            investmentGBP: totalGbp,
            roi: 0,
            isTotal: true
        }
    };
};

// Exports compatible for Dashboard
export const getMasterMixData = (
    fixedIncomeTr,
    realEstateData,
    equityTr,
    cryptoTr,
    pensionTr,
    rates,
    pensionMapInput,
    marketData,
    pensionPrices,
    currentPrices = {},
    assetClasses = {}
) => {
    // 1. Base Bucket Totals (Excluding Pensions)
    const fiData = getFixedIncomeSummary(fixedIncomeTr, rates, null, assetClasses);
    let masterFI = fiData.total.gbp || 0;

    const reData = getRealEstateSummary(realEstateData, marketData, rates, null, assetClasses);
    let masterRE = reData.total.gbp || 0;

    const cryptoData = getCryptoSummary(cryptoTr, marketData, rates, null, assetClasses);
    let masterCrypto = cryptoData.total.gbp || 0;

    const equityData = getEquitySummary(equityTr, marketData, rates, null, assetClasses);
    let masterEquity = equityData.total.gbp || 0;

    // Extract Cash holdings from equity transactions (e.g. Trading 212 Cash balance)
    // getEquitySummary groups by broker and includes Cash at face value inside each broker's total.
    // We need to pull that cash out into the masterCash bucket.
    let equityCashGBP = 0;
    if (equityTr && equityTr.length > 0) {
        // Accumulate cash qty per broker (asset === 'Cash' or ticker === 'Cash')
        const cashByBroker = {};
        equityTr.forEach((tr: any) => {
            const isCash = tr.asset === 'Cash' || tr.ticker === 'Cash';
            if (!isCash) return;
            const broker = tr.broker || '__none__';
            if (!cashByBroker[broker]) cashByBroker[broker] = { qty: 0, currency: BROKER_CURRENCY[tr.broker] || 'GBP' };
            // Raw signed quantity from DB (Buy > 0, Sell < 0 — same convention as getEquitySummary)
            cashByBroker[broker].qty += (parseFloat(tr.quantity) || 0);
        });
        Object.values(cashByBroker).forEach(({ qty, currency }) => {
            if (Math.abs(qty) < 0.001) return;
            // Cash price is 1 in broker currency
            const toGBP = (v, c) => c === 'GBP' ? v : (c === 'BRL' ? v / rates.BRL : v / rates.USD);
            equityCashGBP += toGBP(Math.abs(qty), currency);
        });
    }
    // Shift cash from equity bucket to cash bucket
    masterEquity = Math.max(0, masterEquity - equityCashGBP);
    let masterCash = equityCashGBP; // Start with equity cash; pension cash added below

    // 2. Pension Redistribution
    const pensionHoldings = {};
    pensionTr.forEach((tr: any) => {
        const key = tr.asset;
        if (!pensionHoldings[key]) pensionHoldings[key] = {
            asset: tr.asset,
            qty: 0,
            broker: tr.broker,
            allocationClass: tr.allocationClass // Legacy, fallback
        };

        const qty = parseFloat(tr.quantity) || 0;
        if (tr.type === 'Buy') pensionHoldings[key].qty += qty;
        else if (tr.type === 'Sell') pensionHoldings[key].qty -= qty;
    });

    Object.values(pensionHoldings).filter((h: any) => Math.abs(h.qty) > 0.01).forEach((h: any) => {
        // Price Lookup
        const mapEntry = pensionMapInput.find((m: any) => m.asset === h.asset);
        const cur = BROKER_CURRENCY[h.broker] || 'GBP';
        let rawPrice = 0;
        let assetCurrency = cur;

        if (h.asset === 'Cash') rawPrice = 1.0;
        else if (mapEntry && mapEntry.ticker && marketData[mapEntry.ticker]) {
            rawPrice = marketData[mapEntry.ticker].price;
            assetCurrency = marketData[mapEntry.ticker].currency || 'USD';
        } else if (pensionPrices && pensionPrices[h.asset]) {
            rawPrice = pensionPrices[h.asset].price;
            assetCurrency = pensionPrices[h.asset].currency;
        } else if (currentPrices && currentPrices[h.asset]) {
            rawPrice = currentPrices[h.asset];
            if (mapEntry && mapEntry.currency) assetCurrency = mapEntry.currency;
        }

        // Convert to GBP
        let priceInGBP = rawPrice;
        if (assetCurrency !== 'GBP' && rawPrice > 0 && rates) {
            const toGBP = (v, c) => c === 'GBP' ? v : (c === 'BRL' ? v / rates.BRL : v / rates.USD);
            priceInGBP = toGBP(rawPrice, assetCurrency);
        }

        const valGBP = priceInGBP * h.qty;

        // Redistribute based on allocations
        if (h.asset === 'Cash') {
            masterCash += valGBP;
        } else if (mapEntry && mapEntry.allocations) {
            Object.entries(mapEntry.allocations).forEach(([bucket, percentage]) => {
                const bucketVal = valGBP * percentage;
                if (bucket === 'Equity') masterEquity += bucketVal;
                else if (bucket === 'Fixed Income') masterFI += bucketVal;
                else if (bucket === 'Real Estate') masterRE += bucketVal;
                else if (bucket === 'Crypto') masterCrypto += bucketVal;
                else if (bucket === 'Cash') masterCash += bucketVal;
            });
        } else {
            // Fallback to legacy single class
            let alloc = mapEntry?.allocationClass || h.allocationClass || 'Equity';
            if (alloc === 'Fixed Income') masterFI += valGBP;
            else if (alloc === 'Real Estate') masterRE += valGBP;
            else if (alloc === 'Crypto') masterCrypto += valGBP;
            else masterEquity += valGBP;
        }
    });

    const totalCalculated = masterEquity + masterFI + masterRE + masterCrypto + masterCash;

    // --- Currency Exposure Aggregation (in GBP equivalents) ---
    let masterGBP = 0;
    let masterUSD = 0;
    let masterBRL = 0;

    const accumulateCurrency = (data) => {
        if (!data || !data.individualHoldings) return;
        data.individualHoldings.forEach((h: any) => {
            const assetCur = h.nativeCurrency || assetClasses[h.name]?.currency || 'GBP';
            if (assetCur === 'BRL') masterBRL += h.gbp;
            else if (assetCur === 'USD') masterUSD += h.gbp;
            else masterGBP += h.gbp;
        });
    };

    accumulateCurrency(fiData);
    accumulateCurrency(reData);
    accumulateCurrency(cryptoData);
    accumulateCurrency(equityData);

    // Pension Currency Exposure (mostly GBP or USD based on map)
    Object.values(pensionHoldings).filter((h: any) => Math.abs(h.qty) > 0.01).forEach((h: any) => {
        const mapEntry = pensionMapInput.find((m: any) => m.asset === h.asset);
        const cur = BROKER_CURRENCY[h.broker] || 'GBP';
        let assetCurrency = cur;

        let rawPrice = 0;
        if (h.asset === 'Cash') rawPrice = 1.0;
        else if (mapEntry && mapEntry.ticker && marketData[mapEntry.ticker]) {
            rawPrice = marketData[mapEntry.ticker].price;
            assetCurrency = marketData[mapEntry.ticker].currency || 'USD';
        } else if (pensionPrices && pensionPrices[h.asset]) {
            rawPrice = pensionPrices[h.asset].price;
            assetCurrency = pensionPrices[h.asset].currency;
        } else if (currentPrices && currentPrices[h.asset]) {
            rawPrice = currentPrices[h.asset];
            if (mapEntry && mapEntry.currency) assetCurrency = mapEntry.currency;
        }

        let priceInGBP = rawPrice;
        if (assetCurrency !== 'GBP' && rawPrice > 0 && rates) {
            const toGBP = (v, c) => c === 'GBP' ? v : (c === 'BRL' ? v / rates.BRL : v / rates.USD);
            priceInGBP = toGBP(rawPrice, assetCurrency);
        }

        const valGBP = priceInGBP * h.qty;

        // Add to exposure
        const finalCur = assetClasses[h.asset]?.currency || assetCurrency;
        if (finalCur === 'BRL') masterBRL += valGBP;
        else if (finalCur === 'USD') masterUSD += valGBP;
        else masterGBP += valGBP; // Default GBP
    });

    return {
        buckets: {
            Equity: masterEquity,
            FixedIncome: masterFI,
            RealEstate: masterRE,
            Crypto: masterCrypto,
            Cash: masterCash
        },
        percentages: {
            Equity: totalCalculated > 0 ? (masterEquity / totalCalculated) * 100 : 0,
            FixedIncome: totalCalculated > 0 ? (masterFI / totalCalculated) * 100 : 0,
            RealEstate: totalCalculated > 0 ? (masterRE / totalCalculated) * 100 : 0,
            Crypto: totalCalculated > 0 ? (masterCrypto / totalCalculated) * 100 : 0,
            Cash: totalCalculated > 0 ? (masterCash / totalCalculated) * 100 : 0,
        },
        byCurrency: {
            GBP: masterGBP,
            USD: masterUSD,
            BRL: masterBRL
        },
        total: totalCalculated
    };
};

export const getAllocationSummary = (
    fixedIncomeTr,
    realEstateData,
    equityTr,
    cryptoTr,
    pensionTr,
    rates,
    pensionMapInput,
    marketData,
    pensionPrices,
    currentPrices = {}
) => {
    // 1. Fixed Income
    const fiData = getFixedIncomeSummary(fixedIncomeTr, rates);
    const fiTotal = fiData.total.gbp || 0;

    // 2. Real Estate
    const reData = getRealEstateSummary(realEstateData, marketData, rates);
    const reTotal = reData.total.gbp || 0;

    // 3. Crypto
    const cryptoData = getCryptoSummary(cryptoTr, marketData, rates);
    const cryptoTotal = cryptoData.total.gbp || 0;

    // 4. Equity
    const equityData = getEquitySummary(equityTr, marketData, rates);
    const equityTotal = equityData.total.gbp || 0;

    // 5. Pensions (Split)
    let pensionEquity = 0;
    let pensionFixedIncome = 0;

    // Adapted split logic matching getPensionSummary logic somewhat
    const pensionHoldings = {};
    pensionTr.forEach((tr: any) => {
        const key = tr.asset;
        if (!pensionHoldings[key]) pensionHoldings[key] = {
            asset: tr.asset,
            qty: 0,
            broker: tr.broker,
            allocationClass: tr.allocationClass
        };

        const qty = parseFloat(tr.quantity) || 0;
        if (tr.type === 'Buy') pensionHoldings[key].qty += qty;
        else if (tr.type === 'Sell') pensionHoldings[key].qty -= qty;
    });

    Object.values(pensionHoldings).filter((h: any) => Math.abs(h.qty) > 0.01).forEach((h: any) => {
        let alloc = 'Equity';
        const mapEntry = pensionMapInput.find((m: any) => m.asset === h.asset);
        if (mapEntry && mapEntry.allocationClass) alloc = mapEntry.allocationClass;
        else if (h.allocationClass) alloc = h.allocationClass;

        if (alloc === 'Fixed Income') alloc = 'FixedIncome';

        // Price Lookup (Duplicated from getPensionSummary for safety)
        const cur = BROKER_CURRENCY[h.broker] || 'GBP';
        let rawPrice = 0;
        let assetCurrency = cur;

        if (h.asset === 'Cash') rawPrice = 1.0;
        else if (mapEntry && mapEntry.ticker && marketData[mapEntry.ticker]) {
            rawPrice = marketData[mapEntry.ticker].price;
            assetCurrency = marketData[mapEntry.ticker].currency || 'USD';
        } else if (pensionPrices && pensionPrices[h.asset]) {
            rawPrice = pensionPrices[h.asset].price;
            assetCurrency = pensionPrices[h.asset].currency;
        } else if (currentPrices && currentPrices[h.asset]) {
            rawPrice = currentPrices[h.asset];
            if (mapEntry && mapEntry.currency) assetCurrency = mapEntry.currency;
        }

        // Convert to GBP
        let priceInGBP = rawPrice;
        if (assetCurrency !== 'GBP' && rawPrice > 0 && rates) { // Fixed: was assetCurrency === 'USD'
            // Generic convert
            const toGBP = (v, c) => c === 'GBP' ? v : (c === 'BRL' ? v / rates.BRL : v / rates.USD); // Simplified
            priceInGBP = toGBP(rawPrice, assetCurrency);
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
