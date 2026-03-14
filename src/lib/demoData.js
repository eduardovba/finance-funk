// demoData.js
// Provides a comprehensive 3-year mock dataset for Finance Funk's "Explore Demo" mode.
// All values are deterministic (no Math.random) to ensure consistent chart rendering.
// Portfolio is designed around ~60% 3yr ROI with realistic rebalancing & reinvestment patterns.

const TODAY = new Date();
const currentYear = TODAY.getFullYear();
const currentMonth = TODAY.getMonth() + 1; // 1-12

// Helper to format date strings 'YYYY-MM-DD'
const d = (monthsAgo) => {
    const date = new Date(TODAY);
    date.setMonth(date.getMonth() - monthsAgo);
    return date.toISOString().split('T')[0];
};

// Helper for 'YYYY-MM'
const m = (monthsAgo) => {
    const date = new Date(TODAY);
    date.setMonth(date.getMonth() - monthsAgo);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// ── Deterministic pseudo-random using a sine-based hash ──
const sineRand = (seed) => {
    const x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x); // 0..1
};

// ── Generate 36 months of FX history ──
const generateFxHistory = () => {
    const history = {};
    for (let i = 36; i >= 0; i--) {
        const t = (36 - i) / 36;
        history[m(i)] = {
            USD: 1.21 + t * 0.07 + Math.sin(i * 0.5) * 0.015,
            BRL: 6.20 + t * 0.90 + Math.sin(i * 0.3) * 0.15,
            EUR: 1.13 + t * 0.04 + Math.sin(i * 0.4) * 0.01,
        };
    }
    return history;
};

