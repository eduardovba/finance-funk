export type OnboardingGoal = 'budget' | 'investments' | 'both';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface PersonalizationConfig {
    goal: OnboardingGoal;
    experience: ExperienceLevel;
}

// ═══════════ BEHAVIOR FLAGS ═══════════

export function getPersonalizationFlags(config: PersonalizationConfig) {
    const { goal, experience } = config;

    return {
        defaultLandingPage: goal === 'budget' ? '/budget' : '/dashboard',
        showBudgetModule: goal === 'budget' || goal === 'both',
        showPortfolioModule: goal === 'investments' || goal === 'both',
        showAdvancedFeatures: experience !== 'beginner',
        showRebalanceAdvisor: experience === 'advanced' && (goal === 'investments' || goal === 'both'),
        showFxAttribution: experience !== 'beginner' && (goal === 'investments' || goal === 'both'),
        showGrowthForecast: goal === 'investments' || goal === 'both',
        showPageTutorials: experience !== 'advanced',
        showTooltipsOnMetrics: experience === 'beginner',
        showFeatureExplanations: experience === 'beginner',
        tutorialStepCount: experience === 'beginner' ? 'full' as const : experience === 'intermediate' ? 'quick' as const : 'none' as const,
        checklistStyle: experience === 'advanced' ? 'compact' as const : 'detailed' as const,
        professorFVerbosity: experience === 'beginner' ? 'verbose' as const : experience === 'intermediate' ? 'normal' as const : 'minimal' as const,
        greetingDismissMs: experience === 'advanced' ? 3000 : experience === 'intermediate' ? 6000 : 8000,
    };
}

// ═══════════ COPY VARIANTS ═══════════

type CopyKey =
    | 'emptyBudgetDashboard'
    | 'emptyPortfolioDashboard'
    | 'emptyEquity'
    | 'emptyCrypto'
    | 'emptyFixedIncome'
    | 'emptyRealEstate'
    | 'emptyPensions'
    | 'emptyDebt'
    | 'emptyBudgetTransactions'
    | 'emptyBudgetCategories'
    | 'firstGroovePrompt'
    | 'checklistHeader'
    | 'importPrompt'
    | 'snapshotPrompt';

