const fs = require('fs');
const log = fs.readFileSync('debug_sync.log', 'utf8');
const entries = log.split('---');

let lastInvestments = null;
for (let i = entries.length - 1; i >= 0; i--) {
    try {
        const data = JSON.parse(entries[i].trim().match(/\{[\s\S]*\}/)[0]);
        if (data.stage === 'investments' && data.results) {
            lastInvestments = data.results;
            break;
        }
    } catch (e) { }
}

if (!lastInvestments) {
    console.log('No investment log found');
    process.exit(1);
}

const summary = {};
let total = 0;

lastInvestments.forEach(inv => {
    const sub = inv.subtype || 'Unknown';
    const name = inv.name || 'Unknown';

    // Using the NEW formula: prioritize amountWithdrawal (Net)
    const calculatedValue = inv.amountWithdrawal ||
        ((inv.quantity > 0 && inv.value > 0) ? (inv.quantity * inv.value) : (inv.balance || inv.amount || 0));

    if (!summary[sub]) summary[sub] = 0;
    summary[sub] += calculatedValue;
    total += calculatedValue;

    console.log(`[${sub}] ${name}: ${calculatedValue.toFixed(2)} (Net:${inv.amountWithdrawal}, Q:${inv.quantity}, V:${inv.value}, B:${inv.balance}, A:${inv.amount})`);
});

console.log('\n--- Summary (Net Prioritized) ---');
for (const [sub, val] of Object.entries(summary)) {
    console.log(`${sub}: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
}
console.log(`Total: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
