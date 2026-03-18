
// Helper: Calculate months between two dates
export const getMonthDiff = (d1: Date, d2: Date): number => {
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
};

// Future Value function: FV = PV*(1+r)^n + PMT * ((1+r)^n - 1)/r
export const calculateFV = (PV: number, r: number, n: number, pmt: number): number => {
    if (Math.abs(r) < 1e-9) return PV + pmt * n;
    return PV * Math.pow(1 + r, n) + pmt * (Math.pow(1 + r, n) - 1) / r;
};

// Payment function (Reverse FV): Calculate required PMT to hit FV given PV, r, n
export const calculatePMT = (FV: number, PV: number, r: number, n: number): number => {
    if (Math.abs(r) < 1e-9) return (FV - PV) / (n > 0 ? n : 1);
    const term = Math.pow(1 + r, n);
    return (FV - PV * term) * r / (term - 1);
};

const MONTH_NAMES: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Sept': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
};

export const parseDate = (str: string | null | undefined): Date => {
    if (!str) return new Date();
    const [mmm, yyyy] = str.split('/');
    return new Date(parseInt(yyyy), MONTH_NAMES[mmm] ?? 0, 1);
};

interface ForecastSettings {
    portfolioGoalDec26?: number;
    portfolioGoalDec31?: number;
}

interface ActualDataPoint {
    date: string;
    actualBRL?: number;
}

interface TargetMetricResult {
    target: number;
    requiredRate?: number;
    requiredPMT?: number;
}

export const calculateTargetMetric = (currentDate: Date, settings: ForecastSettings, actuals: ActualDataPoint[]): TargetMetricResult => {
    const { portfolioGoalDec26, portfolioGoalDec31 } = settings;
    const firstActual = actuals[0];
    if (!firstActual) return { target: 0 };

    const firstDateObj = parseDate(firstActual.date);
    const PV = firstActual.actualBRL || 0;

    const dateDec26 = new Date(2026, 11, 1);
    const dateDec31 = new Date(2031, 11, 1);

    const t1 = getMonthDiff(firstDateObj, dateDec26);
    const t2 = getMonthDiff(firstDateObj, dateDec31);

    const G1 = portfolioGoalDec26 || 3000000;
    const G2 = portfolioGoalDec31 || 10000000;

    // Solve for r and PMT
    let foundR = 0.005;
    let foundPMT = 0;

    try {
        const solve = (): { r: number; pmt: number } => {
            let low = -0.02;
            let high = 0.05;
            let iter = 0;

            while (iter < 100) {
                const mid = (low + high) / 2;
                if (Math.abs(mid) < 1e-9) { iter++; continue; }

                const term1 = Math.pow(1 + mid, t1);
                const pmt_mid = (G1 - PV * term1) * mid / (term1 - 1);

                const fv2 = calculateFV(PV, mid, t2, pmt_mid);
                const diff = fv2 - G2;

                if (Math.abs(diff) < 100) return { r: mid, pmt: pmt_mid };

                if (diff > 0) {
                    high = mid;
                } else {
                    low = mid;
                }
                iter++;
            }
            return { r: (low + high) / 2, pmt: 0 };
        };

        const result = solve();
        foundR = result.r;
        foundPMT = result.pmt;

    } catch (e) {
        console.error("Solver failed", e);
    }

    // Calculate Target for currentDate
    const monthsSinceStart = getMonthDiff(firstDateObj, currentDate);
    const targetVal = calculateFV(PV, foundR, monthsSinceStart, foundPMT);

    return { target: Math.round(targetVal), requiredRate: foundR, requiredPMT: foundPMT };
};
