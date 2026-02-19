const fs = require("fs");
const path = require("path");

const JS_FILE = "/Users/eduardoaraujo/.gemini/antigravity/scratch/finance-tracker/src/data/fixedIncomeTransactions.js";
const JSON_FILE = "/Users/eduardoaraujo/.gemini/antigravity/scratch/finance-tracker/src/data/transactions.json";

const content = fs.readFileSync(JS_FILE, "utf8");
// Extract the array content between the first [ and last ]
const startIdx = content.indexOf("[");
const endIdx = content.lastIndexOf("]");
const arrayStr = content.substring(startIdx, endIdx + 1);

// Safely evaluate the array string (caution: eval)
// We use Function constructor to be a bit safer than eval() direct
const transactions = new Function(`return ${arrayStr}`)();

const withIds = transactions.map((tr, i) => ({
    id: "init-" + i,
    ...tr
}));

fs.writeFileSync(JSON_FILE, JSON.stringify(withIds, null, 2), "utf8");
console.log(`Successfully migrated ${withIds.length} transactions to JSON.`);
