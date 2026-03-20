export interface GrowthForecastTabProps {
    currentPortfolioValueBrl?: number;
    currentPortfolioValueGbp?: number;
    liveContributionBrl?: number;
    liveContributionGbp?: number;
    /** Current month's investable surplus in whole BRL (cents ÷ 100) */
    budgetSurplusBrl?: number;
}

export interface ForecastPhase {
    id: number;
    startMonth: string | null;
    contribution: number;
    yield: number;
}

export interface ForecastDataPoint {
    date: string;
    actual: number | null;
    actualGbp: number | null;
    forecast: number | null;
    forecastGbp: number | null;
    type: string;
    contribution: number;
    contributionGbp: number;
    interest: number;
    interestGbp: number;
    targetBrl?: number | null;
    gbpValue?: number | null;
}

export interface StatusModalState {
    isOpen: boolean;
    title: string;
    message: string;
    type: string;
}
