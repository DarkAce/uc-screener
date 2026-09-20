const express = require('express');
const https = require('https');
const path = require('path');
const fs = require('fs');
const { createUnzip } = require('zlib');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Config ──────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

// UC detection bands — a stock is at UC if High == Close and %change matches a band
const UC_BANDS = [
    { band: 2, tolerance: 0.12 },
    { band: 5, tolerance: 0.15 },
    { band: 10, tolerance: 0.25 },
    { band: 20, tolerance: 0.40 }
];

// Allowed series (equities)
const ALLOWED_SERIES = new Set(['EQ', 'BE', 'SM', 'ST', 'BZ']);

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── Serve static frontend ──────────────────────────────────────────
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// ─── HTTPS download helper ───────────────────────────────────────────
function downloadBuffer(url) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            headers: { 'User-Agent': USER_AGENT }
        };
        https.get(options, (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                return downloadBuffer(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

// ─── Unzip buffer and extract CSV text ───────────────────────────────
function unzipBuffer(buf) {
    return new Promise((resolve, reject) => {
        const AdmZip = require('adm-zip');
        try {
            const zip = new AdmZip(buf);
            const entries = zip.getEntries();
            const csvEntry = entries.find(e => e.entryName.endsWith('.csv'));
            if (!csvEntry) return reject(new Error('No CSV found in ZIP'));
            resolve(csvEntry.getData().toString('utf8'));
        } catch {
            // Fallback: try as raw CSV (not zipped)
            resolve(buf.toString('utf8'));
        }
    });
}

// ─── Parse bhavcopy CSV ──────────────────────────────────────────────
function parseBhavcopy(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const idx = (name) => headers.indexOf(name);

    const iSymbol = idx('TckrSymb');
    const iSeries = idx('SctySrs');
    const iName = idx('FinInstrmNm');
    const iOpen = idx('OpnPric');
    const iHigh = idx('HghPric');
    const iLow = idx('LwPric');
    const iClose = idx('ClsPric');
    const iPrevClose = idx('PrvsClsgPric');
    const iVolume = idx('TtlTradgVol');
    const iDate = idx('TradDt');

    const stocks = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const series = cols[iSeries];
        if (!ALLOWED_SERIES.has(series)) continue;

        const symbol = cols[iSymbol];
        const close = parseFloat(cols[iClose]);
        const high = parseFloat(cols[iHigh]);
        const low = parseFloat(cols[iLow]);
        const open = parseFloat(cols[iOpen]);
        const prevClose = parseFloat(cols[iPrevClose]);
        const volume = parseInt(cols[iVolume]) || 0;
        const tradDate = cols[iDate] || '';
        const name = cols[iName] || symbol;

        if (!symbol || !close || !prevClose) continue;

        const pctChange = ((close - prevClose) / prevClose) * 100;

        stocks.push({
            symbol, series, name, open, high, low, close, prevClose,
            pctChange: Math.round(pctChange * 100) / 100,
            volume, tradDate
        });
    }
    return stocks;
}

// ─── Detect UC stocks from parsed bhavcopy ───────────────────────────
function detectUCStocks(stocks) {
    return stocks.filter(s => {
        // UC condition: High == Close AND %change matches a known band
        if (s.high !== s.close) return false;
        if (s.pctChange <= 1.0) return false;

        for (const { band, tolerance } of UC_BANDS) {
            if (Math.abs(s.pctChange - band) <= tolerance) {
                s.ucBand = band;
                return true;
            }
        }
        return false;
    });
}

// ─── Get last N trading days (skip weekends) ─────────────────────────
function getLastTradingDays(n, fromDate = new Date()) {
    const dates = [];
    const d = new Date(fromDate);
    // Start from yesterday if today's bhavcopy might not be available yet
    // (bhavcopy is typically available after 4:30 PM IST)
    while (dates.length < n) {
        d.setDate(d.getDate() - 1);
        const day = d.getDay();
        if (day !== 0 && day !== 6) { // Skip Sun(0) and Sat(6)
            dates.push(formatDate(d));
        }
    }
    return dates;
}

function formatDate(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
}

function formatDateReadable(yyyymmdd) {
    const y = yyyymmdd.substring(0, 4);
    const m = yyyymmdd.substring(4, 6);
    const d = yyyymmdd.substring(6, 8);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

// ─── Download and cache bhavcopy for a date ──────────────────────────
async function downloadAndParseBhavcopy(dateStr) {
    const url = `https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${dateStr}_F_0000.csv.zip`;
    console.log(`📥 Downloading bhavcopy for ${dateStr}...`);
    const buf = await downloadBuffer(url);
    const csv = await unzipBuffer(buf);
    return parseBhavcopy(csv);
}

// Get UC-only cache (for the main screener)
async function getBhavcopyForDate(dateStr) {
    const cacheFile = path.join(DATA_DIR, `bhav_${dateStr}.json`);

    if (fs.existsSync(cacheFile)) {
        return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    }

    try {
        const allStocks = await downloadAndParseBhavcopy(dateStr);
        const ucStocks = detectUCStocks(allStocks);

        const result = {
            date: dateStr,
            dateReadable: formatDateReadable(dateStr),
            totalStocks: allStocks.length,
            ucStocks: ucStocks,
            fetchedAt: new Date().toISOString()
        };

        // Cache UC data
        fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
        // Cache full data (for stock history lookups)
        const fullCacheFile = path.join(DATA_DIR, `full_${dateStr}.json`);
        if (!fs.existsSync(fullCacheFile)) {
            fs.writeFileSync(fullCacheFile, JSON.stringify(allStocks));
        }
        console.log(`✅ ${dateStr}: ${ucStocks.length} UC stocks found (out of ${allStocks.length} total)`);
        return result;

    } catch (err) {
        console.error(`❌ Failed to fetch bhavcopy for ${dateStr}:`, err.message);
        return null;
    }
}

// Get full stock data for a date (for per-symbol history)
async function getFullBhavcopyForDate(dateStr) {
    const fullCacheFile = path.join(DATA_DIR, `full_${dateStr}.json`);

    if (fs.existsSync(fullCacheFile)) {
        return JSON.parse(fs.readFileSync(fullCacheFile, 'utf8'));
    }

    try {
        const allStocks = await downloadAndParseBhavcopy(dateStr);
        fs.writeFileSync(fullCacheFile, JSON.stringify(allStocks));
        // Also generate UC cache if missing
        const ucCacheFile = path.join(DATA_DIR, `bhav_${dateStr}.json`);
        if (!fs.existsSync(ucCacheFile)) {
            const ucStocks = detectUCStocks(allStocks);
            fs.writeFileSync(ucCacheFile, JSON.stringify({
                date: dateStr, dateReadable: formatDateReadable(dateStr),
                totalStocks: allStocks.length, ucStocks, fetchedAt: new Date().toISOString()
            }, null, 2));
        }
        return allStocks;
    } catch (err) {
        console.error(`❌ Failed to fetch full bhavcopy for ${dateStr}:`, err.message);
        return null;
    }
}

// ─── API: Get UC stocks (Streaming Progress) ───────────────────────────
app.get('/api/uc-stocks/stream', async (req, res) => {
    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
        const NUM_DAYS = 5;
        const sessionData = [];
        const validSessionsInfo = [];
        
        let d = new Date();
        let daysFound = 0;
        let attempts = 0;

        while (daysFound < NUM_DAYS && attempts < 20) {
            d.setDate(d.getDate() - 1);
            attempts++;
            
            const day = d.getDay();
            if (day === 0 || day === 6) continue;
            
            const dateStr = formatDate(d);
            res.write(`data: ${JSON.stringify({ type: 'progress', progress: Math.min((daysFound+1)*15, 90), message: `Checking ${formatDateReadable(dateStr)}` })}\n\n`);
            
            const data = await getBhavcopyForDate(dateStr);
            if (data && data.ucStocks) {
                sessionData.push(data);
                validSessionsInfo.push({ dateReadable: data.dateReadable, ucCount: data.ucStocks.length });
                daysFound++;
            } else {
                console.log(`Skipping ${dateStr}, data missing (possibly a holiday).`);
            }
        }

        console.log(`\n📊 Streaming data for ${daysFound} valid sessions.`);

        res.write(`data: ${JSON.stringify({ type: 'progress', progress: 95, message: 'Processing data...' })}\n\n`);

        if (!sessionData[0] && !sessionData[1]) {
            res.write(`data: ${JSON.stringify({ type: 'error', message: 'Could not fetch bhavcopy data for recent sessions.' })}\n\n`);
            return res.end();
        }

        const allSymbols = new Set();
        sessionData.forEach(d => {
            if (d && d.ucStocks) d.ucStocks.forEach(s => allSymbols.add(s.symbol));
        });

        const stocks = [];
        for (const symbol of allSymbols) {
            let baseData = null;
            const ucDays = [];
            for (let i = 0; i < NUM_DAYS; i++) {
                const sData = sessionData[i]?.ucStocks?.find(x => x.symbol === symbol);
                ucDays.push(!!sData);
                if (sData && !baseData) baseData = sData;
            }

            stocks.push({
                symbol: symbol,
                name: baseData.name,
                series: baseData.series,
                price: baseData.close,
                prevClose: baseData.prevClose,
                open: baseData.open,
                high: baseData.high,
                low: baseData.low,
                changeSession1: sessionData[0]?.ucStocks?.find(x => x.symbol === symbol)?.pctChange || null,
                changeSession2: sessionData[1]?.ucStocks?.find(x => x.symbol === symbol)?.pctChange || null,
                ucBand: baseData.ucBand,
                volume: baseData.volume,
                ucDays: ucDays,
                prevCloseSession2: sessionData[1]?.ucStocks?.find(x => x.symbol === symbol)?.prevClose || null,
                closeSession2: sessionData[1]?.ucStocks?.find(x => x.symbol === symbol)?.close || null
            });
        }

        res.write(`data: ${JSON.stringify({
            type: 'complete',
            data: {
                success: true,
                mode: 'live',
                sessions: validSessionsInfo,
                totalStocks: stocks.length,
                stocks,
                timestamp: new Date().toISOString()
            }
        })}\n\n`);
        res.end();
    } catch (err) {
        console.error('❌ API Error:', err.message);
        res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
        res.end();
    }
});

// ─── API: Stock History (Streaming Progress) ────────────────────────
app.get('/api/stock/:symbol/history/stream', async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    const days = Math.min(parseInt(req.query.days) || 10, 30);

    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Ensure headers are sent immediately

    try {
        const tradingDays = getLastTradingDays(days);
        console.log(`\n📈 Streaming ${days}-day history for ${symbol}...`);

        const history = [];
        
        // Fetch sequentially to report progress accurately
        for (let i = 0; i < tradingDays.length; i++) {
            const dateStr = tradingDays[i];
            const allStocks = await getFullBhavcopyForDate(dateStr);
            
            if (allStocks) {
                const stock = allStocks.find(s => s.symbol === symbol);
                if (stock) {
                    history.push({
                        date: dateStr,
                        dateReadable: formatDateReadable(dateStr),
                        dateShort: formatDateReadable(dateStr).replace(/, \d{4}$/, ''),
                        open: stock.open,
                        high: stock.high,
                        low: stock.low,
                        close: stock.close,
                        prevClose: stock.prevClose,
                        volume: stock.volume,
                        pctChange: stock.pctChange,
                        isUC: stock.high === stock.close && stock.pctChange > 1.5
                    });
                }
            }
            
            // Send progress event
            const progress = Math.round(((i + 1) / tradingDays.length) * 100);
            res.write(`data: ${JSON.stringify({ type: 'progress', progress, date: formatDateReadable(dateStr) })}\n\n`);
        }

        // Sort oldest to newest
        history.sort((a, b) => a.date.localeCompare(b.date));

        const avgVolume = history.length > 0
            ? Math.round(history.reduce((s, h) => s + h.volume, 0) / history.length)
            : 0;

        // Send completion event
        res.write(`data: ${JSON.stringify({ 
            type: 'complete', 
            data: { success: true, symbol, days: history.length, avgVolume, history } 
        })}\n\n`);
        res.end();

    } catch (err) {
        console.error(`❌ Stream error for ${symbol}:`, err.message);
        res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
        res.end();
    }
});

// ─── API: Health ─────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    const cached = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    res.json({
        status: 'ok',
        cachedSessions: cached.map(f => f.replace('bhav_', '').replace('.json', '')),
        dataDir: DATA_DIR
    });
});

