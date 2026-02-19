const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/DB.csv');
const SNAPSHOTS_PATH = path.join(__dirname, '../src/data/historical_snapshots.json');
const FX_RATES_PATH = path.join(__dirname, '../src/data/fx_rates.json');

function parseCurrencyValue(val) {
    if (!val) return 0;
    // Remove "R$", "£", "$", commas, and whitespace
    const clean = val.replace(/[R$£,\s"']/g, ''); // Added quotes removal just in case
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

function parseMonth(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    // DD/MM/YYYY -> YYYY-MM
    return `${parts[2]}-${parts[1].padStart(2, '0')}`;
}

// Simple CSV Parser that handles quoted fields containing commas
function parseCSV(content) {
    const lines = content.split(/\r?\n/);
    const result = [];

    // Line 4 is header (index 3)
    // Find header line index - heuristics or hardcoded
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Net Value BRL') && lines[i].includes('Net Value GBP')) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) {
        console.error("Could not find header row in DB.csv");
        return [];
    }

    const headers = splitCSVLine(lines[headerIndex]).map(h => h.trim());

    for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = splitCSVLine(line);
        if (values.length < 2) continue; // Skip empty/malformed

        const row = {};
        headers.forEach((h, idx) => {
            row[h] = values[idx] || ''; // Handle missing trailing columns
        });
        result.push(row);
    }
    return result;
}

function splitCSVLine(line) {
    const values = [];
    let currentVal = '';
    let insideQuote = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            insideQuote = !insideQuote;
            // Optionally skip adding the quote to the value if you want clean values immediately
            // But keeping logic simple: allow quotes, strip them later or parseCurrencyValue handles them.
            // Actually let's strip them if they are wrapping the field.
        } else if (char === ',' && !insideQuote) {
            values.push(currentVal.trim());
            currentVal = '';
        } else {
            currentVal += char;
        }
    }
    values.push(currentVal.trim());
    return values.map(v => v.replace(/^"|"$/g, '').trim()); // Strip surrounding quotes
}

