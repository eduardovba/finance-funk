const fs = require('fs');
const path = require('path');

const ledgerPath = path.join(__dirname, '../data/Ledger.csv');
const actualsPath = path.join(__dirname, '../src/data/forecast_actuals.json');

const ledgerContent = fs.readFileSync(ledgerPath, 'utf8');
const actualsContent = fs.readFileSync(actualsPath, 'utf8');
const actuals = JSON.parse(actualsContent);

// CSV Parser Helper
function parseCSVLine(text) {
    const result = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (inQuote) {
            if (char === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') { current += '"'; i++; }
                else { inQuote = false; }
            } else { current += char; }
        } else {
            if (char === '"') { inQuote = true; }
            else if (char === ',') { result.push(current); current = ''; }
            else { current += char; }
        }
    }
    result.push(current);
    return result;
}

const lines = ledgerContent.split(/\r?\n/);
const ledgerMap = {};

// Parse Ledger
// Data starts row 9 (Line 10)
for (let i = 9; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);

    // Left side: Month/Year is Col 1 (Col 0 is empty)
    const date = cols[1]; // "Dec/2020"
    if (!date || !date.includes('/')) continue;

    const parseMoney = (val) => {
        if (!val) return 0;
        return parseFloat(val.replace(/[£,\s"()]/g, '')) || 0;
    };

    // Contribution = Salary Savings (Col 2)
    // Interest = Fixed Income (Col 3) + Equity (Col 4) + Real Estate (Col 5)
    // Note: CSV index 0-based.
    // Col 2 is Salary Savings.
    // Col 3 is Fixed Income.
    // Col 4 is Equity.
    // Col 5 is Real Estate.

    // Check for negative values represented as " -£100 " or similar?
    // Regex handles it? parseFloat handles "-100".
    // " -£148,682 " -> replace £,, -> "-148682" -> -148682. Correct.

    const contributionGBP = parseMoney(cols[2]);
    const interestGBP = parseMoney(cols[3]) + parseMoney(cols[4]) + parseMoney(cols[5]);

    ledgerMap[date.trim()] = { contributionGBP, interestGBP };
}

// Merge into Actuals
// 1. Filter out future dates from Actuals (Keep only until current real month)
// Current Date: Feb 2026.
const currentDate = new Date(); // This uses system time.
// System time is 2026-02-16.
// So we keep up to Feb/2026.

// Helper to parse "MMM/YYYY"
const parseDateStr = (str) => {
    const [mmm, yyyy] = str.split('/');
    const months = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
    return new Date(parseInt(yyyy), months[mmm], 1);
};

const merged = [];

actuals.forEach(item => {
    const dateStr = item.date;
    const itemDate = parseDateStr(dateStr);

    // If itemDate is in future relative to NOW (Feb 16 2026), what to do?
    // Feb 2026 IS current. So keep it.
    // Mar 2026 is future. remove it.

    // Simple comparison:
    const now = new Date();
    // Reset now to start of month for comparison
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // However, the USER request said "Actuals should only be populated until the current month".
    // This implies Feb 2026 Actual is valid. Mar 2026 Actual is not.

    if (itemDate > currentMonthStart) return; // Skip future months

    const ledgerData = ledgerMap[dateStr];

    let contributionBRL = 0;
    let interestBRL = 0;

    if (ledgerData) {
        // Calculate Implied Rate
        let rate = 0;
        if (item.actualGBP && item.actualGBP !== 0) {
            rate = item.actualBRL / item.actualGBP;
        } else {
            // Fallback rate? 7.10
            rate = 7.10;
        }

        contributionBRL = Math.round(ledgerData.contributionGBP * rate);
        interestBRL = Math.round(ledgerData.interestGBP * rate);
    }

    merged.push({
        ...item,
        contribution: contributionBRL,
        interest: interestBRL,
        contributionGBP: ledgerData ? ledgerData.contributionGBP : 0,
        interestGBP: ledgerData ? ledgerData.interestGBP : 0
    });
});

fs.writeFileSync(actualsPath, JSON.stringify(merged, null, 2));
console.log(`Merged Ledger data. Processed ${merged.length} rows.`);
