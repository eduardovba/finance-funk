import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const dataFilePath = path.join(process.cwd(), 'src/data/forecast_settings.json');

export async function GET() {
    try {
        const fileContent = await fs.readFile(dataFilePath, 'utf8');
        const settings = JSON.parse(fileContent);
        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error reading forecast settings:', error);
        // Return defaults if file doesn't exist or errors
        return NextResponse.json({
            monthlyContribution: 12000,
            annualInterestRate: 10,
            portfolioGoalDec26: 3000000,
            portfolioGoalDec31: 10000000
        });
    }
}

export async function POST(request) {
    try {
        const settings = await request.json();

        // Basic validation could go here

        await fs.writeFile(dataFilePath, JSON.stringify(settings, null, 2), 'utf8');

        return NextResponse.json({ success: true, settings });
    } catch (error) {
        console.error('Error saving forecast settings:', error);
        return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
    }
}