export default {
    appSettings: { autoMonthlyCloseEnabled: true, layoutMode: 'modern' },
    forecastSettings: {
        annualInterestRate: 12,
        monthlyContribution: 6000,
        timeHorizon: 15,
        targetNetWorth: 5000000,
        startingAmount: null,
        anchorMode: 'historical',
        yearlyGoals: { 2031: 5000000 }
    },
    dashboardConfig: {
        charts: [
            {
                id: 'demo-networth',
                title: 'Total Net Worth History',
                chartType: 'area',
                dataSources: ['networth-history'],
                series: ['networthPrimary', 'networthSecondary', 'targetPrimary', 'actualGreen', 'actualRed'],
                order: 0,
                options: { dualAxis: true }
            },
            {
                id: 'demo-allocation-history',
                title: 'Asset Allocation History',
                chartType: 'stacked-area',
                dataSources: ['category-history'],
                series: ['RealEstate', 'Pensions', 'FixedIncome', 'Equity', 'Crypto', 'Debt'],
                order: 1,
                options: {}
            },
            {
                id: 'demo-roi',
                title: 'Portfolio ROI vs FX Rate',
                chartType: 'line',
                dataSources: ['roi-history', 'fx-rate-history'],
                series: ['roi', 'impliedRate'],
                order: 2,
                options: { dualAxis: true }
            },
            {
                id: 'demo-netflow',
                title: 'Net Inflow/Outflow',
                chartType: 'bar',
                dataSources: ['net-flow-history'],
                series: ['Net'],
                order: 3,
                options: {}
            },
            {
                id: 'demo-allocation-current',
                title: 'Allocation vs Targets (%)',
                chartType: 'horizontal-bar',
                dataSources: ['allocation-current'],
                series: ['actual', 'target'],
                order: 4,
                options: {}
            },
            {
                id: 'demo-currency-exposure',
                title: 'Currency Exposure (Net)',
                chartType: 'donut',
                dataSources: ['currency-exposure'],
                series: ['value'],
                order: 5,
                options: {}
            }
        ]
    },
    assetClasses: {
        "Equity":       { target: 45, color: "#10b981", active: true },
        "Fixed Income": { target: 12, color: "#0ea5e9", active: true },
        "Real Estate":  { target: 20, color: "#f59e0b", active: true },
        "Crypto":       { target: 10, color: "#8b5cf6", active: true },
        "Pensions":     { target: 10, color: "#ec4899", active: true },
        "Debt":         { target: 0,  color: "#ef4444", active: true }
    },
    allocationTargets: { "Equity": 45, "Fixed Income": 12, "Real Estate": 20, "Crypto": 10, "Pensions": 13 },
    rates: { GBP: 1, USD: 1.28, BRL: 7.10, EUR: 1.17, JPY: 190.0, CHF: 1.12, AUD: 1.96 },
    fxHistory: generateFxHistory(),
    pensionPrices: {
        "Vanguard Target Retirement": { price: 154.20 },
        "Fidelity UK Index": { price: 312.50 }
    },
    marketData: {
        "AAPL-USD":  { price: 185.50, name: "Apple Inc." },
        "MSFT-USD":  { price: 420.10, name: "Microsoft Corporation" },
        "GOOGL-USD": { price: 165.20, name: "Alphabet Inc." },
        "AMZN-USD":  { price: 178.30, name: "Amazon.com Inc." },
        "NVDA-USD":  { price: 880.00, name: "NVIDIA Corporation" },
        "TSLA-USD":  { price: 245.00, name: "Tesla Inc." },
        "META-USD":  { price: 510.00, name: "Meta Platforms Inc." },
        "BTC-USD":   { price: 65400.00, name: "Bitcoin" },
        "ETH-USD":   { price: 3450.00, name: "Ethereum" },
        "SOL-USD":   { price: 142.00, name: "Solana" },
        "GBP-USD":   { price: 1.28 },
        "GBP-BRL":   { price: 7.10 }
    },

    // ─── LEDGER DATA (monthly investment flows for TWR) ───
    // Reduced inflows so ROI stays positive with the calibrated portfolio
    get ledgerData() {
        const investments = [];
        for (let i = 36; i >= 1; i--) {
            const seed = i * 7;
            const isRebalanceMonth = i % 6 === 0;
            const baseFlow = 1800 + (36 - i) * 25;
            const variation = Math.round(sineRand(seed) * 800 - 200);
            const rebalanceBonus = isRebalanceMonth ? 1200 : 0;
            const total = baseFlow + variation + rebalanceBonus;
            investments.push({
                month: m(i),
                total,
                equity: Math.round(total * 0.40),
                fixedIncome: Math.round(total * 0.10),
                realEstate: Math.round(total * 0.10),
                crypto: Math.round(total * 0.20),
                pensions: Math.round(total * 0.12),
                debt: Math.round(total * 0.08)
            });
        }
        return { investments };
    },

    // ─── TRANSACTIONS ───
    // Equity: moderate positions — ~£55k total value
    equityTransactions: [
        { id: "e1",  date: d(35), asset: "Apple Inc.",              ticker: "AAPL-USD",  quantity: 20,  investment: 2800,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e2",  date: d(32), asset: "Microsoft Corporation",   ticker: "MSFT-USD",  quantity: 10,  investment: 3200,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e3",  date: d(28), asset: "NVIDIA Corporation",      ticker: "NVDA-USD",  quantity: 12,  investment: 3600,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e4",  date: d(24), asset: "Alphabet Inc.",           ticker: "GOOGL-USD", quantity: 40,  investment: 4800,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        // Rebalance: sell some AAPL, buy more NVDA
        { id: "e5",  date: d(21), asset: "Apple Inc.",              ticker: "AAPL-USD",  quantity: -5,  investment: -800,  broker: "Interactive Brokers", currency: "USD", type: "Sell" },
        { id: "e6",  date: d(21), asset: "NVIDIA Corporation",      ticker: "NVDA-USD",  quantity: 4,   investment: 2000,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e7",  date: d(18), asset: "Amazon.com Inc.",         ticker: "AMZN-USD",  quantity: 15,  investment: 1950,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e8",  date: d(15), asset: "Tesla Inc.",              ticker: "TSLA-USD",  quantity: 10,  investment: 2200,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e9",  date: d(12), asset: "Meta Platforms Inc.",     ticker: "META-USD",  quantity: 8,   investment: 3040,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        // Rebalance: trim Alphabet, add more MSFT
        { id: "e10", date: d(10), asset: "Alphabet Inc.",           ticker: "GOOGL-USD", quantity: -10, investment: -1500, broker: "Interactive Brokers", currency: "USD", type: "Sell" },
        { id: "e11", date: d(10), asset: "Microsoft Corporation",   ticker: "MSFT-USD",  quantity: 5,   investment: 2000,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e12", date: d(8),  asset: "Apple Inc.",              ticker: "AAPL-USD",  quantity: 10,  investment: 1680,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e13", date: d(6),  asset: "NVIDIA Corporation",      ticker: "NVDA-USD",  quantity: 5,   investment: 3750,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e14", date: d(3),  asset: "Apple Inc.",              ticker: "AAPL-USD",  quantity: 8,   investment: 1440,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e15", date: d(2),  asset: "Meta Platforms Inc.",     ticker: "META-USD",  quantity: 4,   investment: 2040,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e16", date: d(1),  asset: "NVIDIA Corporation",      ticker: "NVDA-USD",  quantity: 3,   investment: 2550,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
    ],
    // Crypto: moderate positions — ~£45k total value
    cryptoTransactions: [
        { id: "c1",  date: d(34), asset: "Bitcoin",  ticker: "BTC", quantity: 0.30,  investment: -8250,  currency: "USD", broker: "Kraken",   type: "Buy" },
        { id: "c2",  date: d(28), asset: "Ethereum", ticker: "ETH", quantity: 3.00,  investment: -5400,  currency: "USD", broker: "Coinbase", type: "Buy" },
        { id: "c3",  date: d(22), asset: "Solana",   ticker: "SOL", quantity: 50,    investment: -1500,  currency: "USD", broker: "Kraken",   type: "Buy" },
        { id: "c4",  date: d(18), asset: "Bitcoin",  ticker: "BTC", quantity: 0.15,  investment: -6300,  currency: "USD", broker: "Kraken",   type: "Buy" },
        // Rebalance: sell some ETH, buy more BTC during dip
        { id: "c5",  date: d(14), asset: "Ethereum", ticker: "ETH", quantity: -1.00, investment: 2700,   currency: "USD", broker: "Coinbase", type: "Sell" },
        { id: "c6",  date: d(14), asset: "Bitcoin",  ticker: "BTC", quantity: 0.08,  investment: -3440,  currency: "USD", broker: "Kraken",   type: "Buy" },
        { id: "c7",  date: d(10), asset: "Ethereum", ticker: "ETH", quantity: 2.00,  investment: -5600,  currency: "USD", broker: "Coinbase", type: "Buy" },
        { id: "c8",  date: d(6),  asset: "Solana",   ticker: "SOL", quantity: 30,    investment: -3300,  currency: "USD", broker: "Kraken",   type: "Buy" },
        { id: "c9",  date: d(3),  asset: "Bitcoin",  ticker: "BTC", quantity: 0.06,  investment: -3700,  currency: "USD", broker: "Kraken",   type: "Buy" },
        { id: "c10", date: d(1),  asset: "Ethereum", ticker: "ETH", quantity: 1.00,  investment: -3450,  currency: "USD", broker: "Coinbase", type: "Buy" },
    ],
    realEstate: {
        properties: [
            {
                id: "re1",
                name: "123 Funk Avenue, London",
                purchaseDate: d(36),
                investment: 280000,
                currency: "GBP",
                currentValue: 310000,
                valuationDate: d(1),
                status: "Owned"
            },
            {
                id: "re2",
                name: "45 Groove Lane, Manchester",
                purchaseDate: d(18),
                investment: 150000,
                currency: "GBP",
                currentValue: 165000,
                valuationDate: d(1),
                status: "Owned"
            }
        ],
        funds: {},
        airbnb: null,
        inkCourt: null
    },
    fixedIncomeTransactions: [
        { id: "fi1",  date: d(36), investment: 8000,   interest: 0,    currency: "GBP", type: "Deposit",  account: "Marcus Savings",    description: "Initial Deposit" },
        { id: "fi2",  date: d(30), investment: 4000,   interest: 0,    currency: "GBP", type: "Deposit",  account: "Treasury Bonds",    description: "Bond Purchase" },
        { id: "fi3",  date: d(24), investment: 5000,   interest: 0,    currency: "GBP", type: "Deposit",  account: "Marcus Savings",    description: "Top-up" },
        { id: "fi4",  date: d(18), investment: 0,      interest: 280,  currency: "GBP", type: "Interest", account: "Marcus Savings",    description: "Interest (18m)" },
        { id: "fi5",  date: d(12), investment: 3000,   interest: 0,    currency: "GBP", type: "Deposit",  account: "NS&I Premium Bonds",description: "New bonds" },
        { id: "fi6",  date: d(12), investment: 0,      interest: 170,  currency: "GBP", type: "Interest", account: "Treasury Bonds",    description: "Coupon" },
        { id: "fi7",  date: d(6),  investment: 2000,   interest: 0,    currency: "GBP", type: "Deposit",  account: "Marcus Savings",    description: "Top-up" },
        { id: "fi8",  date: d(6),  investment: 0,      interest: 340,  currency: "GBP", type: "Interest", account: "Marcus Savings",    description: "Interest (6m)" },
        { id: "fi9",  date: d(3),  investment: 0,      interest: 90,   currency: "GBP", type: "Interest", account: "Treasury Bonds",    description: "Coupon" },
        { id: "fi10", date: d(1),  investment: 0,      interest: 180,  currency: "GBP", type: "Interest", account: "Marcus Savings",    description: "Interest (1m)" },
    ],
    pensionTransactions: [
        { id: "p1", date: d(36), type: "Buy", value: 4000,  quantity: 26,  asset: "Fidelity UK Index",            currency: "GBP", broker: "Fidelity" },
        { id: "p2", date: d(30), type: "Buy", value: 2000,  quantity: 12,  asset: "Fidelity UK Index",            currency: "GBP", broker: "Fidelity" },
        { id: "p3", date: d(24), type: "Buy", value: 3000,  quantity: 18,  asset: "Vanguard Target Retirement",   currency: "GBP", broker: "Vanguard" },
        { id: "p4", date: d(18), type: "Buy", value: 2000,  quantity: 12,  asset: "Fidelity UK Index",            currency: "GBP", broker: "Fidelity" },
        { id: "p5", date: d(12), type: "Buy", value: 3000,  quantity: 17,  asset: "Vanguard Target Retirement",   currency: "GBP", broker: "Vanguard" },
        { id: "p6", date: d(6),  type: "Buy", value: 2000,  quantity: 10,  asset: "Fidelity UK Index",            currency: "GBP", broker: "Fidelity" },
        { id: "p7", date: d(1),  type: "Buy", value: 1500,  quantity: 8,   asset: "Vanguard Target Retirement",   currency: "GBP", broker: "Vanguard" },
    ],
    // Debt: scaled to match reduced property values
    debtTransactions: (() => {
        const brlRate = 7.10;
        const txns = [
            // Mortgage on first property (65% LTV on £280k = £182k)
            { id: "d1", date: d(36), lender: "HSBC Mortgage", value_brl: 182000 * brlRate, obs: "Mortgage – 123 Funk Avenue" },
            // Second property mortgage (60% LTV on £150k = £90k)
            { id: "d2", date: d(18), lender: "Nationwide Mortgage", value_brl: 90000 * brlRate, obs: "Mortgage – 45 Groove Lane" },
        ];
        // HSBC monthly repayments for 36 months (£1,200/mo)
        for (let i = 36; i >= 1; i--) {
            txns.push({ id: `d-hsbc-${i}`, date: d(i), lender: "HSBC Mortgage", value_brl: -1200 * brlRate, obs: "Monthly Payment" });
        }
        // Nationwide monthly repayments for 18 months (£650/mo)
        for (let i = 18; i >= 1; i--) {
            txns.push({ id: `d-nw-${i}`, date: d(i), lender: "Nationwide Mortgage", value_brl: -650 * brlRate, obs: "Monthly Payment" });
        }
        return txns;
    })(),
    transactions: [
        { id: "t1", date: d(36), amount: -15000, currency: "GBP", description: "Investment Funding",  type: "Transfer", category: "Investments" },
        { id: "t2", date: d(30), amount: -12000, currency: "GBP", description: "Investment Funding",  type: "Transfer", category: "Investments" },
        { id: "t3", date: d(24), amount: -10000, currency: "GBP", description: "Investment Funding",  type: "Transfer", category: "Investments" },
        { id: "t4", date: d(18), amount: -8000,  currency: "GBP", description: "Investment Funding",  type: "Transfer", category: "Investments" },
        { id: "t5", date: d(12), amount: -7000,  currency: "GBP", description: "Investment Funding",  type: "Transfer", category: "Investments" },
        { id: "t6", date: d(6),  amount: -6000,  currency: "GBP", description: "Investment Funding",  type: "Transfer", category: "Investments" },
        { id: "t7", date: d(1),  amount: -5000,  currency: "GBP", description: "Investment Funding",  type: "Transfer", category: "Investments" },
    ],

    // ─── GENERATE 36-MONTH HISTORICAL SNAPSHOTS ───
    // Each asset class has INDEPENDENT growth dynamics with dramatic peaks/troughs.
    // More balanced proportions so each asset is visible in stacked charts.
    // Designed so final net worth ≈ R$3.5M.
    get historicalSnapshots() {
        const snapshots = [];
        const fxHist = generateFxHistory();

        // Starting values (GBP) at month -36
        // Calibrated so 36 months of growth + contributions land near live transaction values:
        // Live targets: Equity ~£39k, FI ~£23k, RE ~£475k, Crypto ~£52k, Pensions ~£25k, Debt ~£217k
        // These starting values account for purchases/growth over the 3-year period.
        let equity    = 12000;    // starts small, grows via purchases + market appreciation → ~£39k
        let fixedInc  = 10000;    // steady deposits + interest → ~£23k
        let realEst   = 280000;   // first property purchased at start → £280k + £150k at month 18
        let crypto    = 15000;    // starts modest, volatile growth → ~£52k
        let pensions  = 8000;     // steady contributions → ~£25k
        let debt      = 182000;   // first mortgage (matches HSBC mortgage transaction)

        for (let i = 36; i >= 0; i--) {
            const month = m(i);
            const fxBrl = fxHist[month]?.BRL || 7.0;
            const seed = (36 - i);

            // ══════ EQUITY: big correction months 26-23, strong rally 15-12, flat end ══════
            let eqGrowth;
            if (i >= 23 && i <= 26) {
                eqGrowth = -0.05 + Math.sin(seed * 1.7) * 0.01;   // sharp -5% correction
            } else if (i >= 12 && i <= 15) {
                eqGrowth = 0.04 + Math.sin(seed * 0.6) * 0.008;   // strong +4% rally
            } else if (i >= 2 && i <= 5) {
                eqGrowth = 0.001 + Math.sin(seed * 0.4) * 0.005;  // flat/choppy
            } else {
                eqGrowth = 0.012 + Math.sin(seed * 1.1) * 0.006;  // steady ~1.2%
            }
            equity = equity * (1 + eqGrowth);
            equity += (seed % 8 === 0 ? 1200 : 300);

            // ══════ FIXED INCOME: rate hike dip months 30-27, rate cut boost 10-7 ══════
            let fiGrowth;
            if (i >= 27 && i <= 30) {
                fiGrowth = -0.005 + Math.sin(seed * 2.3) * 0.003; // rate hike dip
            } else if (i >= 7 && i <= 10) {
                fiGrowth = 0.008 + Math.sin(seed * 0.9) * 0.002;  // rate cut boost
            } else {
                fiGrowth = 0.003 + Math.sin(seed * 0.7) * 0.002;  // steady
            }
            fixedInc = fixedInc * (1 + fiGrowth) + (i % 6 === 0 ? 800 : 40);

            // ══════ REAL ESTATE: flat/dip months 20-16, bounce months 8-5 ══════
            let reGrowth;
            if (i >= 16 && i <= 20) {
                reGrowth = -0.003 + Math.sin(seed * 0.3) * 0.003; // housing cooldown
            } else if (i >= 5 && i <= 8) {
                reGrowth = 0.008 + Math.sin(seed * 0.5) * 0.002;  // recovery bounce
            } else {
                reGrowth = 0.003 + Math.sin(seed * 0.2) * 0.002;  // steady ~3-4%
            }
            realEst = realEst * (1 + reGrowth);
            if (i === 18) realEst += 150000;                        // second property (matches txn)

            // ══════ CRYPTO: massive swings — totally independent from equity ══════
            // Bull run months 34-28, mega crash 21-17, recovery 13-9, final pump 4-0
            let crGrowth;
            if (i >= 28 && i <= 34) {
                crGrowth = 0.08 + Math.sin(seed * 2.1) * 0.02;    // parabolic bull +8%/mo
            } else if (i >= 17 && i <= 21) {
                crGrowth = -0.12 + Math.sin(seed * 1.8) * 0.015;  // devastating crash -12%/mo
            } else if (i >= 9 && i <= 13) {
                crGrowth = 0.04 + Math.sin(seed * 1.4) * 0.01;    // recovery +4%
            } else if (i <= 4) {
                crGrowth = 0.06 + Math.sin(seed * 1.6) * 0.015;   // final pump
            } else {
                crGrowth = 0.005 + Math.sin(seed * 1.3) * 0.015;  // choppy sideways
            }
            crypto = Math.max(5000, crypto * (1 + crGrowth));      // floor at £5k
            if (i % 5 === 0) crypto += 1500;

            // ══════ PENSIONS: steady but dip months 6-3 (fund restructuring) ══════
            let penGrowth;
            if (i >= 3 && i <= 6) {
                penGrowth = -0.008 + Math.sin(seed * 0.5) * 0.004; // restructuring dip
            } else if (i >= 20 && i <= 24) {
                penGrowth = 0.008 + Math.sin(seed * 0.35) * 0.003; // good period
            } else {
                penGrowth = 0.004 + Math.sin(seed * 0.35) * 0.003; // steady ~5%
            }
            pensions = pensions * (1 + penGrowth) + (i % 6 === 0 ? 1000 : 200);

            // ══════ DEBT: decreasing through repayments ══════
            debt = Math.max(0, debt - 1200);                        // HSBC £1,200/mo
            if (i === 18) debt += 90000;                            // Nationwide mortgage (matches txn)
            if (i <= 18) debt = Math.max(0, debt - 650);            // Nationwide £650/mo

            // ── Convert to BRL for snapshots ──
            const eqBrl = Math.round(equity * fxBrl);
            const fiBrl = Math.round(fixedInc * fxBrl);
            const reBrl = Math.round(realEst * fxBrl);
            const crBrl = Math.round(crypto * fxBrl);
            const psBrl = Math.round(pensions * fxBrl);
            const dbBrl = Math.round(debt * fxBrl);

            const totalGbp = equity + fixedInc + realEst + crypto + pensions - debt;
            const totalBrl = Math.round(totalGbp * fxBrl);

            snapshots.push({
                month,
                networthBRL: totalBrl,
                networthGBP: Math.round(totalGbp),
                networthPrimary: totalBrl,
                networthSecondary: Math.round(totalGbp),
                impliedRate: fxBrl,
                breakdown: {
                    equityBRL: eqBrl,
                    fixedIncomeBRL: fiBrl,
                    realEstateBRL: reBrl,
                    cryptoBRL: crBrl,
                    pensionBRL: psBrl,
                    debtBRL: -dbBrl
                },
                categories: {
                    Equity: eqBrl,
                    FixedIncome: fiBrl,
                    RealEstate: reBrl,
                    Crypto: crBrl,
                    Pensions: psBrl,
                    Debt: dbBrl
                },
                flows: {
                    inflowsBRL: Math.round((1800 + seed * 25) * fxBrl),
                    outflowsBRL: Math.round(1200 * fxBrl),
                    netFlowBRL: Math.round((600 + seed * 25) * fxBrl)
                }
            });
        }

        // ── PER-CATEGORY CALIBRATION ──
        // Calculate the LIVE values from actual transactions + market prices,
        // then smoothly scale each category over the last 6 months so the
        // final snapshot matches live values. This eliminates MoM discrepancy.
        const brlRate = 7.10;
        const usdToGbp = 1 / 1.28;

        // Live Equity (GBP) — sum of (quantity × marketPrice) for each holding, USD→GBP
        const equityHoldings = {
            'AAPL-USD':  { qty: 20 - 5 + 10 + 8, price: 185.50 },  // 33
            'MSFT-USD':  { qty: 10 + 5,           price: 420.10 },  // 15
            'GOOGL-USD': { qty: 40 - 10,          price: 165.20 },  // 30
            'AMZN-USD':  { qty: 15,               price: 178.30 },  // 15
            'NVDA-USD':  { qty: 12 + 4 + 5 + 3,   price: 880.00 },  // 24
            'TSLA-USD':  { qty: 10,               price: 245.00 },  // 10
            'META-USD':  { qty: 8 + 4,            price: 510.00 },  // 12
        };
        let liveEquityGbp = 0;
        for (const [, h] of Object.entries(equityHoldings)) {
            liveEquityGbp += h.qty * h.price * usdToGbp;
        }

        // Live Crypto (GBP) — same pattern
        const cryptoHoldings = {
            BTC: { qty: 0.30 + 0.15 + 0.08 + 0.06, price: 65400.00 },  // 0.59
            ETH: { qty: 3.00 - 1.00 + 2.00 + 1.00,  price: 3450.00 },   // 5.00
            SOL: { qty: 50 + 30,                      price: 142.00 },    // 80
        };
        let liveCryptoGbp = 0;
        for (const [, h] of Object.entries(cryptoHoldings)) {
            liveCryptoGbp += h.qty * h.price * usdToGbp;
        }

        // Live Real Estate (GBP) — sum of currentValue from properties
        const liveRealEstateGbp = 310000 + 165000; // £475k

        // Live Fixed Income (GBP) — sum of all deposits + interest
        const liveFixedIncomeGbp = (8000 + 5000 + 2000 + 280 + 340 + 180) // Marcus
            + (4000 + 170 + 90)   // Treasury Bonds
            + 3000;               // NS&I

        // Live Pensions (GBP) — units × fund price
        const livePensionsGbp = (26 + 12 + 12 + 10) * 312.50  // Fidelity: 60 units
            + (18 + 17 + 8) * 154.20; // Vanguard: 43 units

        // Live Debt (BRL→GBP) — sum of all debt txns then convert
        const liveDebtBrl = (182000 * brlRate) - (36 * 1200 * brlRate)  // HSBC
            + (90000 * brlRate) - (18 * 650 * brlRate);                  // Nationwide
        const liveDebtGbp = liveDebtBrl / brlRate;

        // Target BRL values for calibration
        const targetCats = {
            Equity:      Math.round(liveEquityGbp * brlRate),
            FixedIncome: Math.round(liveFixedIncomeGbp * brlRate),
            RealEstate:  Math.round(liveRealEstateGbp * brlRate),
            Crypto:      Math.round(liveCryptoGbp * brlRate),
            Pensions:    Math.round(livePensionsGbp * brlRate),
            Debt:        Math.round(liveDebtGbp * brlRate),
        };

        // Smooth each category over the last 8 snapshots so it converges on the live value
        const lastIdx = snapshots.length - 1;
        const scaleWindow = Math.min(8, lastIdx);
        const catKeys = Object.keys(targetCats);

        for (let j = 0; j < scaleWindow; j++) {
            const idx = lastIdx - j;
            const linear = (scaleWindow - j) / scaleWindow; // 1.0 at final → 0.125 at oldest
            // Squared curve: recent months are very close to live values, older ones less affected
            // j=0: 1.0, j=1: 0.766, j=2: 0.563, j=3: 0.391, j=4: 0.25, etc.
            const t = linear * linear;
            const s = snapshots[idx];

            catKeys.forEach(k => {
                const raw = s.categories[k] || 0;
                const target = targetCats[k];
                if (raw > 0 && target > 0) {
                    const factor = 1 + t * ((target / raw) - 1);
                    s.categories[k] = Math.round(s.categories[k] * factor);
                }
            });

            // Recompute breakdown from categories
            s.breakdown = {
                equityBRL:      s.categories.Equity,
                fixedIncomeBRL: s.categories.FixedIncome,
                realEstateBRL:  s.categories.RealEstate,
                cryptoBRL:      s.categories.Crypto,
                pensionBRL:     s.categories.Pensions,
                debtBRL:       -s.categories.Debt,
            };

            // Recompute net worth
            s.networthBRL = s.categories.Equity + s.categories.FixedIncome
                + s.categories.RealEstate + s.categories.Crypto
                + s.categories.Pensions - s.categories.Debt;
            s.networthGBP = Math.round(s.networthBRL / (s.impliedRate || brlRate));
            s.networthPrimary = s.networthBRL;
            s.networthSecondary = s.networthGBP;
        }

        return snapshots;
    }
};