const COPY_VARIANTS: Record<CopyKey, Record<ExperienceLevel, string>> = {
    emptyBudgetDashboard: {
        beginner: "This is your spending command center! 🎸 Once you add expenses, you'll see beautiful charts showing where your money goes, your savings rate, and spending trends. Let's get started!",
        intermediate: "Your budget dashboard is empty. Import a bank statement or add transactions to see spending breakdowns, savings rate, and trends.",
        advanced: "No budget data. Import CSV or add transactions to populate.",
    },
    emptyPortfolioDashboard: {
        beginner: "Welcome to your portfolio tracker! 📈 This is where you'll see your total net worth, how your investments are performing, and beautiful charts showing your wealth growing over time.",
        intermediate: "Your portfolio is empty. Add holdings or import broker data to see net worth, asset allocation, and performance metrics.",
        advanced: "No portfolio data. Import or add holdings to populate NAV, allocation, and attribution views.",
    },
    emptyEquity: {
        beginner: "This is where your stocks and shares will live! 🏦 Add a stock you own — even just one — and you'll see its live market value and how it's performing.",
        intermediate: "No equity holdings yet. Add a position or import from your broker (Trading 212, XP, Interactive Brokers, and more).",
        advanced: "No equity data. Import broker CSV or add positions manually.",
    },
    emptyCrypto: {
        beginner: "Track your crypto here! 🪙 Add Bitcoin, Ethereum, or any token and see its value in real-time with live market prices.",
        intermediate: "No crypto holdings. Add positions or import transaction history to track your crypto portfolio.",
        advanced: "No crypto positions. Add or import to populate.",
    },
    emptyFixedIncome: {
        beginner: "Fixed income means things like savings bonds, treasury bills, and CDs — investments that pay you a fixed return. Add yours here!",
        intermediate: "No fixed income positions. Add bonds, treasury notes, or other fixed-rate instruments.",
        advanced: "No fixed income data. Add positions with coupon/maturity details.",
    },
    emptyRealEstate: {
        beginner: "Track your property investments here! 🏠 Whether it's your home, a rental, or a real estate fund — add it and see its value alongside your other assets.",
        intermediate: "No real estate holdings. Add properties or real estate fund positions to track their value.",
        advanced: "No real estate data. Add properties or fund positions.",
    },
    emptyPensions: {
        beginner: "Your retirement savings go here! 🏖️ Add your pension fund details and we'll track their growth over time — many funds have live price data.",
        intermediate: "No pension data. Add your pension fund holdings to track their performance.",
        advanced: "No pension positions. Add fund holdings for NAV tracking.",
    },
    emptyDebt: {
        beginner: "Track money you owe here — mortgages, loans, credit cards. Adding debt gives you a true picture of your net worth (assets minus what you owe).",
        intermediate: "No debt recorded. Add loans, mortgages, or credit card balances for accurate net worth calculation.",
        advanced: "No debt data. Add liabilities for net worth calculation.",
    },
    emptyBudgetTransactions: {
        beginner: "Your spending log will appear here! 🧾 Every expense you add or import shows up in this feed, automatically organized by date and category.",
        intermediate: "No transactions yet. Import a bank statement or add expenses manually.",
        advanced: "No transactions. Import or add manually.",
    },
    emptyBudgetCategories: {
        beginner: "Categories help organize your spending! 🏷️ We'll create some defaults for you, or you can customize them to match how you think about your money.",
        intermediate: "No custom categories. We'll set up smart defaults, or create your own.",
        advanced: "No categories configured. Seed defaults or create custom.",
    },
    firstGroovePrompt: {
        beginner: "Don't worry, this takes under 30 seconds! I'll walk you through every step.",
        intermediate: "Quick and easy — just the essentials.",
        advanced: "Fill in the fields and you're set.",
    },
    checklistHeader: {
        beginner: "Follow these steps to set up Finance Funk — I'll guide you through each one!",
        intermediate: "Complete these tasks to get the most out of Finance Funk.",
        advanced: "Setup tasks:",
    },
    importPrompt: {
        beginner: "Importing means uploading a file from your bank or broker — it's like copying all your transactions at once instead of typing them one by one!",
        intermediate: "Upload a CSV or statement file to bulk-import your data.",
        advanced: "Import CSV. Supported: Trading 212, XP, B3, IBKR, HL, Fidelity, Vanguard.",
    },
    snapshotPrompt: {
        beginner: "A monthly snapshot saves a picture of your finances right now — like taking a photo 📸 — so you can see how things change over time.",
        intermediate: "Record a monthly snapshot to track your net worth progression over time.",
        advanced: "Record snapshot for MoM/YoY tracking.",
    },
};

export function getPersonalizedCopy(key: CopyKey, experience: ExperienceLevel): string {
    return COPY_VARIANTS[key]?.[experience] || COPY_VARIANTS[key]?.intermediate || '';
}

// ═══════════ PROFESSOR F MESSAGES ═══════════

export function getProfessorFMessage(context: string, config: PersonalizationConfig): string {
    const { goal, experience } = config;

    const messages: Record<string, Record<string, string>> = {
        dashboardWelcome: {
            'budget-beginner': "Welcome to your money HQ! 🎸 Everything about your spending starts here.",
            'budget-intermediate': "Your budget dashboard is ready. Let's get some data in!",
            'budget-advanced': "Dashboard ready. Import data to populate.",
            'investments-beginner': "Welcome to your portfolio command center! 📈 This is where all your investments come together.",
            'investments-intermediate': "Your portfolio dashboard is ready. Add holdings or import to get started.",
            'investments-advanced': "Dashboard ready. Import or add positions.",
            'both-beginner': "Welcome to Finance Funk! 🎸 Your complete money dashboard is ready — budgets AND investments, all in one place!",
            'both-intermediate': "You're all set! Import data or add transactions to bring your dashboard to life.",
            'both-advanced': "Dashboard ready. Start importing.",
        },
    };

    const key = `${goal}-${experience}`;
    return messages[context]?.[key] || messages[context]?.['both-intermediate'] || '';
}

// ═══════════ CONVENIENCE FUNCTION ═══════════

export function getPersonalization(ftueState: any) {
    const goal = (ftueState?.onboardingGoal || 'both') as OnboardingGoal;
    const experience = (ftueState?.onboardingExperience || 'beginner') as ExperienceLevel;
    const config = { goal, experience };
    return { ...config, ...getPersonalizationFlags(config) };
}
