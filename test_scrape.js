const cheerio = require('cheerio');
async function test() {
    const urls = ['https://ipowatch.in/a-one-steels-ipo/', 'https://ipowatch.in/bajaj-housing-finance-ipo/'];
    
    for (let url of urls) {
        try {
            const r = await fetch(url);
            const html = await r.text();
            const $ = cheerio.load(html);
            let eps = null;
            let priceBand = null;
            
            // Extract from lists or tables
            $('table').each((i, table) => {
                $(table).find('tr').each((j, row) => {
                    const text = $(row).text().replace(/\n/g, ' ').trim().toLowerCase();
                    // look for EPS
                    if(text.includes('earning per share') || text.includes('eps')) {
                        const val = $(row).find('td').last().text().trim();
                        if(val && !text.includes('company') && val.match(/[\d.]+/)) {
                            eps = val.match(/[\d.]+/)[0];
                        }
                    }
                    // look for Price Band
                    if(text.includes('price band') || text.includes('issue price')) {
                        const val = $(row).find('td').last().text().trim();
                        if(val) priceBand = val;
                    }
                });
            });
            console.log(url);
            console.log('  Extracted EPS:', eps);
            console.log('  Extracted Price Band:', priceBand);
            
            if(eps && priceBand) {
                const epsNum = parseFloat(eps);
                // Extract highest price from price band (e.g., "₹66 to ₹70" -> 70)
                const matches = priceBand.match(/\d+/g);
                if(matches && epsNum > 0) {
                    const priceNum = Math.max(...matches.map(Number));
                    console.log('  Calculated P/E:', (priceNum / epsNum).toFixed(2));
                }
            }
        } catch(e) {
            console.log(url, 'Error', e);
        }
    }
}
test();
