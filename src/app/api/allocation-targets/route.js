import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src', 'data', 'allocation_targets.json');

export async function GET() {
    try {
        if (fs.existsSync(dataFilePath)) {
            const fileContent = fs.readFileSync(dataFilePath, 'utf8');
            const data = JSON.parse(fileContent);
            return NextResponse.json(data);
        } else {
            // Default if file doesn't exist
            return NextResponse.json({
                "Equity": 50,
                "FixedIncome": 30,
                "RealEstate": 15,
                "Crypto": 5
            });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const data = await request.json();
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
