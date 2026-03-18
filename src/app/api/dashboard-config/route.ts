import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';

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
            title: "Portfolio Composition",
            chartType: "stacked-area",
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

const PostDashboardConfigSchema = z.object({
    charts: z.array(z.object({
        id: z.string(),
        title: z.string(),
        chartType: z.string(),
        dataSources: z.array(z.string()),
        series: z.array(z.string()),
        order: z.coerce.number(),
        options: z.record(z.string(), z.any()).optional()
    })).optional()
}).passthrough();

export async function GET(): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const config = await kvGet(KEY, defaultDashboardConfig, user.id);
        return NextResponse.json(config);
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Error reading dashboard config:', error);
        return NextResponse.json(defaultDashboardConfig);
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const { data: config, error } = validateBody(PostDashboardConfigSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        await kvSet(KEY, config, user.id);
        return NextResponse.json({ success: true, config });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Error saving dashboard config:', error);
        return NextResponse.json({ success: false, error: 'Failed to save dashboard config' }, { status: 500 });
    }
}
