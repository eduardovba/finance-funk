const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../data/Forecasting.csv');
const outPath = path.join(__dirname, '../src/data/forecast_actuals.json');

const fileContent = fs.readFileSync(csvPath, 'utf8');

// Simple CSV Parser
// Matches quoted fields separately from non-quoted fields
function parseCSVLine(text) {
    const re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
    const re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;

    // Return empty array if no match (or empty line)
    // Using a simpler approach: split by comma but respect quotes
    const args = [];
    let match;
    // Regex to capture: 
    // 1. Quoted string: "..."
    // 2. Non-quoted string: ...
    const regex = /(?:\"([^\"]*)\")|([^,]+)|(,)/g;

    // Actually, manual state machine is safer for CSV with weird chars
    const result = [];
    let current = '';
    let inQuote = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (inQuote) {
            if (char === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuote = false;
                }
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuote = true;
            } else if (char === ',') {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
    }
    result.push(current);
    return result;
}

const lines = fileContent.split(/\r?\n/);
const actuals = [];

// Data starts at row index 5 (Line 6 in file)
const startRow = 5;

for (let i = startRow; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const row = parseCSVLine(line);
    const date = row[1]; // Col B (Index 1)

    if (!date || !date.includes('/')) continue;

    // Col U (20): Actual GBP
    // Col AB (27): Actual BRL (Verified "R$1,202,330" in line 6)

    // Note: My loop above might not handle empty columns perfectly (e.g. ,,) if not careful.
    // parseCSVLine handles empty cols as empty strings.

    let actualGBP = row[20];
    let actualBRL = row[27];

    const parseValue = (val) => {
        if (!val) return 0;
        const clean = val.replace(/[R$£,\s()]/g, '');
        return parseFloat(clean) || 0;
    };

    const pBRL = parseValue(actualBRL);
    const pGBP = parseValue(actualGBP);

    // Filter out rows that are purely targets (no actuals)
    // But we want to include rows if they have *any* actual data?
    // User said "actuals until Feb/2026".
    // Let's assume valid actuals.

    // Also, handle empty actuals which might be "£-   " (parsed as 0) or "" (parsed as 0).
    // The issue is future dates might be parsed as 0 actuals, which looks like a drop to 0.
    // We should stop parsing actuals when we hit a date that has no actuals.
    // However, looking at the file, Feb/2026 has actuals. Mar/2026 has empty.

    // Let's create a "hasData" check
    const rawBRL = actualBRL ? actualBRL.trim() : "";
    const hasData = rawBRL !== "" && rawBRL !== "£-" && rawBRL !== "R$-";

    if (hasData || i < 50) { // Keep early data even if 0? No, 0 is fine.
        // Wait, "R$ -" is 0. 
        // We only want to stop if the column is *empty* (likely future).
        // Feb 2026 has data. Mar 2026 likely has empty string?
        // Row 56 (Mar 2026): `...,,,,`
        if (!actualBRL && !actualGBP) continue; // Skip future dates
    }

    actuals.push({
        date: date,
        actualBRL: pBRL,
        actualGBP: pGBP
    });
}

fs.writeFileSync(outPath, JSON.stringify(actuals, null, 2));
console.log(`Parsed ${actuals.length} rows. Saved to ${outPath}`);
