const https = require('https');
const cheerio = require('cheerio');

const url = 'https://finance.yahoo.com/calendar/earnings?day=2026-10-05';
https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        const $ = cheerio.load(d);
        const results = [];
        $('table tbody tr').each((i, tr) => {
            const tds = $(tr).find('td');
            if (tds.length > 0) {
                const symbol = $(tds[0]).text().trim();
                const name = $(tds[1]).text().trim();
                if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) {
                    results.push({ symbol: symbol.replace('.NS', '').replace('.BO', ''), name });
                }
            }
        });
        console.log("Total Indian stocks:", results.length);
        console.log(results.slice(0, 5));
    });
});
