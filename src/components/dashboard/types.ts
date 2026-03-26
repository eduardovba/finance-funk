export interface DashboardTabProps {
    data: any;
    rates: any;
    historicalSnapshots: any[];
    monthlyInvestments: any[];
    diffPrevMonth: any;
    diffPrevMonthGBP: any;
    fxEffectBRL: any;
    assetEffectBRL: any;
    fxEffectGBP: any;
    assetEffectGBP: any;
    diffTarget: any;
    diffTargetGBP: any;
    assetDiffs: any;
    assetDiffsGBP: any;
    categoryAssetDiffs: any;
    isLoading: boolean;
    masterMixData: any;
    allocationTargets: any;
    onNavigate: (tabId: string, assetName?: string) => void;
}

export interface DashboardChartsProps {
    historicalData: any[];
    currentMonthData: any;
    rates: any;
    monthlyInvestments: any[];
    masterMixData: any;
    allocationTargets: any;
    forecastSettings: any;
    dashboardConfig: any;
    singleCurrencyMode?: boolean;
    onCustomizeClick: () => void;
    onNavigate: (tabId: string, assetName?: string) => void;
}
