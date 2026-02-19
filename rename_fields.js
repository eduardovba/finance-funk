
const fs = require('fs');
const path = require('path');
const file = 'src/data/historical_snapshots.json';

try {
    const rawData = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(rawData);

    const newData = data.map(item => {
        const newItem = { ...item };

        if (newItem.hasOwnProperty('netWorthBRL')) {
            newItem.totalminuspensionsBRL = newItem.netWorthBRL;
            delete newItem.netWorthBRL;
        }
        if (newItem.hasOwnProperty('netWorthGBP')) {
            newItem.totalminuspensionsGBP = newItem.netWorthGBP;
            delete newItem.netWorthGBP;
        }
        if (newItem.hasOwnProperty('netWorthUSD')) {
            newItem.totalminuspensionsUSD = newItem.netWorthUSD;
            delete newItem.netWorthUSD;
        }

        return newItem;
    });

    // Write back to file
    fs.writeFileSync(file, JSON.stringify(newData, null, 2));
    console.log(`Successfully renamed fields in ${newData.length} records.`);

} catch (e) {
    console.error('Error processing file:', e);
}