// ─── API: Get Stock News ───────────────────────────────────────────
app.get('/api/stock/:symbol/news', async (req, res) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        // Construct Google News RSS URL
        const query = encodeURIComponent(`"${symbol}" NSE stock india`);
        const url = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        
        if (!response.ok) {
            throw new Error(`News fetch failed: HTTP ${response.status}`);
        }
        
        const xml = await response.text();
        
        // Simple regex-based XML parsing for RSS
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
        const linkRegex = /<link>(.*?)<\/link>/;
        const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
        const sourceRegex = /<source[^>]*><!\[CDATA\[(.*?)\]\]><\/source>|<source[^>]*>(.*?)<\/source>/;
        
        let match;
        while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
            const itemBlock = match[1];
            
            const titleMatch = itemBlock.match(titleRegex);
            const linkMatch = itemBlock.match(linkRegex);
            const pubDateMatch = itemBlock.match(pubDateRegex);
            const sourceMatch = itemBlock.match(sourceRegex);
            
            if (titleMatch && linkMatch) {
                // Google News RSS puts title in CDATA or direct text
                const rawTitle = titleMatch[1] || titleMatch[2] || '';
                // Clean up title (Google appends " - Publisher Name" at the end, we can try to strip it if source exists)
                const source = sourceMatch ? (sourceMatch[1] || sourceMatch[2]) : '';
                let title = rawTitle.replace(/ - [^-]+$/, ''); // Naive strip of publisher from end
                
                items.push({
                    title: title.trim(),
                    link: linkMatch[1],
                    pubDate: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
                    source: source || 'News'
                });
            }
        }
        
        res.json({
            success: true,
            symbol,
            news: items
        });
    } catch (err) {
        console.error(`❌ News API Error for ${req.params.symbol}:`, err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ─── API: Momentum Stocks (SSE) ──────────────────────────────────────
app.get('/api/momentum', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
        const NUM_DAYS = 10;
        const tradingDays = getLastTradingDays(NUM_DAYS);
        const allDaysData = []; // oldest first

        // Fetch all 10 days with progress
        for (let i = tradingDays.length - 1; i >= 0; i--) {
            const dateStr = tradingDays[i];
            const stocks = await getFullBhavcopyForDate(dateStr);
            if (stocks) {
                allDaysData.push({ date: dateStr, dateReadable: formatDateReadable(dateStr), stocks });
            }
            const progress = Math.round(((tradingDays.length - i) / tradingDays.length) * 80);
            res.write(`data: ${JSON.stringify({ type: 'progress', progress, message: `Fetching day ${tradingDays.length - i}/${tradingDays.length}...` })}\n\n`);
        }

        if (allDaysData.length < 3) {
            res.write(`data: ${JSON.stringify({ type: 'error', message: 'Not enough trading data available' })}\n\n`);
            return res.end();
        }

        res.write(`data: ${JSON.stringify({ type: 'progress', progress: 85, message: 'Computing momentum scores...' })}\n\n`);

        // Build a map: symbol -> array of daily data (oldest to newest)
        const symbolMap = new Map();
        for (const dayData of allDaysData) {
            for (const stock of dayData.stocks) {
                if (!symbolMap.has(stock.symbol)) {
                    symbolMap.set(stock.symbol, { name: stock.name, series: stock.series, days: [] });
                }
                symbolMap.get(stock.symbol).days.push({
                    date: dayData.date,
                    dateReadable: dayData.dateReadable,
                    open: stock.open, high: stock.high, low: stock.low,
                    close: stock.close, prevClose: stock.prevClose, volume: stock.volume
                });
            }
        }

        // Compute momentum for stocks present in at least 7 of the days
        const MIN_DAYS = 7;
        const MIN_PRICE = 10; // Filter penny stocks
        const momentum = [];

        for (const [symbol, data] of symbolMap) {
            if (data.days.length < MIN_DAYS) continue;

            const days = data.days; // already oldest-first
            const latestClose = days[days.length - 1].close;
            const oldestClose = days[0].close;
            if (latestClose < MIN_PRICE || oldestClose < MIN_PRICE) continue;
            if (!oldestClose || !latestClose) continue;

            // 10-day return
            const return10d = ((latestClose - oldestClose) / oldestClose) * 100;

            // Green days & consecutive green from latest
            let greenDays = 0;
            let consecutiveGreen = 0;
            let countingConsecutive = true;
            for (let i = days.length - 1; i >= 0; i--) {
                const isGreen = days[i].close > days[i].prevClose;
                if (isGreen) {
                    greenDays++;
                    if (countingConsecutive) consecutiveGreen++;
                } else {
                    countingConsecutive = false;
                }
            }
            const consistency = (greenDays / days.length) * 100;

            // Volume surge: avg last 3 / avg first 5
            const recentVols = days.slice(-3).map(d => d.volume);
            const olderVols = days.slice(0, Math.min(5, days.length - 3)).map(d => d.volume);
            const avgRecent = recentVols.reduce((a, b) => a + b, 0) / recentVols.length;
            const avgOlder = olderVols.length > 0 ? olderVols.reduce((a, b) => a + b, 0) / olderVols.length : avgRecent;
            const volumeSurge = avgOlder > 0 ? avgRecent / avgOlder : 1;

            // Momentum Score (0-100)
            const returnScore = Math.min(Math.max(return10d * 2, 0), 100); // 50% return = 100 score
            const greenScore = (consecutiveGreen / days.length) * 100;
            const volScore = Math.min(volumeSurge * 33, 100); // 3x surge = 100
            const consistScore = consistency;

            const momentumScore = Math.round(
                returnScore * 0.4 + greenScore * 0.2 + volScore * 0.2 + consistScore * 0.2
            );

            // Only include stocks with positive momentum
            if (return10d <= 0) continue;

            const sparkPrices = days.map(d => d.close);

            // 10-day High/Low for Swing Trading Support/Resistance
            const high10d = Math.max(...days.map(d => d.high));
            const low10d = Math.min(...days.map(d => d.low));

            momentum.push({
                symbol, name: data.name, series: data.series,
                latestClose: Math.round(latestClose * 100) / 100,
                return10d: Math.round(return10d * 100) / 100,
                greenDays, consecutiveGreen,
                totalDays: days.length,
                consistency: Math.round(consistency),
                volumeSurge: Math.round(volumeSurge * 100) / 100,
                momentumScore: Math.min(momentumScore, 100),
                high10d: Math.round(high10d * 100) / 100,
                low10d: Math.round(low10d * 100) / 100,
                sparkPrices
            });
        }

        // Sort by momentum score descending, take top 50
        momentum.sort((a, b) => b.momentumScore - a.momentumScore);
        const top50 = momentum.slice(0, 50);

        res.write(`data: ${JSON.stringify({ type: 'progress', progress: 100, message: 'Done!' })}\n\n`);
        res.write(`data: ${JSON.stringify({
            type: 'complete',
            data: {
                success: true,
                totalAnalyzed: symbolMap.size,
                daysUsed: allDaysData.length,
                dateRange: `${allDaysData[0].dateReadable} → ${allDaysData[allDaysData.length - 1].dateReadable}`,
                stocks: top50
            }
        })}\n\n`);
        res.end();

    } catch (err) {
        console.error('❌ Momentum API error:', err.message);
        res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
        res.end();
    }
});

