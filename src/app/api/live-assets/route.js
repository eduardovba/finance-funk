import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src/data/live_assets.json');

function getAssets() {
    if (!fs.existsSync(dataFilePath)) {
        return [];
    }
    const fileData = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(fileData);
}

function saveAssets(assets) {
    fs.writeFileSync(dataFilePath, JSON.stringify(assets, null, 2));
}

export async function GET() {
    const assets = getAssets();
    return NextResponse.json(assets);
}

export async function POST(request) {
    try {
        const newAsset = await request.json();
        if (!newAsset.ticker) {
            return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
        }

        const assets = getAssets();

        // Avoid duplicates
        if (assets.some(a => a.ticker === newAsset.ticker)) {
            return NextResponse.json({ error: 'Asset already exists' }, { status: 409 });
        }

        assets.push(newAsset);
        saveAssets(assets);

        return NextResponse.json(newAsset);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to add asset' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const ticker = searchParams.get('ticker');

        if (!ticker) {
            return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
        }

        let assets = getAssets();
        assets = assets.filter(a => a.ticker !== ticker);
        saveAssets(assets);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
    }
}
