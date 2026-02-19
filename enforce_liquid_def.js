
const fs = require('fs');
const file = 'src/data/historical_snapshots.json';

try {
    const rawData = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(rawData);

    const newData = data.map(item => {
        const networthBRL = item.networthBRL || 0;
        const pensions = item.categories?.Pensions || 0;

        // Enforce Liquid = NetWorth - Pensions
        const newLiquidBRL = networthBRL - pensions;

        // Calculate new FX values if rates implied
        // Assuming we keep the implied rate from the record if possible, or just use raw ratio
        // But simpler to just recalculate derived currencies if we trust the BRL values.
        // However, FX rates vary.
        // Let's derive GBP/USD from the new BRL value using the IMPLIED rate of the record.

        const impliedRate = item.totalminuspensionsBRL && item.totalminuspensionsGBP ?
            item.totalminuspensionsBRL / item.totalminuspensionsGBP :
            (item.networthBRL && item.networthGBP ? item.networthBRL / item.networthGBP : 0);

        if (impliedRate > 0) {
            item.totalminuspensionsBRL = newLiquidBRL;
            item.totalminuspensionsGBP = newLiquidBRL / impliedRate;
            // USD usually follows a cross rate, but let's assume we can't easily derive it without a USD rate.
            // Check if we have a USD rate implied.
            const impliedUSD = item.totalminuspensionsBRL && item.totalminuspensionsUSD ?
                item.totalminuspensionsBRL / item.totalminuspensionsUSD : 0;

            if (impliedUSD > 0) {
                item.totalminuspensionsUSD = newLiquidBRL / impliedUSD;
            }
        } else {
            // Fallback if no rate found (unlikely)
            item.totalminuspensionsBRL = newLiquidBRL;
        }

        return item;
    });

    fs.writeFileSync(file, JSON.stringify(newData, null, 2));
    console.log(`Updated ${newData.length} records to enforce Liquid = NetWorth - Pensions.`);

} catch (e) {
    console.error(e);
}
