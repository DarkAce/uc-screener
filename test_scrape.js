const cheerio = require('cheerio');
fetch('https://ipowatch.in/a-one-steels-ipo/')
  .then(r => r.text())
  .then(html => {
    const $ = cheerio.load(html);
    $('table').each((i, table) => {
        const text = $(table).text();
        if(text.includes('P/E') || text.includes('EPS')) {
            console.log(`\n--- TABLE ${i} ---`);
            $(table).find('tr').each((j, row) => {
                const cells = [];
                $(row).find('th, td').each((k, cell) => {
                    cells.push($(cell).text().trim().replace(/\s+/g, ' '));
                });
                console.log(cells.join(' | '));
            });
        }
    });
  });