async function ingest() {
    console.log('Reading DB.csv...');
    const csvContent = fs.readFileSync(DB_PATH, 'utf8');

    const records = parseCSV(csvContent);
    console.log(`Found ${records.length} records.`);

    const fxRates = JSON.parse(fs.readFileSync(FX_RATES_PATH, 'utf8'));
    let snapshots = [];

    if (fs.existsSync(SNAPSHOTS_PATH)) {
        try {
            snapshots = JSON.parse(fs.readFileSync(SNAPSHOTS_PATH, 'utf8'));
        } catch (e) { console.warn("Could not parse existing snapshots, starting fresh."); }
    }

    for (const row of records) {
        if (!row.Date) continue;

        const month = parseMonth(row.Date);
        if (!month) continue;

        // Skip future dates if any (or decide to keep them as forecast? User said "historical data")
        // But rows go up to 2026. Code should probably ingest everything available in DB.csv.

        // Parse Rates for conversion
        // CSV has "GBP <> BRL FX" column
        let brlRate = parseCurrencyValue(row['GBP <> BRL FX']);
        if (brlRate === 0) {
            // Fallback to JSON
            if (fxRates[month] && fxRates[month].BRL) {
                brlRate = fxRates[month].BRL;
            } else {
                brlRate = 1; // Default fallback
            }
        }

        // Need USD rate for Crypto ($) conversion.
        let usdRate = 1.25; // fallback
        // Approximate USD/BRL or USD/GBP?
        // JSON has USD (GBP->USD).
        // Crypto ($) -> GBP -> BRL? 
        // Or convert $ directly to BRL?
        // Usually USD/BRL rate is not in JSON directly (it has GBP->USD).
        // GBP->BRL = X, GBP->USD = Y => USD->BRL = X / Y.
        if (fxRates[month]) {
            const gbpToBrl = fxRates[month].BRL || brlRate;
            const gbpToUsd = fxRates[month].USD || 1.3;
            usdRate = gbpToBrl / gbpToUsd; // 1 USD = (1/Y) GBP = (1/Y)*X BRL
        } else {
            // Rough approx if missing
            usdRate = 5.0;
        }


        // Extract Values
        // Net Value BRL
        const netWorthBRL = parseCurrencyValue(row['Net Value BRL']);

        // Categories (convert to BRL if needed)

        // Equity (GBP)
        const equityGBP = parseCurrencyValue(row['Equity']);
        const equityBRL = equityGBP * brlRate;

        // Fixed Income (Maybe BRL? "R$...")
        // Row 27: "R$17,196" -> BRL
        const fixedIncomeRaw = row['Fixed Income'];
        let fixedIncomeBRL = 0;
        if (fixedIncomeRaw && fixedIncomeRaw.includes('£')) {
            fixedIncomeBRL = parseCurrencyValue(fixedIncomeRaw) * brlRate;
        } else {
            fixedIncomeBRL = parseCurrencyValue(fixedIncomeRaw);
        }

        // Real Estate (BRL "R$...")
        const realEstateBRL = parseCurrencyValue(row['Real Estate']);

        // Crypto (USD "$...")
        const cryptoUSD = parseCurrencyValue(row['Crypto']);
        const cryptoBRL = cryptoUSD * usdRate;

        // Pensions (GBP "£...")
        const pensionsGBP = parseCurrencyValue(row['Pensions']);
        const pensionsBRL = pensionsGBP * brlRate;

        // Debt (GBP? Row 62 "£20,055")
        const debtGBP = parseCurrencyValue(row['Debt']);
        const debtBRL = debtGBP * brlRate;

        // ROI
        const roiStr = row['Portfolio ROI'];
        const roi = parseFloat(roiStr ? roiStr.replace(/[%]/g, '') : 0);

        // Total BRL/GBP (Explicit request for these columns)
        const totalBRL = parseCurrencyValue(row['Total BRL']);
        const totalGBP = parseCurrencyValue(row['Total GBP']);

        const snapshot = {
            month,
            netWorthBRL: netWorthBRL || (fixedIncomeBRL + equityBRL + realEstateBRL + cryptoBRL + pensionsBRL - debtBRL),
            netWorthGBP: (netWorthBRL || (fixedIncomeBRL + equityBRL + realEstateBRL + cryptoBRL + pensionsBRL - debtBRL)) / brlRate,
            netWorthUSD: ((netWorthBRL || (fixedIncomeBRL + equityBRL + realEstateBRL + cryptoBRL + pensionsBRL - debtBRL)) / brlRate) * (fxRates[month]?.USD || 1.3),
            totalBRL: totalBRL || (fixedIncomeBRL + equityBRL + realEstateBRL + cryptoBRL + pensionsBRL), // Fallback to sum of assets (excluding debt deduction)
            totalGBP: totalGBP || ((fixedIncomeBRL + equityBRL + realEstateBRL + cryptoBRL + pensionsBRL) / brlRate),
            roi: isNaN(roi) ? 0 : roi,
            categories: {
                FixedIncome: fixedIncomeBRL,
                Equity: equityBRL,
                RealEstate: realEstateBRL,
                Crypto: cryptoBRL,
                Pensions: pensionsBRL,
                Debt: debtBRL
            },
            source: 'DB.CSV',
            recordedAt: new Date().toISOString()
        };

        // Upsert
        const existingIndex = snapshots.findIndex(s => s.month === month);
        if (existingIndex >= 0) {
            snapshots[existingIndex] = { ...snapshots[existingIndex], ...snapshot };
        } else {
            snapshots.push(snapshot);
        }
    }

    // Sort by month
    snapshots.sort((a, b) => a.month.localeCompare(b.month));

    fs.writeFileSync(SNAPSHOTS_PATH, JSON.stringify(snapshots, null, 2));
    console.log(`Successfully updated snapshots. Total count: ${snapshots.length}`);
}

ingest().catch(console.error);