// ─── IPO API Cache ─────────────────────────────────────────────────────
let ipoCache = { data: null, timestamp: 0 };
const IPO_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function fetchIPODetails(url, priceBandStr, gmpStr) {
    try {
        if (!url || !url.startsWith('http')) return { pe: 'N/A', postPe: 'N/A', peerPe: 'N/A' };
        const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
        if (!response.ok) return { pe: 'N/A', postPe: 'N/A', peerPe: 'N/A' };
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        let pe = 'N/A';
        let postPe = 'N/A';
        let peerPe = 'N/A';
        let eps = null;
        
        // 1. Look for KPI table for PE Ratio & EPS
        $('table').each((i, table) => {
            $(table).find('tr').each((j, row) => {
                const text = $(row).text().replace(/\n/g, ' ').trim().toLowerCase();
                
                if (text.includes('p/e ratio') || text.includes('pe ratio')) {
                    const val = $(row).find('td').last().text().trim();
                    if (val && !text.includes('company')) { // avoid header rows
                        pe = val;
                    }
                }
                
                if (text.includes('earning per share') || text.includes('eps')) {
                    const val = $(row).find('td').last().text().trim();
                    if(val && !text.includes('company') && val.match(/[\d.]+/)) {
                        eps = parseFloat(val.match(/[\d.]+/)[0]);
                    }
                }
            });
        });

        // Mandatory Calculation Check:
        if ((pe === 'N/A' || !pe || pe.toLowerCase() === 'na') && eps && priceBandStr) {
            // Extract the highest numerical price from the priceBand string (e.g., "₹66 to ₹70" -> 70)
            const matches = priceBandStr.match(/\d+/g);
            if (matches && eps > 0) {
                const maxPrice = Math.max(...matches.map(Number));
                pe = (maxPrice / eps).toFixed(2);
                
                // Calculate Post-IPO PE using GMP
                const gmpMatch = gmpStr ? gmpStr.match(/-?\d+/) : null;
                const gmpVal = gmpMatch ? parseInt(gmpMatch[0]) : 0;
                postPe = ((maxPrice + gmpVal) / eps).toFixed(2);
            }
        }

        // 2. Look for Listed Peers table for Peer PE
        let foundPeers = false;
        $('table').each((i, table) => {
            const tableText = $(table).text().toLowerCase();
            if (tableText.includes('peer') || tableText.includes('listed peer') || tableText.includes('company')) {
                // Find column index for PE
                let peColIdx = -1;
                $(table).find('tr').first().find('th, td').each((j, cell) => {
                    const header = $(cell).text().toLowerCase();
                    if (header.includes('p/e') || header.includes('pe ratio') || header === 'pe') {
                        peColIdx = j;
                    }
                });
                
                if (peColIdx > -1) {
                    // Get the first peer's PE (2nd row)
                    const peerRow = $(table).find('tr').eq(1);
                    if (peerRow) {
                        const cellText = peerRow.find('td, th').eq(peColIdx).text().trim();
                        if (cellText && cellText !== '-') {
                            peerPe = cellText;
                            foundPeers = true;
                        }
                    }
                }
            }
        });

        return { pe, postPe, peerPe };
    } catch (e) {
        return { pe: 'N/A', postPe: 'N/A', peerPe: 'N/A' };
    }
}

