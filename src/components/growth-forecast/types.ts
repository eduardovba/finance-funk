export interface GrowthForecastTabProps {
    currentPortfolioValueBrl?: number;
    currentPortfolioValueGbp?: number;
    liveContributionBrl?: number;
    liveContributionGbp?: number;
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
