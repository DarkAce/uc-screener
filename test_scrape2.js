const cheerio = require('cheerio');
async function test() {
    const url = 'https://www.moneycontrol.com/ipo/';
    try {
        console.log('Fetching', url);
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
        const html = await r.text();
        const $ = cheerio.load(html);
        const headers = [];
        $('table').first().find('tr').first().find('th, td').each((i, el) => {
            headers.push($(el).text().trim());
        });
        console.log('Moneycontrol Headers:', headers);
    } catch(e) {
        console.log('Error:', e);
    }
}
test();
