
const fs = require('fs');
const path = require('path');
const file = 'src/data/historical_snapshots.json';

try {
    const rawData = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(rawData);

    const newData = data.map(item => {
        const newItem = { ...item };

        if (newItem.hasOwnProperty('totalBRL')) {
            newItem.networthBRL = newItem.totalBRL;
            delete newItem.totalBRL;
        }
        if (newItem.hasOwnProperty('totalGBP')) {
            newItem.networthGBP = newItem.totalGBP;
            delete newItem.totalGBP;
        }

        return newItem;
    });

    // Write back to file
    fs.writeFileSync(file, JSON.stringify(newData, null, 2));
    console.log(`Successfully renamed total fields to networth fields in ${newData.length} records.`);

} catch (e) {
    console.error('Error processing file:', e);
}
