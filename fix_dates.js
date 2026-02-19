
const fs = require('fs');
const path = require('path');
const file = 'src/data/historical_snapshots.json';

try {
    const rawData = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(rawData);

    const newData = data.map(item => {
        let [year, month] = item.month.split('-').map(Number);

        // Subtract 1 month
        month -= 1;
        if (month === 0) {
            month = 12;
            year -= 1;
        }

        const newMonth = `${year}-${String(month).padStart(2, '0')}`;
        // console.log(`${item.month} -> ${newMonth}`);
        return { ...item, month: newMonth };
    });

    // Write back to file
    fs.writeFileSync(file, JSON.stringify(newData, null, 2));
    console.log(`Successfully updated ${newData.length} records.`);

} catch (e) {
    console.error('Error processing file:', e);
}
