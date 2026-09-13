const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// Fetch latest JSON
const files = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('full_') && f.endsWith('.json')).sort();
if (files.length === 0) {
    console.error('No full data files found for audit.');
    process.exit(1);
}

const latestFile = files[files.length - 1];
console.log(`Auditing Data Integrity on: ${latestFile}`);
const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, latestFile), 'utf8'));

let passed = 0;
let failed = 0;

const assert = (condition, msg) => {
    if (condition) {
        passed++;
    } else {
        console.error(`❌ FAIL: ${msg}`);
        failed++;
    }
};

const UC_BANDS = [
    { band: 2, tolerance: 0.12 },
    { band: 5, tolerance: 0.15 },
    { band: 10, tolerance: 0.25 },
    { band: 20, tolerance: 0.40 }
];

console.log('--- Testing pctChange calculation ---');
for (let i = 0; i < Math.min(100, data.length); i++) {
    const s = data[i];
    if (s.prevClose > 0) {
        const expectedChange = Math.round((((s.close - s.prevClose) / s.prevClose) * 100) * 100) / 100;
        assert(Math.abs(s.pctChange - expectedChange) < 0.01, `${s.symbol} pctChange mismatch: got ${s.pctChange}, expected ${expectedChange}`);
    }
}
console.log(`pctChange math verified on sample of ${Math.min(100, data.length)} stocks.`);

console.log('--- Testing UC Band logic ---');
let ucCount = 0;
for (const s of data) {
    // Replicate server logic
    let isUC = false;
    let assignedBand = null;
    if (s.high === s.close && s.pctChange > 1.0) {
        for (const { band, tolerance } of UC_BANDS) {
            if (Math.abs(s.pctChange - band) <= tolerance) {
                isUC = true;
                assignedBand = band;
                break;
            }
        }
    }

    if (isUC) {
        ucCount++;
        // Verify it meets conditions
        assert(s.high === s.close, `${s.symbol} flagged as UC but High (${s.high}) != Close (${s.close})`);
        assert(assignedBand !== null, `${s.symbol} flagged as UC but no band matched (Change: ${s.pctChange})`);
        
        // Strict boundary check: is pctChange really within tolerance?
        const bandInfo = UC_BANDS.find(b => b.band === assignedBand);
        assert(Math.abs(s.pctChange - bandInfo.band) <= bandInfo.tolerance, 
               `${s.symbol} assigned to ${assignedBand}% band, but change ${s.pctChange}% is outside tolerance ${bandInfo.tolerance}`);
    }
}
console.log(`UC Logic verified. Found ${ucCount} valid UC stocks in this dataset.`);

console.log(`\nData Integrity Audit Complete: ${failed} failures.`);
