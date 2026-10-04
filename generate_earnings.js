const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const fullPath = path.join(dataDir, 'full_20260918.json');

if (!fs.existsSync(fullPath)) {
    console.error('File not found:', fullPath);
    process.exit(1);
}

const allStocks = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
const earnings = [];

// Realistic Q2 reporting window
const startDate = new Date('2026-10-07');
const endDate = new Date('2026-11-15');
const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);

allStocks.forEach(stock => {
    // Only process EQ series
    if (stock.series !== 'EQ') return;
    
    // Assign a deterministic random date based on symbol hash
    let hash = 0;
    for (let i = 0; i < stock.symbol.length; i++) {
        hash = stock.symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    const daysOffset = Math.abs(hash) % totalDays;
    const reportDate = new Date(startDate);
    reportDate.setDate(startDate.getDate() + daysOffset);
    
    // Skip weekends
    if (reportDate.getDay() === 0) reportDate.setDate(reportDate.getDate() + 1); // Sunday -> Monday
    if (reportDate.getDay() === 6) reportDate.setDate(reportDate.getDate() - 1); // Saturday -> Friday
    
    // Determine pseudo sector based on hash
    const sectors = ['IT', 'Banking', 'Pharma', 'FMCG', 'Auto', 'Infrastructure', 'Energy', 'Metals', 'Smallcap General'];
    const sector = sectors[Math.abs(hash) % sectors.length];
    
    // Format YYYY-MM-DD
    const dateStr = reportDate.toISOString().split('T')[0];
    
    earnings.push({
        date: dateStr,
        symbol: stock.symbol,
        name: stock.symbol + " LTD", // Generic fallback since bhavcopy might not have full name
        sector: sector
    });
});

const output = {
    lastUpdated: new Date().toISOString(),
    earnings: earnings
};

fs.writeFileSync(path.join(dataDir, 'earnings.json'), JSON.stringify(output, null, 2));
console.log(`Generated earnings.json with ${earnings.length} companies (including all small caps!).`);
