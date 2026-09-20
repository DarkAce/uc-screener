const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const PORT = 3002;
const BASE_URL = `http://localhost:${PORT}`;

function fetchJson(path) {
    return new Promise((resolve, reject) => {
        http.get(`${BASE_URL}${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, json: data ? JSON.parse(data) : null });
                } catch (e) {
                    reject(new Error(`Failed to parse JSON: ${data}`));
                }
            });
        }).on('error', reject);
    });
}

function fetchSSE(path) {
    return new Promise((resolve, reject) => {
        http.get(`${BASE_URL}${path}`, (res) => {
            let data = '';
            let finalPayload = null;
            res.on('data', chunk => {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const parsed = JSON.parse(line.substring(6));
                            if (parsed.type === 'complete') {
                                finalPayload = parsed.data;
                            } else if (parsed.type === 'error') {
                                reject(new Error(parsed.message));
                            }
                        } catch(e) {}
                    }
                }
            });
            res.on('end', () => {
                if (finalPayload) resolve(finalPayload);
                else reject(new Error('No complete event received in SSE'));
            });
        }).on('error', reject);
    });
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

let serverProcess;

async function startServer() {
    console.log('--- Starting Test Server ---');
    serverProcess = spawn('node', ['server.js'], {
        env: { ...process.env, PORT: PORT },
        stdio: ['ignore', 'ignore', 'inherit']
    });
    
    // Wait for server to boot up
    let up = false;
    for (let i=0; i<10; i++) {
        await sleep(500);
        try {
            await fetchJson('/api/portfolio');
            up = true;
            break;
        } catch (e) {}
    }
    if (!up) throw new Error('Server failed to start');
}

function stopServer() {
    if (serverProcess) serverProcess.kill();
}

async function runTests() {
    let passed = 0;
    let failed = 0;

    const assert = (condition, msg) => {
        if (condition) {
            console.log(`✅ PASS: ${msg}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${msg}`);
            failed++;
        }
    };

    try {
        await startServer();
        
        console.log('\n[1] Testing Upper Circuit Logic...');
        const ucData = await fetchSSE('/api/uc-stocks/stream');
        if (!ucData || !ucData.stocks) {
            throw new Error('Failed to fetch UC stocks stream');
        }
        
        const ucStocks = ucData.stocks;
        let allHighEqualsClose = true;
        let allValidBands = true;
        
        // Allowed bands: 2, 5, 10, 20
        // tolerance logic from server.js
        for (const stock of ucStocks) {
            if (stock.high !== stock.price) {
                console.error(`High != Price for ${stock.symbol}: High=${stock.high}, Price=${stock.price}`);
                allHighEqualsClose = false;
            }
            
            const pct = stock.pctChange;
            
            // Check if it fits within one of the bands
            let fits = false;
            if (Math.abs(pct - 2) <= 0.12) fits = true;
            if (Math.abs(pct - 5) <= 0.15) fits = true;
            if (Math.abs(pct - 10) <= 0.25) fits = true;
            if (Math.abs(pct - 20) <= 0.40) fits = true;
            if (!fits) {
                console.error(`Invalid Band: ${stock.symbol} ${pct}%`);
                allValidBands = false;
            }
        }
        
        assert(allHighEqualsClose, 'Mathematical check: Every UC stock has HIGH == CLOSE');
        assert(allValidBands, 'Mathematical check: Every UC stock fits strict 2/5/10/20% tolerance bands');
        
        console.log('\n[2] Testing Momentum Algorithm...');
        const momentumData = await fetchSSE('/api/momentum');
        const momentumStocks = momentumData.stocks;
        
        assert(momentumStocks.length <= 50, 'Momentum endpoint returns max 50 stocks');
        
        let sortedCorrectly = true;
        for (let i = 0; i < momentumStocks.length - 1; i++) {
            if (momentumStocks[i].momentumScore < momentumStocks[i+1].momentumScore) {
                sortedCorrectly = false;
            }
        }
        assert(sortedCorrectly, 'Momentum list is strictly sorted descending by momentumScore');
        
        let noPennyStocks = true;
        let noNegativeReturns = true;
        for (const stock of momentumStocks) {
            if (stock.latestClose < 10) noPennyStocks = false;
            if (stock.return10d <= 0) noNegativeReturns = false;
        }
        
        assert(noPennyStocks, 'No penny stocks (<₹10) found in momentum list');
        assert(noNegativeReturns, 'No stocks with negative 10-day returns found in momentum list');
        
    } catch (e) {
        console.error('Test Execution Failed:', e);
        failed++;
    } finally {
        stopServer();
    }

    console.log(`\n--- Deep Test Summary: ${passed} Passed, ${failed} Failed ---`);
    if (failed > 0) process.exit(1);
}

runTests();
