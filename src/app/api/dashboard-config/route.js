import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';
import { requireAuth } from '@/lib/authGuard';

const KEY = 'dashboard_config';

const defaultDashboardConfig = {
    charts: [
        {
            id: "nwh-1",
            title: "Total Net Worth History",
            chartType: "area",
            dataSources: ["networth-history"],
            series: ["networthPrimary", "networthSecondary", "targetPrimary"],
            order: 0,
            options: { dualAxis: true, showGradient: true }
        },
        {
            id: "aah-1",
            title: "Asset Allocation History",
            chartType: "stacked-bar",
            dataSources: ["category-history"],
            series: ["RealEstate", "Equity", "Pensions", "FixedIncome", "Crypto", "Debt"],
            order: 1,
            options: {}
        },
        {
            id: "avt-1",
            title: "Allocation vs Targets (%)",
            chartType: "horizontal-bar",
            dataSources: ["allocation-current"],
            series: ["actual", "target"],
            order: 2,
            options: {}
        },
        {
            id: "rfx-1",
            title: "Portfolio ROI vs FX Rate",
            chartType: "line",
            dataSources: ["roi-history", "fx-rate-history"],
            series: ["roi", "impliedRate"],
            order: 3,
            options: { dualAxis: true }
        },
        {
            id: "cex-1",
            title: "Currency Exposure (Net)",
            chartType: "donut",
            dataSources: ["currency-exposure"],
            series: ["Primary", "Secondary", "Other"],
            order: 4,
            options: {}
        },
        {
            id: "wtt-1",
            title: "Wealth Trajectory Target",
            chartType: "area",
            dataSources: ["wealth-trajectory"],
            series: ["targetPrimary", "actualGreen", "actualRed"],
            order: 5,
            options: {}
        },
        {
            id: "nio-1",
            title: "Net Inflow/Outflow",
            chartType: "bar",
            dataSources: ["net-flow-history"],
            series: ["Net"],
            order: 6,
            options: {}
        }
    ]
};

export async function GET() {
    try {
        const user = await requireAuth();
        const config = await kvGet(KEY, defaultDashboardConfig, user.id);
        return NextResponse.json(config);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('Error reading dashboard config:', error);
        return NextResponse.json(defaultDashboardConfig);
    }
}

export async function POST(request) {
    try {
        const user = await requireAuth();
        const config = await request.json();
        await kvSet(KEY, config, user.id);
        return NextResponse.json({ success: true, config });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('Error saving dashboard config:', error);
        return NextResponse.json({ success: false, error: 'Failed to save dashboard config' }, { status: 500 });
    }
}
