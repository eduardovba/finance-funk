const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, '../src/data/pension_fund_map.json');
const mapping = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const results = {};

mapping.forEach(item => {
    if (item.asset.includes('L&G')) {
        console.log("Found L&G item:", item);
        if (item.type === 'manual') {
            let price = item.price;
            if (item.isPence) price = price / 100;
            results[item.asset] = { price, currency: 'GBP' };
            console.log("Calculated Price:", price);
        }
    }
});

console.log("Full Result for L&G:", results);
