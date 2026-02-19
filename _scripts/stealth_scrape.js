
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const url = 'https://themovemarket.com/tools/propertyprices/flat-307-ink-court-419-wick-lane-london-e3-2pw';

(async () => {
    console.log('Launching stealth browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });

        console.log('Navigating to', url);
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });

        // Wait for potential dynamic content
        await new Promise(r => setTimeout(r, 5000));

        const bodyText = await page.evaluate(() => document.body.innerText);
        const title = await page.evaluate(() => document.title);
        console.log('Title:', title);

        await page.screenshot({ path: 'debug_stealth.png' });

        console.log('Body length:', bodyText.length);

        if (bodyText.includes('Attention Required') || bodyText.includes('Cloudflare') || bodyText.includes('Robot') || title.includes('Attention Required')) {
            console.log('DETECTED: Bot protection active.');
        }

        const matches = bodyText.match(/£\d{3},\d{3}/g);
        console.log('Price matches found:', matches);

        if (matches && matches.length > 0) {
            console.log('Market Value found:', matches[0]);
        } else {
            console.log('No price text found in body.');
        }

    } catch (e) {
        console.error('Error during scraping:', e);
    } finally {
        console.log('Closing browser...');
        await browser.close();
    }
})();
