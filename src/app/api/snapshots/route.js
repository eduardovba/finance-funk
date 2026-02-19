
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'src/data/historical_snapshots.json');
export const dynamic = 'force-dynamic';

// Helper to read data
const readData = () => {
    if (!fs.existsSync(DATA_FILE)) return [];
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading snapshots:', error);
        return [];
    }
};

// Helper to write data
const writeData = (data) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing snapshots:', error);
        return false;
    }
};

export async function GET() {
    const data = readData();
    // Sort by month ascending
    data.sort((a, b) => a.month.localeCompare(b.month));
    return NextResponse.json(data);
}

export async function POST(request) {
    try {
        const newSnapshot = await request.json();

        // Validate required fields
        if (!newSnapshot.month || !newSnapshot.totalminuspensionsBRL) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let data = readData();

        // Check if snapshot for this month already exists
        const existingIndex = data.findIndex(s => s.month === newSnapshot.month);

        if (existingIndex >= 0) {
            // Overwrite existing
            data[existingIndex] = newSnapshot;
        } else {
            // Add new
            data.push(newSnapshot);
        }

        // Sort by month
        data.sort((a, b) => a.month.localeCompare(b.month));

        if (writeData(data)) {
            return NextResponse.json(newSnapshot);
        } else {
            return NextResponse.json({ error: 'Failed to write data' }, { status: 500 });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
