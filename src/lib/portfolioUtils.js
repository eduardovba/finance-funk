import pensionMap from '../data/pension_fund_map.json';

const BROKER_CURRENCY = {
    'Trading 212': 'GBP', 'XP': 'BRL', 'Amazon': 'USD', 'GGF': 'USD', 'Green Gold Farms': 'USD', 'Monzo': 'GBP', 'Fidelity': 'GBP',
    'Hargreaves Lansdown': 'GBP', 'Legal & General': 'GBP', 'OAB': 'GBP'
};

const normalizeName = (name) => {
    if (!name) return 'Unknown';
    const lower = name.toLowerCase();
    if (lower.includes('nubank')) return 'NuBank';
    if (lower.includes('xp')) return 'XP';
    if (lower.includes('inter')) return 'Inter';
    if (lower.includes('santander')) return 'Santander';
    if (lower.includes('monzo')) return 'Monzo';
    if (lower.includes('fidelity')) return 'Fidelity';
    return name;
};

export const getFixedIncomeSummary = (transactions, rates) => {
    const accountMap = {};

    transactions.forEach(tr => {
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

        const toGBP = (val) => cur === 'GBP' ? val : val / (cur === 'BRL' ? rates.BRL : rates.USD);

        const investment = tr.investment || 0;
        const interest = tr.interest || 0;

        const gbpVal = toGBP(investment + interest);
        const invGbp = toGBP(investment);

        const name = normalizeName(tr.account);
        if (!accountMap[name]) {
            accountMap[name] = { name, gbp: 0, brl: 0, investmentGBP: 0 };
        }
        accountMap[name].gbp += gbpVal;
        accountMap[name].investmentGBP += invGbp;
    });

    const assets = Object.values(accountMap)
        .map(acc => {
            const brl = acc.gbp * rates.BRL;
            const roi = acc.investmentGBP !== 0 ? ((acc.gbp - acc.investmentGBP) / Math.abs(acc.investmentGBP)) * 100 : 0;
            return {
                name: acc.name,
                brl,
                gbp: acc.gbp,
                investmentGBP: acc.investmentGBP,
                roi
            };
        })
        .filter(asset => asset.brl >= 10)
        .sort((a, b) => b.brl - a.brl);

    const totalGbp = assets.reduce((sum, a) => sum + a.gbp, 0);
    const totalBrl = assets.reduce((sum, a) => sum + a.brl, 0);
    const totalInv = assets.reduce((sum, a) => sum + a.investmentGBP, 0);
    const totalRoi = totalInv !== 0 ? ((totalGbp - totalInv) / Math.abs(totalInv)) * 100 : 0;

    return {
        assets,
        total: {
            name: 'Total',
            brl: totalBrl,
            gbp: totalGbp,
            investmentGBP: totalInv,
            roi: totalRoi,
            isTotal: true
        }
    };
};

