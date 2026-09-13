const cheerio = require('cheerio');
fetch('https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/')
  .then(r => r.text())
  .then(html => {
    const $ = cheerio.load(html);
    const ths = [];
    $('table').first().find('tr').first().find('th').each((i, el) => ths.push($(el).text().trim()));
    console.log('Headers:', ths);
    const row = $('table').first().find('tr').eq(1);
    const tds = [];
    row.find('td').each((i, el) => tds.push($(el).text().trim()));
    console.log('Row 1 cells:', tds);
    console.log('Cell count:', tds.length);
  });
