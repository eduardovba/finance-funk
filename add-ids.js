const fs = require('fs');
const path = require('path');

const DATA_PATH = '/Users/eduardoaraujo/.gemini/antigravity/scratch/finance-tracker/src/data/realEstate.json';

function addIds() {
    console.log('Script started. Reading from:', DATA_PATH);
    const rawData = fs.readFileSync(DATA_PATH, 'utf8');
    const data = JSON.parse(rawData);

    const generateId = (prefix) => prefix + '-' + Math.random().toString(36).substr(2, 5) + '-' + Date.now().toString().slice(-4);

    let count = 0;

    // 1. Properties
    data.properties.forEach((prop, pIdx) => {
        console.log(`Checking property: ${prop.name}`);
        prop.ledger.forEach((entry, eIdx) => {
            if (!entry.id) {
                entry.id = generateId(`p${pIdx}`);
                count++;
            }
        });
    });

    // 2. Funds
    if (data.funds && data.funds.ledger) {
        data.funds.ledger.forEach((entry, eIdx) => {
            if (!entry.id) {
                entry.id = generateId('fund');
                count++;
            }
        });
    }

    // 3. Airbnb
    if (data.airbnb && data.airbnb.ledger) {
        data.airbnb.ledger.forEach((entry, eIdx) => {
            if (!entry.id) {
                entry.id = generateId('air');
                count++;
            }
        });
    }

    // 4. Ink Court
    if (data.inkCourt && data.inkCourt.ledger) {
        data.inkCourt.ledger.forEach((entry, eIdx) => {
            if (!entry.id) {
                entry.id = generateId('ic');
                count++;
            }
        });
    }

    const newData = JSON.stringify(data, null, 2);
    fs.writeFileSync(DATA_PATH, newData, 'utf8');
    console.log(`DONE. Added ${count} IDs.`);
}

addIds();
