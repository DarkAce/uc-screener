const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('mc_earnings.html', 'utf8');
const $ = cheerio.load(html);

const nextDataStr = $('#__NEXT_DATA__').html();
if (nextDataStr) {
    console.log('Next.js data found');
    const data = JSON.parse(nextDataStr);
    
    // Attempt to traverse the massive JSON object to find earnings data
    try {
        const earningsData = data.props.pageProps.earningsDashboardData;
        console.log(Object.keys(earningsData.resCalData));
        if (Object.keys(earningsData.resCalData).length > 0) {
            console.log(JSON.stringify(earningsData.resCalData, null, 2).substring(0, 1000));
        }
    } catch(e) {}
} else {
    console.log('No NEXT_DATA');
}
