
const fs = require('fs');
const file = 'src/data/historical_snapshots.json';

try {
    const rawData = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(rawData);

    console.log('Month | NetWorth | Liquid | Pensions | Debt | NW-(Liq+Pen) | NW-(Liq+Pen)+Debt');

    data.forEach(item => {
        const nw = item.networthBRL || 0;
        const liquid = item.totalminuspensionsBRL || 0;
        const pensions = item.categories?.Pensions || 0;
        const debt = item.categories?.Debt || 0;

        const calcLiquid = nw - pensions;
        const calcNW = liquid + pensions;

        const diff1 = nw - calcNW; // Should be 0 if Liquid = NW - Pensions. If negative, NW < Liq+Pen.
        const diff2 = diff1 + debt; // Check if Debt explains the difference.

        if (Math.abs(diff1) > 100) {
            console.log(`${item.month} | ${nw.toFixed(0)} | ${liquid.toFixed(0)} | ${pensions.toFixed(0)} | ${debt.toFixed(0)} | ${diff1.toFixed(0)} | ${diff2.toFixed(0)}`);
        }
    });

} catch (e) {
    console.error(e);
}
