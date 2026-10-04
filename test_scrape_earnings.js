const https = require('https');
const cheerio = require('cheerio');

https.get('https://www.moneycontrol.com/markets/earnings/', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
}, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        const $ = cheerio.load(d);
        const results = [];
        // The earnings page uses tables inside some container. Let's find the correct selector.
        // If we don't know the selector, let's just log some generic tables first to see.
        $('table.mctable1, table').each((i, table) => {
            const dateHeaders = $(table).prevAll('h2, h3, h4, div.heading, .FL.bx1 h3').first().text().trim() || `Table ${i}`;
            const companies = [];
            $(table).find('tr').each((j, tr) => {
                if (j > 0) {
                    const tds = $(tr).find('td');
                    if (tds.length >= 2) {
                        const name = $(tds[0]).text().trim();
                        const remark = $(tds[1]).text().trim();
                        if (name) companies.push({ name, remark });
                    }
                }
            });
            if (companies.length) {
                results.push({ date: dateHeaders, companies });
            }
        });
        console.log(JSON.stringify(results.slice(0, 3), null, 2));
    });
});
