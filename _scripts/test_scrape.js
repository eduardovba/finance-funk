const https = require('https');

const url = 'https://themovemarket.com/tools/propertyprices/flat-307-ink-court-419-wick-lane-london-e3-2pw';

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://google.com'
    }
};

https.get(url, options, (res) => {
    console.log('Status:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('Body length:', data.length);
        if (res.statusCode === 200) {
            // Try to find a price pattern
            // Looking for "£6xx,xxx" or similar
            const priceRegex = /£[\d,]+/;
            const match = data.match(priceRegex);
            console.log('Price Match:', match ? match[0] : 'No match');
            console.log('Preview:', data.substring(0, 500));
        }
    });
}).on('error', (e) => {
    console.error('Error:', e);
});
