const pensionMap = [];

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
        const gbpVal = tr.currency === 'GBP' ? tr.investment + tr.interest : (tr.investment + tr.interest) / rates.BRL;
        const invGbp = tr.currency === 'GBP' ? tr.investment : tr.investment / rates.BRL;

        const name = normalizeName(tr.account);
        if (!accountMap[name]) {
            accountMap[name] = { name, gbp: 0, brl: 0, investmentGBP: 0 };
        }
        accountMap[name].gbp += gbpVal;
        accountMap[name].investmentGBP += invGbp;
    });

    const assets = Object.values(accountMap)
        .filter(acc => Math.abs(acc.gbp) > 0.01 || Math.abs(acc.investmentGBP) > 0.01)
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
    const { properties, funds, airbnb, inkCourt } = data;
    const BRL = rates.BRL;

    // 1. Funds
    const fundSummary = {};
    let fundsTotalValueBrl = 0;
    let fundsTotalInvestmentBrl = 0;

    if (funds && funds.transactions) {
        funds.transactions.forEach(tr => {
            const ticker = tr.fund.split(' - ')[1] || tr.fund;
            if (!fundSummary[ticker]) fundSummary[ticker] = { totalQuantity: 0, totalInvestment: 0 };
            fundSummary[ticker].totalQuantity += tr.quantity;
            fundSummary[ticker].totalInvestment += tr.investment;
        });

        Object.entries(fundSummary).forEach(([ticker, summary]) => {
            const holding = funds.holdings ? funds.holdings.find(h => h.ticker === ticker) : null;
            const liveData = marketData[`${ticker}.SA`];
            const currentPrice = liveData?.price || holding?.currentPrice || 0;
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
            // In RealEstateTab: displayValue = p.investment
            displayValue = p.investment;
        } else if (p.id === 'ink-court' && inkCourt) {
            const totalPrincipalPaid = inkCourt.ledger.reduce((sum, t) => sum + (t.principal || 0), 0);
            const deposit = inkCourt.deposit || 0;
            const stampDuty = inkCourt.ledger.find(l => l.source === 'Stamp Duty')?.costs || 0;
            const equity = deposit + stampDuty + totalPrincipalPaid;

            displayValue = equity; // Current Value = Equity
            investment = equity;   // Investment = Equity (user request in prior task)
            investmentGBP = equity; // It is in GBP
        }

        let brl = p.currency === 'GBP' ? displayValue * BRL : displayValue;
        let gbp = p.currency === 'GBP' ? displayValue : displayValue / BRL;

        // P&L and ROI
        let roi = 0;

        // For Zara, link to Airbnb profit
        if (p.id === 'zara' && airbnb) {
            // Calculate Airbnb Profit
            let revenue = 0;
            let costs = 0;
            airbnb.ledger.forEach(l => {
                if (l.transactions) {
                    l.transactions.forEach(t => {
                        if (t.type === 'Revenue') revenue += t.amount;
                        if (t.type === 'Cost') costs += t.amount;
                    });
                } else {
                    // Legacy structure
                    revenue += l.revenue || 0;
                    costs += l.costs || 0;
                }
            });
            const profit = revenue - costs;
            // Hardcoded denominator from Tab or use investment?
            // Tab uses 444204 BRL as denominator.
            roi = (profit / 444204) * 100;
        } else {
            // Standard ROI
            // Ink Court ROI is 0% based on logic: displayValue = investment
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
        // ROI for funds
        const fundsRoi = fundsTotalInvestmentBrl !== 0 ? ((fundsTotalValueBrl - fundsTotalInvestmentBrl) / fundsTotalInvestmentBrl * 100) : 0;

        propertyAssets.push({
            name: 'FIIs (Funds)',
            brl: fundsTotalValueBrl,
            gbp: fundsTotalValueBrl / BRL,
            investmentGBP: fundsTotalInvestmentBrl / BRL,
            roi: fundsRoi
        });
    }

    // Sort by BRL
    propertyAssets.sort((a, b) => b.brl - a.brl);

    const totalGbp = propertyAssets.reduce((sum, a) => sum + a.gbp, 0);
    const totalBrl = propertyAssets.reduce((sum, a) => sum + a.brl, 0);
    const totalInv = propertyAssets.reduce((sum, a) => sum + a.investmentGBP, 0);

    // Total ROI calculation - Weighted Average to respect custom logic (Zara)
    let weightedRoiSum = 0;
    let totalWeight = 0;

    propertyAssets.forEach(a => {
        if (a.investmentGBP > 0) {
            weightedRoiSum += (a.roi * a.investmentGBP);
            totalWeight += a.investmentGBP;
        }
    });

    const totalRoi = totalWeight !== 0 ? (weightedRoiSum / totalWeight) : 0;

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

    // Process transactions
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    sorted.forEach(tr => {
        const key = `${tr.asset}|${tr.broker}`;
        if (!holdings[key]) {
            holdings[key] = { asset: tr.asset, qty: 0, totalCost: 0, broker: tr.broker, currency: tr.currency, ticker: tr.ticker };
        }
        if (tr.ticker && !holdings[key].ticker) holdings[key].ticker = tr.ticker;
        if (!lockedPnL[tr.broker]) lockedPnL[tr.broker] = 0;

        const qty = parseFloat(tr.quantity) || 0;
        const rawInv = parseFloat(tr.investment) || 0;

        // Average Cost Basis Logic
        if (qty > 0) {
            // BUY or Transfer In
            holdings[key].qty += qty;
            holdings[key].totalCost += rawInv;
        } else if (qty < 0) {
            // SELL or Transfer Out
            const currentQty = holdings[key].qty;
            const currentCost = holdings[key].totalCost;

            if (currentQty > 0) {
                const avgCostPerShare = currentCost / currentQty;
                const costOfSoldShares = Math.abs(qty) * avgCostPerShare;

                // Reduce Cost Basis by cost of sold shares
                holdings[key].totalCost -= costOfSoldShares;
                holdings[key].qty += qty;

                // Track Realized PnL (Proceeds - Cost Basis)
                // Proceeds = -rawInv (assuming negative investment for cash in)
                // But let's check sign. If inv is positive, proceeds = inv. If negative, proceeds = -inv.
                // In our data, Sells have varied signs. 
                // Let's assume Realized PnL is explicitly provided in `tr.pnl`.
                if (tr.pnl !== null && tr.pnl !== undefined) {
                    lockedPnL[tr.broker] += tr.pnl;
                }
            } else {
                // Short selling overlap or data error - fallback to cash flow
                holdings[key].qty += qty;
                holdings[key].totalCost += rawInv;
            }
        } else {
            // Dividend or other? (qty 0)
            // If it's a cost adjust, we might add to cost? 
            // For now ignore qty 0 unless it has investment?
            if (rawInv !== 0) holdings[key].totalCost += rawInv;
        }

        if (Math.abs(holdings[key].qty) < 0.00001) {
            holdings[key].totalCost = 0;
            holdings[key].qty = 0;
        }
    });

    const activeHoldings = Object.values(holdings).filter(h => Math.abs(h.qty) > 0.01);

    // Group by Broker
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
            // Fallback price if no market data: Use Avg Cost?
            // If we have no price, assuming Value = Cost is safe-ish for preventing crazy ROI
            rawPrice = h.qty > 0 ? h.totalCost / h.qty : 0;
        }

        // Convert to Broker Currency
        let priceInBrokerCur = rawPrice;
        if (assetCurrency !== cur && rawPrice > 0 && rates) {
            if (cur === 'GBP') {
                if (assetCurrency === 'USD') priceInBrokerCur = rawPrice / rates.USD;
                else if (assetCurrency === 'BRL') priceInBrokerCur = rawPrice / rates.BRL;
            } else if (cur === 'USD') {
                if (assetCurrency === 'GBP') priceInBrokerCur = rawPrice * rates.USD;
                else if (assetCurrency === 'BRL') priceInBrokerCur = (rawPrice / rates.BRL) * rates.USD;
            } else if (cur === 'BRL') {
                if (assetCurrency === 'GBP') priceInBrokerCur = rawPrice * rates.BRL;
                else if (assetCurrency === 'USD') priceInBrokerCur = (rawPrice / rates.USD) * rates.BRL;
            }
        }

        const cv = priceInBrokerCur * Math.abs(h.qty);
        const pp = h.totalCost; // Remaining Cost Basis

        // Convert Broker Totals to GBP for Summary
        const toGBP = (val, currency) => {
            if (currency === 'GBP') return val;
            if (currency === 'BRL') return val / rates.BRL;
            if (currency === 'USD') return val / rates.USD;
            return val;
        };

        brokers[h.broker].cvGBP += toGBP(cv, cur);
        brokers[h.broker].ppGBP += toGBP(pp, cur);
    });

    // Add Locked P&L to Broker P&L?
    // User wants "ROI" of the *Current Portfolio*.
    // Adding Realized PnL to the numerator distorts the performance of *current* holdings.
    // Standard "Portfolio View" usually shows Unrealized P&L/ROI.
    // "Total Return" would include Realized.
    // Given the complaint was "Wrong ROI", removing the Realized PnL from the calc is safer. 
    // It focuses on "How are my current holdings doing?".
    // I will calculating ROI purely as (Value - CostBasis) / CostBasis.

    /* 
    Object.keys(lockedPnL).forEach(b => {
        // ... (Legacy code removed to fix ROI skew)
    });
    */

    const assets = Object.keys(brokers).map(b => {
        const { cvGBP, ppGBP } = brokers[b];

        // ROI based on Unrealized PnL
        const roi = ppGBP !== 0 ? ((cvGBP - ppGBP) / ppGBP) * 100 : 0;

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

    // Total calc needs to include all locked P&L for accurate ROI
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
    const holdings = {};
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(tr => {
        const key = tr.ticker;
        if (!holdings[key]) holdings[key] = { ticker: key, qty: 0, netInvestment: 0, name: tr.asset || key };
        holdings[key].qty += (tr.quantity || 0);
        holdings[key].netInvestment += tr.investment;
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

            const investGBP = h.netInvestment / rates.USD; // holdings.netInvestment is USD

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
    const holdings = {};
    const lockedPnL = {};

    transactions.forEach(tr => {
        const key = `${tr.asset}|${tr.broker}`;
        if (!holdings[key]) holdings[key] = { asset: tr.asset, qty: 0, totalCost: 0, broker: tr.broker };
        if (!lockedPnL[tr.broker]) lockedPnL[tr.broker] = 0;

        const qty = parseFloat(tr.quantity) || 0;
        const val = parseFloat(tr.value) || 0;

        if (tr.type === 'Buy') {
            holdings[key].qty += qty;
            holdings[key].totalCost += val;
        } else if (tr.type === 'Sell') {
            holdings[key].qty -= qty;
            holdings[key].totalCost -= val;
        }

        if (holdings[key].qty === 0 && holdings[key].totalCost !== 0) {
            lockedPnL[tr.broker] += (-holdings[key].totalCost);
            holdings[key].totalCost = 0;
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

            // Convert to Broker Currency
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

        // Locked P&L (GBP) conversion not strictly needed if broker is GBP
        const locked = lockedPnL[b] || 0;
        // PnL & ROI
        const pnl = (cv - pp) + locked;
        const roi = pp !== 0 ? (pnl / pp) * 100 : 0;

        return {
            name: b,
            brl: cv * rates.BRL,
            gbp: cv,
            investmentGBP: pp,
            roi,
            locked // Internal use
        };
    }).filter(b => b.gbp > 0 || b.investmentGBP > 0); // Only active brokers

    brokerSummaries.sort((a, b) => b.brl - a.brl);

    const totalGbp = brokerSummaries.reduce((sum, a) => sum + a.gbp, 0);
    const totalBrl = brokerSummaries.reduce((sum, a) => sum + a.brl, 0);
    const totalInv = brokerSummaries.reduce((sum, a) => sum + a.investmentGBP, 0);
    const totalLocked = brokerSummaries.reduce((sum, a) => sum + (a.locked || 0), 0);

    const totalPnL = (totalGbp - totalInv) + totalLocked;
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
    // transactions: { lender, value_brl, value_gbp }
    const summary = transactions.reduce((acc, t) => {
        const lender = t.lender || 'Unknown';
        if (!acc[lender]) acc[lender] = { name: lender, brl: 0, gbp: 0 };
        acc[lender].brl += (t.value_brl || 0);
        acc[lender].gbp += (t.value_gbp || 0);
        return acc;
    }, {});

    const assets = Object.values(summary).map(a => ({
        ...a,
        investmentGBP: a.gbp, // Debt principal is effectively the investment/balance
        roi: 0 // Debt doesn't have ROI in this context
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

// Compatible exports for page.js existing logic (Total only)
export const calculateEquityHoldings = (tr, md, rt) => ({ totalCurrentValueGBP: getEquitySummary(tr, md, rt).total.gbp });
export const calculateCryptoHoldings = (tr, md, rt) => ({ totalCurrentValueGBP: getCryptoSummary(tr, md, rt).total.gbp });
export const calculatePensionHoldings = (tr, rt, pp, md) => ({ totalCurrentValueGBP: getPensionSummary(tr, rt, pp, md).total.gbp });
export const calculateRealEstateHoldings = (data, md, rt) => ({ totalCurrentValueGBP: getRealEstateSummary(data, md, rt).total.gbp });