export const getRealEstateSummary = (data, marketData = {}, rates) => {
    // data structure from API: { properties: [], inkCourt: { ledger: [] }, funds: { transactions: [], holdings: [] }, airbnb: ... }
    const { properties, funds, airbnb, inkCourt } = data;
    const BRL = rates.BRL;

    // 1. Funds
    const fundSummary = {};
    let fundsTotalValueBrl = 0;
    let fundsTotalInvestmentBrl = 0;

    if (funds && funds.transactions) {
        funds.transactions.forEach(tr => {
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
    const propertyAssets = (properties || []).filter(p => p.status === 'Owned').map(p => {
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
            const totalPrincipalPaid = inkCourt.ledger.reduce((sum, t) => sum + (t.principal || 0), 0);
            const mortgageBalance = (inkCourt.mortgageAmount || 0) - totalPrincipalPaid;
            const currentPrice = inkCourt.marketValue || inkCourt.propertyValue;
            const equity = (currentPrice || 0) - mortgageBalance;
            displayValue = equity;
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
                monthEntry.transactions.forEach(t => {
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

        return {
            name: p.name,
            brl,
            gbp,
            investmentGBP,
            roi
        };
    });

    // Add Funds as a single row
    if (fundsTotalValueBrl > 0 || fundsTotalInvestmentBrl > 0) {
        const fundsRoi = fundsTotalInvestmentBrl !== 0 ? ((fundsTotalValueBrl - fundsTotalInvestmentBrl) / fundsTotalInvestmentBrl * 100) : 0;
        propertyAssets.push({
            name: 'FIIs (Funds)',
            brl: fundsTotalValueBrl,
            gbp: fundsTotalValueBrl / BRL,
            investmentGBP: fundsTotalInvestmentBrl / BRL,
            roi: fundsRoi
        });
    }

    propertyAssets.sort((a, b) => b.brl - a.brl);

    const totalGbp = propertyAssets.reduce((sum, a) => sum + a.gbp, 0);
    const totalBrl = propertyAssets.reduce((sum, a) => sum + a.brl, 0);
    const totalInv = propertyAssets.reduce((sum, a) => sum + a.investmentGBP, 0);

    // Simple ROI
    const totalRoi = totalInv !== 0 ? ((totalGbp - totalInv) / totalInv) * 100 : 0;

    return {
        assets: propertyAssets,
        total: {
            name: 'Total',
            brl: totalBrl,
            gbp: totalGbp,
            investmentGBP: totalInv,
            roi: totalRoi,
            isTotal: true
        }
    };
};

export const getEquitySummary = (transactions, marketData = {}, rates) => {
    const holdings = {};
    const lockedPnL = {};

    // Transactions array from API. 
    // Fields: { asset, ticker, broker, currency, quantity, investment, pnl, type }
    // API: Buy -> Investment = Negative (-Cost)? Or Positive?
    // Let's check api/equity/route.js.
    // "investment: -r.amount" (where buy amount < 0). So Investment IS POSITIVE cost.
    // "type": 'Buy' / 'Sell'.

    // Previous JSON logic: Buy -> Investment < 0? No, usually JSONs had Investment < 0 for Outflows (Buys).
    // EXCEPT `equity_transactions.json` was weird.
    // Let's rely on `tr.type`.

    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    sorted.forEach(tr => {
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

    const activeHoldings = Object.values(holdings).filter(h => Math.abs(h.qty) > 0.01);

    // Broker grouping similar to before...
    const brokers = {};
    activeHoldings.forEach(h => {
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
            const toUSD = (v, c) => c === 'USD' ? v : (c === 'GBP' ? v * rates.USD : v * (rates.USD / rates.BRL));
            const fromUSD = (v, c) => c === 'USD' ? v : (c === 'GBP' ? v / rates.USD : v * (rates.BRL / rates.USD));

            // Convert to USD first
            const valUSD = toUSD(rawPrice, assetCurrency);
            // Convert to Target
            priceInBrokerCur = fromUSD(valUSD, cur);
        }

        const cv = priceInBrokerCur * Math.abs(h.qty);
        // Cost is `h.totalCost`.
        const pp = h.totalCost;

        // Convert Totals to GBP
        const toGBP = (val, currency) => {
            if (currency === 'GBP') return val;
            if (currency === 'BRL') return val / rates.BRL;
            if (currency === 'USD') return val / rates.USD;
            return val;
        };

        brokers[h.broker].cvGBP += toGBP(cv, cur);
        brokers[h.broker].ppGBP += toGBP(pp, cur);
    });

    // Add Locked PnL
    Object.keys(lockedPnL).forEach(b => {
        if (!brokers[b]) brokers[b] = { cvGBP: 0, ppGBP: 0 };
        const cur = BROKER_CURRENCY[b] || 'GBP';
        const lockedGBP = (lockedPnL[b] || 0) / (cur === 'GBP' ? 1 : (cur === 'BRL' ? rates.BRL : cur === 'USD' ? rates.USD : 1));
        brokers[b].lockedGBP = (brokers[b].lockedGBP || 0) + lockedGBP;
    });

    const assets = Object.keys(brokers).map(b => {
        const { cvGBP, ppGBP, lockedGBP } = brokers[b];
        const pnl = (cvGBP - ppGBP) + (lockedGBP || 0);
        const roi = ppGBP !== 0 ? (pnl / ppGBP) * 100 : 0;
        return {
            name: b,
            brl: cvGBP * rates.BRL,
            gbp: cvGBP,
            investmentGBP: ppGBP,
            roi
        };
    }).sort((a, b) => b.brl - a.brl);

    const totalGbp = assets.reduce((sum, a) => sum + a.gbp, 0);
    const totalBrl = assets.reduce((sum, a) => sum + a.brl, 0);
    const totalInv = assets.reduce((sum, a) => sum + a.investmentGBP, 0);

    let grandTotalLockedGBP = 0;
    Object.values(brokers).forEach(b => grandTotalLockedGBP += (b.lockedGBP || 0));

    const totalPnL = (totalGbp - totalInv) + grandTotalLockedGBP;
    const totalRoi = totalInv !== 0 ? (totalPnL / totalInv) * 100 : 0;

    return {
        assets,
        total: {
            name: 'Total',
            brl: totalBrl,
            gbp: totalGbp,
            investmentGBP: totalInv,
            roi: totalRoi,
            isTotal: true
        }
    };
};

export const getCryptoSummary = (transactions, marketData = {}, rates) => {
    // Keep existing logic but adapt to API shape if needed
    // API: { ticker, quantity, investment, type }
    // Logic seems compatible if fields allow.

    const holdings = {};
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(tr => {
        const key = tr.ticker;
        if (!holdings[key]) holdings[key] = { ticker: key, qty: 0, netInvestment: 0, name: tr.asset || key };
        holdings[key].qty += (tr.quantity || 0);
        holdings[key].netInvestment += tr.investment; // +Cost for Buy, -Proceeds for Sell
        if (Math.abs(holdings[key].qty) < 0.000001) {
            holdings[key].netInvestment = 0;
            holdings[key].qty = 0;
        }
    });

    const assets = Object.values(holdings)
        .filter(h => Math.abs(h.qty) > 0.000001)
        .map(h => {
            const marketKey = h.ticker.endsWith('-USD') ? h.ticker : h.ticker + '-USD';
            const quote = marketData[marketKey] || marketData[h.ticker];
            const price = quote ? quote.price : 0; // USD

            const valUSD = price * h.qty;
            const valGBP = valUSD / rates.USD;
            const valBRL = valGBP * rates.BRL;

            const investGBP = h.netInvestment / rates.USD;

            const roi = investGBP !== 0 ? ((valGBP - investGBP) / investGBP) * 100 : 0;

            return {
                name: h.name,
                brl: valBRL,
                gbp: valGBP,
                investmentGBP: investGBP,
                roi
            };
        }).sort((a, b) => b.brl - a.brl);

    const totalGbp = assets.reduce((sum, a) => sum + a.gbp, 0);
    const totalBrl = assets.reduce((sum, a) => sum + a.brl, 0);
    const totalInv = assets.reduce((sum, a) => sum + a.investmentGBP, 0);
    const totalRoi = totalInv !== 0 ? ((totalGbp - totalInv) / totalInv) * 100 : 0;

    return {
        assets,
        total: {
            name: 'Total',
            brl: totalBrl,
            gbp: totalGbp,
            investmentGBP: totalInv,
            roi: totalRoi,
            isTotal: true
        }
    };
};

export const getPensionSummary = (transactions, rates, pensionPrices = {}, marketData = {}) => {
    // API: { asset, broker, allocationClass, quantity, price, value, type }
    // Logic:
    // Holdings by asset|broker
    const holdings = {};
    const lockedPnL = {}; // if any

    // transactions need to be sorted
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(tr => {
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

    const activeHoldings = Object.values(holdings).filter(h => Math.abs(h.qty) > 0.01);
    const brokers_list = ['Fidelity', 'Hargreaves Lansdown', 'Legal & General', 'OAB'];

    const brokerSummaries = brokers_list.map(b => {
        const items = activeHoldings.filter(h => h.broker === b);
        const cur = BROKER_CURRENCY[b] || 'GBP';
        let cv = 0;
        let pp = 0;

        items.forEach(h => {
            let rawPrice = 0;
            let assetCurrency = cur;
            const mapEntry = pensionMap.find(m => m.asset === h.asset);
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

        return {
            name: b,
            brl: cv * rates.BRL,
            gbp: cv,
            investmentGBP: pp,
            roi
        };
    }).filter(b => b.gbp > 0 || b.investmentGBP > 0);

    brokerSummaries.sort((a, b) => b.brl - a.brl);

    const totalGbp = brokerSummaries.reduce((sum, a) => sum + a.gbp, 0);
    const totalBrl = brokerSummaries.reduce((sum, a) => sum + a.brl, 0);
    const totalInv = brokerSummaries.reduce((sum, a) => sum + a.investmentGBP, 0);
    const totalPnL = totalGbp - totalInv;
    const totalRoi = totalInv !== 0 ? (totalPnL / totalInv) * 100 : 0;

    return {
        assets: brokerSummaries,
        total: {
            name: 'Total',
            brl: totalBrl,
            gbp: totalGbp,
            investmentGBP: totalInv,
            roi: totalRoi,
            isTotal: true
        }
    };
};

export const getDebtSummary = (transactions, rates) => {
    // API: { lender, value_brl, obs }
    const summary = transactions.reduce((acc, t) => {
        const lender = t.lender || 'Unknown';
        if (!acc[lender]) acc[lender] = { name: lender, brl: 0, gbp: 0 };
        acc[lender].brl += (t.value_brl || 0);
        // Calc GBP
        acc[lender].gbp += ((t.value_brl || 0) / rates.BRL);
        return acc;
    }, {});

    // ... rest same as before
    const assets = Object.values(summary).map(a => ({
        ...a,
        investmentGBP: a.gbp,
        roi: 0
    })).sort((a, b) => b.brl - a.brl);

    const totalBrl = assets.reduce((sum, a) => sum + a.brl, 0);
    const totalGbp = assets.reduce((sum, a) => sum + a.gbp, 0);

    return {
        assets,
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

// Exports compatible for Dashboard (totalCurrentValueGBP only needed?)
// No, getAllocationSummary needs them all.

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
    pensionTr.forEach(tr => {
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

    Object.values(pensionHoldings).filter(h => Math.abs(h.qty) > 0.01).forEach(h => {
        let alloc = 'Equity';
        const mapEntry = pensionMapInput.find(m => m.asset === h.asset);
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
