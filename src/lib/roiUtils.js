/**
 * Calculates Time-Weighted Return (TWR) history.
 * 
 * Formula for each period i:
 * Return_i = (V_end - CashFlow) / V_start - 1
 * 
 * Cumulative TWR:
 * TWR_cum = [(1 + r1) * (1 + r2) * ... * (1 + rn)] - 1
 * 
 * @param {Array} snapshots - Array of snapshot objects { month, networthBRL, networthGBP }
 * @param {Array} monthlyInvestments - Array of investment objects { month, total }
 * @param {Object} rates - Currency rates { BRL, GBP }
 * @returns {Object} Map of month -> cumulative ROI %
 */
export const calculateTWRHistory = (snapshots, monthlyInvestments, rates) => {
    if (!snapshots || snapshots.length === 0) return {};

    // 1. Arrange data by month for easy lookup
    const invMap = {};
    monthlyInvestments.forEach(inv => {
        // If total is missing, sum the asset categories
        const total = inv.total !== undefined ? inv.total : (
            (inv.equity || 0) +
            (inv.fixedIncome || 0) +
            (inv.realEstate || 0) +
            (inv.pensions || 0) +
            (inv.crypto || 0) +
            (inv.debt || 0)
        );
        invMap[inv.month] = total;
    });

    // 2. Sort snapshots by month
    const sortedSnapshots = [...snapshots].sort((a, b) => a.month.localeCompare(b.month));

    const twrMap = {};
    let cumulativeProduct = 1;
    let prevValue = 0;

    sortedSnapshots.forEach((snap, index) => {
        const month = snap.month;
        const netWorth = snap.networthGBP || (snap.networthBRL / (snap.impliedRate || rates.BRL));
        const cashFlow = invMap[month] || 0;

        let periodReturn = 0;

        if (prevValue > 0) {
            // Standard TWR period return calculation
            // We subtract cash flow from the ending value to isolate the "market" return
            periodReturn = (netWorth - cashFlow) / prevValue - 1;
        } else {
            // First month or previous value was 0
            // If there's cash flow, ROI is 0% by definition (performance starts from here)
            periodReturn = 0;
        }

        cumulativeProduct *= (1 + periodReturn);
        twrMap[month] = (cumulativeProduct - 1) * 100;

        prevValue = netWorth;
    });

    return twrMap;
};
