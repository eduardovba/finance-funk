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
        annualInterestRate: 10,
        monthlyContribution: 21000,
        timeHorizon: 15,
        targetNetWorth: 20000000,
        startingAmount: null,
        anchorMode: 'historical',
        yearlyGoals: { 2031: 20000000 }
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
        "Equity":       { target: 12, color: "#10b981", active: true },
        "Fixed Income": { target: 5,  color: "#0ea5e9", active: true },
        "Real Estate":  { target: 65, color: "#f59e0b", active: true },
        "Crypto":       { target: 8,  color: "#8b5cf6", active: true },
        "Pensions":     { target: 5,  color: "#ec4899", active: true },
        "Debt":         { target: 0,  color: "#ef4444", active: true }
    },
    allocationTargets: { "Equity": 12, "Fixed Income": 5, "Real Estate": 65, "Crypto": 8, "Pensions": 5 },
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
    // Scaled ~3.5× for £1.8M net-worth target
    get ledgerData() {
        const investments = [];
        for (let i = 36; i >= 1; i--) {
            const seed = i * 7;
            const isRebalanceMonth = i % 6 === 0;
            const baseFlow = 6300 + (36 - i) * 90;
            const variation = Math.round(sineRand(seed) * 2800 - 700);
            const rebalanceBonus = isRebalanceMonth ? 4200 : 0;
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
    // Equity: ~£200k total value (4× scale)
    equityTransactions: [
        { id: "e1",  date: d(35), asset: "Apple Inc.",              ticker: "AAPL-USD",  quantity: 80,  investment: 11200,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e2",  date: d(32), asset: "Microsoft Corporation",   ticker: "MSFT-USD",  quantity: 40,  investment: 12800,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e3",  date: d(28), asset: "NVIDIA Corporation",      ticker: "NVDA-USD",  quantity: 48,  investment: 14400,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e4",  date: d(24), asset: "Alphabet Inc.",           ticker: "GOOGL-USD", quantity: 160, investment: 19200,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        // Rebalance: sell some AAPL, buy more NVDA
        { id: "e5",  date: d(21), asset: "Apple Inc.",              ticker: "AAPL-USD",  quantity: -20, investment: -3200,  broker: "Interactive Brokers", currency: "USD", type: "Sell" },
        { id: "e6",  date: d(21), asset: "NVIDIA Corporation",      ticker: "NVDA-USD",  quantity: 16,  investment: 8000,   broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e7",  date: d(18), asset: "Amazon.com Inc.",         ticker: "AMZN-USD",  quantity: 60,  investment: 7800,   broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e8",  date: d(15), asset: "Tesla Inc.",              ticker: "TSLA-USD",  quantity: 40,  investment: 8800,   broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e9",  date: d(12), asset: "Meta Platforms Inc.",     ticker: "META-USD",  quantity: 32,  investment: 12160,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        // Rebalance: trim Alphabet, add more MSFT
        { id: "e10", date: d(10), asset: "Alphabet Inc.",           ticker: "GOOGL-USD", quantity: -40, investment: -6000,  broker: "Interactive Brokers", currency: "USD", type: "Sell" },
        { id: "e11", date: d(10), asset: "Microsoft Corporation",   ticker: "MSFT-USD",  quantity: 20,  investment: 8000,   broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e12", date: d(8),  asset: "Apple Inc.",              ticker: "AAPL-USD",  quantity: 40,  investment: 6720,   broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e13", date: d(6),  asset: "NVIDIA Corporation",      ticker: "NVDA-USD",  quantity: 20,  investment: 15000,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e14", date: d(3),  asset: "Apple Inc.",              ticker: "AAPL-USD",  quantity: 32,  investment: 5760,   broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e15", date: d(2),  asset: "Meta Platforms Inc.",     ticker: "META-USD",  quantity: 16,  investment: 8160,   broker: "Interactive Brokers", currency: "USD", type: "Buy" },
        { id: "e16", date: d(1),  asset: "NVIDIA Corporation",      ticker: "NVDA-USD",  quantity: 12,  investment: 10200,  broker: "Interactive Brokers", currency: "USD", type: "Buy" },
    ],
    // Crypto: ~£180k total value (3.5× scale)
    cryptoTransactions: [
        { id: "c1",  date: d(34), asset: "Bitcoin",  ticker: "BTC", quantity: 1.05,  investment: -28875,  currency: "USD", broker: "Kraken",   type: "Buy" },
        { id: "c2",  date: d(28), asset: "Ethereum", ticker: "ETH", quantity: 10.50, investment: -18900,  currency: "USD", broker: "Coinbase", type: "Buy" },
        { id: "c3",  date: d(22), asset: "Solana",   ticker: "SOL", quantity: 175,   investment: -5250,   currency: "USD", broker: "Kraken",   type: "Buy" },
        { id: "c4",  date: d(18), asset: "Bitcoin",  ticker: "BTC", quantity: 0.53,  investment: -22050,  currency: "USD", broker: "Kraken",   type: "Buy" },
        // Rebalance: sell some ETH, buy more BTC during dip
        { id: "c5",  date: d(14), asset: "Ethereum", ticker: "ETH", quantity: -3.50, investment: 9450,    currency: "USD", broker: "Coinbase", type: "Sell" },
        { id: "c6",  date: d(14), asset: "Bitcoin",  ticker: "BTC", quantity: 0.28,  investment: -12040,  currency: "USD", broker: "Kraken",   type: "Buy" },
        { id: "c7",  date: d(10), asset: "Ethereum", ticker: "ETH", quantity: 7.00,  investment: -19600,  currency: "USD", broker: "Coinbase", type: "Buy" },
        { id: "c8",  date: d(6),  asset: "Solana",   ticker: "SOL", quantity: 105,   investment: -11550,  currency: "USD", broker: "Kraken",   type: "Buy" },
        { id: "c9",  date: d(3),  asset: "Bitcoin",  ticker: "BTC", quantity: 0.21,  investment: -12950,  currency: "USD", broker: "Kraken",   type: "Buy" },
        { id: "c10", date: d(1),  asset: "Ethereum", ticker: "ETH", quantity: 3.50,  investment: -12075,  currency: "USD", broker: "Coinbase", type: "Buy" },
    ],
    realEstate: {
        properties: [
            {
                id: "re1",
                name: "123 Funk Avenue, London",
                purchaseDate: d(36),
                investment: 850000,
                currency: "GBP",
                currentValue: 950000,
                valuationDate: d(1),
                status: "Owned"
            },
            {
                id: "re2",
                name: "45 Groove Lane, Manchester",
                purchaseDate: d(18),
                investment: 450000,
                currency: "GBP",
                currentValue: 495000,
                valuationDate: d(1),
                status: "Owned"
            }
        ],
        funds: {},
        airbnb: null,
        inkCourt: null
    },
    fixedIncomeTransactions: [
        { id: "fi1",  date: d(36), investment: 28000,  interest: 0,     currency: "GBP", type: "Deposit",  account: "Marcus Savings",    description: "Initial Deposit" },
        { id: "fi2",  date: d(30), investment: 14000,  interest: 0,     currency: "GBP", type: "Deposit",  account: "Treasury Bonds",    description: "Bond Purchase" },
        { id: "fi3",  date: d(24), investment: 17500,  interest: 0,     currency: "GBP", type: "Deposit",  account: "Marcus Savings",    description: "Top-up" },
        { id: "fi4",  date: d(18), investment: 0,      interest: 980,   currency: "GBP", type: "Interest", account: "Marcus Savings",    description: "Interest (18m)" },
        { id: "fi5",  date: d(12), investment: 10500,  interest: 0,     currency: "GBP", type: "Deposit",  account: "NS&I Premium Bonds",description: "New bonds" },
        { id: "fi6",  date: d(12), investment: 0,      interest: 595,   currency: "GBP", type: "Interest", account: "Treasury Bonds",    description: "Coupon" },
        { id: "fi7",  date: d(6),  investment: 7000,   interest: 0,     currency: "GBP", type: "Deposit",  account: "Marcus Savings",    description: "Top-up" },
        { id: "fi8",  date: d(6),  investment: 0,      interest: 1190,  currency: "GBP", type: "Interest", account: "Marcus Savings",    description: "Interest (6m)" },
        { id: "fi9",  date: d(3),  investment: 0,      interest: 315,   currency: "GBP", type: "Interest", account: "Treasury Bonds",    description: "Coupon" },
        { id: "fi10", date: d(1),  investment: 0,      interest: 630,   currency: "GBP", type: "Interest", account: "Marcus Savings",    description: "Interest (1m)" },
    ],
    pensionTransactions: [
        { id: "p1", date: d(36), type: "Buy", value: 14000, quantity: 91,  asset: "Fidelity UK Index",            currency: "GBP", broker: "Fidelity" },
        { id: "p2", date: d(30), type: "Buy", value: 7000,  quantity: 42,  asset: "Fidelity UK Index",            currency: "GBP", broker: "Fidelity" },
        { id: "p3", date: d(24), type: "Buy", value: 10500, quantity: 63,  asset: "Vanguard Target Retirement",   currency: "GBP", broker: "Vanguard" },
        { id: "p4", date: d(18), type: "Buy", value: 7000,  quantity: 42,  asset: "Fidelity UK Index",            currency: "GBP", broker: "Fidelity" },
        { id: "p5", date: d(12), type: "Buy", value: 10500, quantity: 60,  asset: "Vanguard Target Retirement",   currency: "GBP", broker: "Vanguard" },
        { id: "p6", date: d(6),  type: "Buy", value: 7000,  quantity: 35,  asset: "Fidelity UK Index",            currency: "GBP", broker: "Fidelity" },
        { id: "p7", date: d(1),  type: "Buy", value: 5250,  quantity: 28,  asset: "Vanguard Target Retirement",   currency: "GBP", broker: "Vanguard" },
    ],
    // Debt: scaled to match property values (65% LTV on £850k, 60% LTV on £450k)
    debtTransactions: (() => {
        const brlRate = 7.10;
        const txns = [
            // Mortgage on first property (65% LTV on £850k = £552.5k)
            { id: "d1", date: d(36), lender: "HSBC Mortgage", value_brl: 552500 * brlRate, obs: "Mortgage – 123 Funk Avenue" },
            // Second property mortgage (60% LTV on £450k = £270k)
            { id: "d2", date: d(18), lender: "Nationwide Mortgage", value_brl: 270000 * brlRate, obs: "Mortgage – 45 Groove Lane" },
        ];
        // HSBC monthly repayments for 36 months (£3,600/mo)
        for (let i = 36; i >= 1; i--) {
            txns.push({ id: `d-hsbc-${i}`, date: d(i), lender: "HSBC Mortgage", value_brl: -3600 * brlRate, obs: "Monthly Payment" });
        }
        // Nationwide monthly repayments for 18 months (£1,950/mo)
        for (let i = 18; i >= 1; i--) {
            txns.push({ id: `d-nw-${i}`, date: d(i), lender: "Nationwide Mortgage", value_brl: -1950 * brlRate, obs: "Monthly Payment" });
        }
        return txns;
    })(),
    // ─── BUDGET DEMO DATA ───
    budgetCategories: [
        { id: 1, user_id: 0, name: 'Housing', icon: '🏠', color: '#D4AF37', monthly_target_cents: 250000, parent_id: null, sort_order: 0, is_income: 0 },
        { id: 2, user_id: 0, name: 'Food & Dining', icon: '🍕', color: '#CC5500', monthly_target_cents: 120000, parent_id: null, sort_order: 1, is_income: 0 },
        { id: 3, user_id: 0, name: 'Transport', icon: '🚗', color: '#A78BFA', monthly_target_cents: 60000, parent_id: null, sort_order: 2, is_income: 0 },
        { id: 4, user_id: 0, name: 'Entertainment', icon: '🎬', color: '#34D399', monthly_target_cents: 40000, parent_id: null, sort_order: 3, is_income: 0 },
        { id: 5, user_id: 0, name: 'Shopping', icon: '🛍️', color: '#F472B6', monthly_target_cents: 50000, parent_id: null, sort_order: 4, is_income: 0 },
        { id: 6, user_id: 0, name: 'Health & Fitness', icon: '💪', color: '#60A5FA', monthly_target_cents: 30000, parent_id: null, sort_order: 5, is_income: 0 },
        { id: 7, user_id: 0, name: 'Subscriptions', icon: '📱', color: '#FBBF24', monthly_target_cents: 25000, parent_id: null, sort_order: 6, is_income: 0 },
        { id: 8, user_id: 0, name: 'Utilities', icon: '⚡', color: '#F97316', monthly_target_cents: 35000, parent_id: null, sort_order: 7, is_income: 0 },
        { id: 9, user_id: 0, name: 'Education', icon: '📚', color: '#818CF8', monthly_target_cents: 20000, parent_id: null, sort_order: 8, is_income: 0 },
        { id: 10, user_id: 0, name: 'Travel', icon: '✈️', color: '#2DD4BF', monthly_target_cents: 45000, parent_id: null, sort_order: 9, is_income: 0 },
        { id: 11, user_id: 0, name: 'Salary', icon: '💰', color: '#D4AF37', monthly_target_cents: 0, parent_id: null, sort_order: 0, is_income: 1 },
        { id: 12, user_id: 0, name: 'Freelance', icon: '💻', color: '#34D399', monthly_target_cents: 0, parent_id: null, sort_order: 1, is_income: 1 },
    ],

    budgetTransactions: (() => {
        const txns = [];
        let id = 1;
        const now = new Date();

        const patterns = [
            { catId: 1, avg: 250000, freq: 1, variance: 0 },
            { catId: 2, avg: 5500, freq: 25, variance: 2000 },
            { catId: 3, avg: 6500, freq: 8, variance: 3000 },
            { catId: 4, avg: 5000, freq: 5, variance: 3000 },
            { catId: 5, avg: 10000, freq: 4, variance: 5000 },
            { catId: 6, avg: 7000, freq: 3, variance: 2000 },
            { catId: 7, avg: 1500, freq: 6, variance: 500 },
            { catId: 8, avg: 14000, freq: 2, variance: 4000 },
            { catId: 9, avg: 8000, freq: 2, variance: 2000 },
            { catId: 10, avg: 20000, freq: 1, variance: 10000 },
        ];

        const descriptions = {
            1: ['Monthly Rent'],
            2: ['Supermarket', 'Restaurant', 'Coffee Shop', 'Bakery', 'Takeaway', 'Food Delivery', 'Lunch'],
            3: ['Uber', 'Fuel', 'Parking', 'Bus Pass', 'Train Ticket'],
            4: ['Cinema', 'Concert Tickets', 'Streaming', 'Games', 'Bar'],
            5: ['Amazon', 'Clothing Store', 'Electronics', 'Home Decor'],
            6: ['Gym Membership', 'Pharmacy', 'Doctor Visit'],
            7: ['Netflix', 'Spotify', 'iCloud', 'Adobe CC', 'Phone Plan', 'Internet'],
            8: ['Electricity', 'Water Bill', 'Gas Bill'],
            9: ['Online Course', 'Books'],
            10: ['Weekend Trip', 'Flight Booking', 'Hotel'],
        };

        for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
            const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
            const mm = String(monthDate.getMonth() + 1).padStart(2, '0');
            const yyyy = monthDate.getFullYear();
            const calMonth = monthDate.getMonth(); // 0-11 for seasonal patterns

            // Income: Salary on the 25th (occasional bonus in Dec/Jun)
            const hasBonus = calMonth === 11 || calMonth === 5; // Dec, Jun
            txns.push({
                id: id++, user_id: 0, category_id: 11,
                amount_cents: hasBonus ? 1100000 : 850000,
                currency: 'BRL', description: hasBonus ? 'Salary + Bonus' : 'Monthly Salary',
                date: `${yyyy}-${mm}-25`, is_recurring: 1, source: 'Demo',
            });

            // Income: Freelance (skip some months)
            if (monthOffset % 3 !== 1) {
                const freelanceSeed = monthOffset * 31;
                txns.push({
                    id: id++, user_id: 0, category_id: 12,
                    amount_cents: 120000 + Math.abs(Math.round(Math.sin(freelanceSeed) * 80000)),
                    currency: 'BRL', description: 'Freelance Project',
                    date: `${yyyy}-${mm}-${String(10 + (monthOffset % 5) * 3).padStart(2, '0')}`,
                    is_recurring: 0, source: 'Demo',
                });
            }

            // Seasonal spending multiplier
            // Dec = holiday spike (1.3×), Jul/Aug = summer bump (1.15×), Jan = frugal (0.85×)
            let seasonalMult = 1.0;
            if (calMonth === 11) seasonalMult = 1.3;       // December
            else if (calMonth === 6 || calMonth === 7) seasonalMult = 1.15; // Jul/Aug
            else if (calMonth === 0) seasonalMult = 0.85;  // January

            // Expenses
            for (const pattern of patterns) {
                // Travel only some months
                if (pattern.catId === 10 && monthOffset % 2 === 1) continue;
                for (let i = 0; i < pattern.freq; i++) {
                    const day = Math.min(Math.floor((i + 1) * (daysInMonth / (pattern.freq + 1))), daysInMonth);
                    const seed = pattern.catId * 100 + monthOffset * 10 + i;
                    const varianceAmount = Math.floor((Math.sin(seed * 9301 + 49297) * 49297 % 1) * pattern.variance * 2 - pattern.variance);
                    const baseAmount = Math.max(100, pattern.avg + varianceAmount);
                    // Apply seasonal multiplier to non-fixed expenses
                    const amount = pattern.catId === 1 || pattern.catId === 7
                        ? baseAmount // rent & subscriptions are fixed
                        : Math.round(baseAmount * seasonalMult);
                    const descList = descriptions[pattern.catId] || ['Expense'];

                    txns.push({
                        id: id++, user_id: 0, category_id: pattern.catId,
                        amount_cents: amount, currency: 'BRL',
                        description: descList[seed % descList.length],
                        date: `${yyyy}-${mm}-${String(day).padStart(2, '0')}`,
                        is_recurring: (pattern.catId === 1 || pattern.catId === 7) ? 1 : 0,
                        source: 'Demo',
                    });
                }
            }
        }
        return txns.sort((a, b) => b.date.localeCompare(a.date));
    })(),

    budgetRollups: (() => {
        const now = new Date();
        return Array.from({ length: 12 }, (_, monthOffset) => {
            const dd = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
            const month = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}`;
            const calMonth = dd.getMonth(); // 0-11

            // Seasonal income variation
            const hasBonus = calMonth === 11 || calMonth === 5;
            const hasFreelance = monthOffset % 3 !== 1;
            const freelanceSeed = monthOffset * 31;
            const freelanceAmt = hasFreelance ? 120000 + Math.abs(Math.round(Math.sin(freelanceSeed) * 80000)) : 0;
            const income = (hasBonus ? 1100000 : 850000) + freelanceAmt;

            // Seasonal expense variation
            let seasonalMult = 1.0;
            if (calMonth === 11) seasonalMult = 1.3;
            else if (calMonth === 6 || calMonth === 7) seasonalMult = 1.15;
            else if (calMonth === 0) seasonalMult = 0.85;

            const baseCats = {
                1: 250000,
                2: Math.round((130000 + Math.round(Math.sin(monthOffset * 7) * 12000)) * seasonalMult),
                3: Math.round((48000 + Math.round(Math.sin(monthOffset * 5) * 5000)) * seasonalMult),
                4: Math.round((24000 + Math.round(Math.sin(monthOffset * 3) * 4000)) * seasonalMult),
                5: Math.round((38000 + Math.round(Math.sin(monthOffset * 9) * 6000)) * seasonalMult),
                6: Math.round(21000 * seasonalMult),
                7: 9000,
                8: Math.round((28000 + Math.round(Math.sin(monthOffset * 4) * 3000)) * seasonalMult),
                9: Math.round((14000 + Math.round(Math.sin(monthOffset * 6) * 3000)) * seasonalMult),
                10: monthOffset % 2 === 1 ? 0 : Math.round(20000 * seasonalMult),
            };

            const expense = Object.values(baseCats).reduce((s, v) => s + v, 0);

            return {
                id: monthOffset + 1,
                user_id: 0,
                month,
                total_income_cents: income,
                total_expenses_cents: expense,
                total_savings_cents: income - expense,
                savings_rate_basis_points: Math.round(((income - expense) / income) * 10000),
                category_totals: baseCats,
            };
        });
    })(),

    transactions: [
        { id: "t1", date: d(36), amount: -52500, currency: "GBP", description: "Investment Funding",  type: "Transfer", category: "Investments" },
        { id: "t2", date: d(30), amount: -42000, currency: "GBP", description: "Investment Funding",  type: "Transfer", category: "Investments" },
        { id: "t3", date: d(24), amount: -35000, currency: "GBP", description: "Investment Funding",  type: "Transfer", category: "Investments" },
        { id: "t4", date: d(18), amount: -28000, currency: "GBP", description: "Investment Funding",  type: "Transfer", category: "Investments" },
        { id: "t5", date: d(12), amount: -24500, currency: "GBP", description: "Investment Funding",  type: "Transfer", category: "Investments" },
        { id: "t6", date: d(6),  amount: -21000, currency: "GBP", description: "Investment Funding",  type: "Transfer", category: "Investments" },
        { id: "t7", date: d(1),  amount: -17500, currency: "GBP", description: "Investment Funding",  type: "Transfer", category: "Investments" },
    ],

    // ─── GENERATE 36-MONTH HISTORICAL SNAPSHOTS ───
    // Each asset class has INDEPENDENT growth dynamics with dramatic peaks/troughs.
    // Scaled so final net worth ≈ £1.8M GBP / R$12.8M.
    get historicalSnapshots() {
        const snapshots = [];
        const fxHist = generateFxHistory();

        // Starting values (GBP) at month -36
        // Calibrated so 36 months of growth + contributions land near live transaction values:
        // Live targets: Equity ~£200k, FI ~£80k, RE ~£1.45M, Crypto ~£180k, Pensions ~£85k, Debt ~£660k
        // These starting values account for purchases/growth over the 3-year period.
        let equity    = 42000;    // starts small, grows via purchases + market appreciation → ~£200k
        let fixedInc  = 35000;    // steady deposits + interest → ~£80k
        let realEst   = 850000;   // first property purchased at start → £850k + £450k at month 18
        let crypto    = 52500;    // starts modest, volatile growth → ~£180k
        let pensions  = 28000;    // steady contributions → ~£85k
        let debt      = 552500;   // first mortgage (matches HSBC mortgage transaction)

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
            equity += (seed % 8 === 0 ? 4200 : 1050);

            // ══════ FIXED INCOME: rate hike dip months 30-27, rate cut boost 10-7 ══════
            let fiGrowth;
            if (i >= 27 && i <= 30) {
                fiGrowth = -0.005 + Math.sin(seed * 2.3) * 0.003; // rate hike dip
            } else if (i >= 7 && i <= 10) {
                fiGrowth = 0.008 + Math.sin(seed * 0.9) * 0.002;  // rate cut boost
            } else {
                fiGrowth = 0.003 + Math.sin(seed * 0.7) * 0.002;  // steady
            }
            fixedInc = fixedInc * (1 + fiGrowth) + (i % 6 === 0 ? 2800 : 140);

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
            if (i === 18) realEst += 450000;                        // second property (matches txn)

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
            crypto = Math.max(17500, crypto * (1 + crGrowth));     // floor at £17.5k
            if (i % 5 === 0) crypto += 5250;

            // ══════ PENSIONS: steady but dip months 6-3 (fund restructuring) ══════
            let penGrowth;
            if (i >= 3 && i <= 6) {
                penGrowth = -0.008 + Math.sin(seed * 0.5) * 0.004; // restructuring dip
            } else if (i >= 20 && i <= 24) {
                penGrowth = 0.008 + Math.sin(seed * 0.35) * 0.003; // good period
            } else {
                penGrowth = 0.004 + Math.sin(seed * 0.35) * 0.003; // steady ~5%
            }
            pensions = pensions * (1 + penGrowth) + (i % 6 === 0 ? 3500 : 700);

            // ══════ DEBT: decreasing through repayments ══════
            debt = Math.max(0, debt - 3600);                        // HSBC £3,600/mo
            if (i === 18) debt += 270000;                           // Nationwide mortgage (matches txn)
            if (i <= 18) debt = Math.max(0, debt - 1950);           // Nationwide £1,950/mo

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
                    inflowsBRL: Math.round((6300 + seed * 90) * fxBrl),
                    outflowsBRL: Math.round(3600 * fxBrl),
                    netFlowBRL: Math.round((2700 + seed * 90) * fxBrl)
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
            'AAPL-USD':  { qty: 80 - 20 + 40 + 32, price: 185.50 },  // 132
            'MSFT-USD':  { qty: 40 + 20,            price: 420.10 },  // 60
            'GOOGL-USD': { qty: 160 - 40,           price: 165.20 },  // 120
            'AMZN-USD':  { qty: 60,                 price: 178.30 },  // 60
            'NVDA-USD':  { qty: 48 + 16 + 20 + 12,  price: 880.00 },  // 96
            'TSLA-USD':  { qty: 40,                 price: 245.00 },  // 40
            'META-USD':  { qty: 32 + 16,            price: 510.00 },  // 48
        };
        let liveEquityGbp = 0;
        for (const [, h] of Object.entries(equityHoldings)) {
            liveEquityGbp += h.qty * h.price * usdToGbp;
        }

        // Live Crypto (GBP) — same pattern
        const cryptoHoldings = {
            BTC: { qty: 1.05 + 0.53 + 0.28 + 0.21, price: 65400.00 },  // 2.07
            ETH: { qty: 10.50 - 3.50 + 7.00 + 3.50, price: 3450.00 },  // 17.50
            SOL: { qty: 175 + 105,                    price: 142.00 },   // 280
        };
        let liveCryptoGbp = 0;
        for (const [, h] of Object.entries(cryptoHoldings)) {
            liveCryptoGbp += h.qty * h.price * usdToGbp;
        }

        // Live Real Estate (GBP) — sum of currentValue from properties
        const liveRealEstateGbp = 950000 + 495000; // £1.445M

        // Live Fixed Income (GBP) — sum of all deposits + interest
        const liveFixedIncomeGbp = (28000 + 17500 + 7000 + 980 + 1190 + 630) // Marcus
            + (14000 + 595 + 315)   // Treasury Bonds
            + 10500;                // NS&I

        // Live Pensions (GBP) — units × fund price
        const livePensionsGbp = (91 + 42 + 42 + 35) * 312.50  // Fidelity: 210 units
            + (63 + 60 + 28) * 154.20; // Vanguard: 151 units

        // Live Debt (BRL→GBP) — sum of all debt txns then convert
        const liveDebtBrl = (552500 * brlRate) - (36 * 3600 * brlRate)  // HSBC
            + (270000 * brlRate) - (18 * 1950 * brlRate);                // Nationwide
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
