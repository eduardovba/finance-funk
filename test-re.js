const fs = require('fs');

async function test() {
    try {
        const data = JSON.parse(fs.readFileSync('./data/real-estate.json', 'utf8'));
        if (data.airbnb && data.airbnb.ledger) {
            const feb26 = data.airbnb.ledger.filter(r => r.month === 'Feb-26');
            console.log("Airbnb Ledger Feb-26:", feb26);
        } else {
            console.log("No airbnb ledger found in real-estate.json");
        }
    } catch (e) {
        console.error(e);
    }
}
test();