// ─── API: IPO GMP Dashboard ──────────────────────────────────────────
app.get('/api/ipos', async (req, res) => {
    try {
        if (ipoCache.data && (Date.now() - ipoCache.timestamp < IPO_CACHE_TTL)) {
            console.log('⚡ Serving IPOs from cache');
            return res.json(ipoCache.data);
        }

        const response = await fetch('https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/', {
            headers: { 'User-Agent': USER_AGENT }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const ipos = [];
        $('table').first().find('tr').each((i, el) => {
            if (i > 0) { // skip header
                const tds = $(el).find('td');
                if (tds.length >= 7) {
                    const nameEl = $(tds[0]).find('a');
                    const link = nameEl.attr('href');
                    const name = nameEl.text().trim() || $(tds[0]).text().trim();
                    const gmp = $(tds[1]).text().trim();
                    const trend = $(tds[2]).text().trim();
                    const priceBand = $(tds[3]).text().trim();
                    const estListing = $(tds[4]).text().trim();
                    const dates = $(tds[5]).text().trim();
                    const status = $(tds[6]).text().trim();
                    const lastUpdated = $(tds[7]) ? $(tds[7]).text().trim() : '';
                    
                    if (name) {
                        ipos.push({ name, link, gmp, trend, priceBand, estListing, dates, status, lastUpdated });
                    }
                }
            }
        });

        console.log(`📥 Fetching details for ${ipos.length} IPOs concurrently...`);
        // Concurrently fetch details for all IPOs to get PE info
        await Promise.all(ipos.map(async (ipo) => {
            const details = await fetchIPODetails(ipo.link, ipo.priceBand, ipo.gmp);
            ipo.pe = details.pe;
            ipo.postPe = details.postPe;
            ipo.peerPe = details.peerPe;
        }));
        
        const result = { success: true, count: ipos.length, ipos };
        ipoCache = { data: result, timestamp: Date.now() };
        
        res.json(result);
    } catch (err) {
        console.error('❌ Failed to fetch IPOs:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/ipo/history', async (req, res) => {
    try {
        let targetUrl = req.query.url;
        if (!targetUrl || !targetUrl.includes('ipowatch.in')) {
            return res.status(400).json({ success: false, error: 'Invalid IPO URL' });
        }
        
        // 1. Fetch main IPO page to find the GMP specific page link
        let response = await fetch(targetUrl, {
            headers: { 'User-Agent': USER_AGENT }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        let html = await response.text();
        let $ = cheerio.load(html);
        
        let gmpUrl = '';
        $('a').each((i, el) => {
            const text = $(el).text().trim().toLowerCase();
            const href = $(el).attr('href');
            if (text === 'gmp' || text.includes('grey market premium')) {
                if (href && href.includes('ipowatch.in')) {
                    gmpUrl = href;
                }
            }
        });
        
        if (gmpUrl) {
            // 2. Fetch the GMP specific page
            response = await fetch(gmpUrl, { headers: { 'User-Agent': USER_AGENT } });
            if (response.ok) {
                html = await response.text();
                $ = cheerio.load(html);
            }
        }
        
        const history = [];
        $('table').each((index, table) => {
            const firstRowText = $(table).find('tr').first().text().toLowerCase();
            if (firstRowText.includes('gmp') && firstRowText.includes('date')) {
                $(table).find('tr').each((i, el) => {
                    if (i > 0) { // skip header
                        const tds = $(el).find('td');
                        if (tds.length >= 4) {
                            history.push({
                                date: $(tds[0]).text().trim(),
                                price: $(tds[1]).text().trim(),
                                gmp: $(tds[2]).text().trim(), // This is actually Trend in rentomojo? Let's check format
                                subTte: $(tds[3]).text().trim(),
                                estListing: $(tds[4]) ? $(tds[4]).text().trim() : ''
                            });
                        }
                    }
                });
            }
        });
        
        res.json({ success: true, url: targetUrl, history });
    } catch (err) {
        console.error('❌ Failed to fetch IPO History:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── API: Deep Scan (Heuristic AI) ───────────────────────────────────────────
app.post('/api/analyze-uc', async (req, res) => {
    try {
        const { symbols } = req.body;
        if (!symbols || !Array.isArray(symbols)) return res.status(400).json({ error: 'symbols array required' });

        const results = {};
        
        // Process concurrently
        await Promise.all(symbols.map(async (symbol) => {
            try {
                const url = `https://news.google.com/rss/search?q=${encodeURIComponent(symbol)}+stock+india&hl=en-IN&gl=IN&ceid=IN:en`;
                const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
                const xml = await response.text();
                
                // Very basic XML parsing using Regex
                const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)].map(m => m[1]);
                // Shift first title because it's the RSS channel title
                titles.shift();
                
                const topNews = titles.slice(0, 3).map(title => {
                    // Clean HTML entities
                    return title.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#8211;/g, '-').replace(/&#8216;/g, "'").replace(/&#8217;/g, "'");
                });

                // Heuristic Engine
                let score = 0;
                const posWords = ['profit', 'growth', 'order', 'contract', 'jump', 'surge', 'buy', 'positive', 'approval', 'dividend', 'bonus', 'soar', 'target', 'upgrade', 'fund'];
                const negWords = ['loss', 'drop', 'plunge', 'fraud', 'probe', 'fine', 'reject', 'down', 'weak', 'sell', 'penalty', 'downgrade', 'crash', 'sebi', 'warning'];

                const textToAnalyze = topNews.join(' ').toLowerCase();
                
                posWords.forEach(w => { if (textToAnalyze.includes(w)) score += 1; });
                negWords.forEach(w => { if (textToAnalyze.includes(w)) score -= 1.5; }); // Negative news weighs more

                let rating = 'B'; // Neutral
                let badgeColor = '#3b82f6'; // Blue
                let summary = "Neutral signals. Standard momentum.";
                
                if (score >= 2) { 
                    rating = 'A+'; 
                    badgeColor = '#10b981'; // Green 
                    summary = "Strong positive catalysts detected!";
                } else if (score >= 1) { 
                    rating = 'A'; 
                    badgeColor = '#10b981'; 
                    summary = "Favorable news coverage.";
                } else if (score <= -1.5) { 
                    rating = 'C'; 
                    badgeColor = '#ef4444'; // Red
                    summary = "Warning: Negative sentiment detected.";
                } else if (score <= -0.5) {
                    rating = 'B-';
                    badgeColor = '#f59e0b'; // Orange
                    summary = "Mixed/Slightly negative sentiment.";
                }

                results[symbol] = {
                    rating,
                    badgeColor,
                    summary,
                    news: topNews
                };
            } catch (e) {
                console.error(`Failed to analyze ${symbol}:`, e.message);
                results[symbol] = { rating: 'N/A', badgeColor: '#6b7280', summary: 'Analysis failed.', news: [] };
            }
        }));

        res.json({ success: true, analysis: results });
    } catch (err) {
        console.error('❌ Deep Scan Failed:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── Start Server ───────────────────────────────────────────────────────────
app.listen(PORT, async () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║         🚀 UC Scanner - Live Server              ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Dashboard:  http://localhost:${PORT}                 ║`);
    console.log(`║  API:        http://localhost:${PORT}/api/uc-stocks    ║`);
    console.log('║  Source:     NSE Bhavcopy (EOD data)              ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    // Pre-fetch last 2 sessions
    const days = getLastTradingDays(2);
    for (const d of days) {
        await getBhavcopyForDate(d).catch(e => console.log(`⚠️ Pre-fetch ${d}: ${e.message}`));
    }
    console.log('\n✅ Ready! Open http://localhost:3000 in your browser.\n');
});
