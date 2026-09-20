const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3001; // Run tests on different port to avoid conflicts
const BASE_URL = `http://localhost:${PORT}`;

function fetchJson(method, endpoint, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            method,
            hostname: 'localhost',
            port: PORT,
            path: endpoint,
            headers: {}
        };
        if (body) {
            const data = JSON.stringify(body);
            options.headers['Content-Type'] = 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(data);
        }
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, json: data ? JSON.parse(data) : null });
                } catch (e) {
                    reject(new Error(`Failed to parse JSON: ${data}`));
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
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
        stdio: ['ignore', 'ignore', 'inherit'] // ignore stdout so it doesn't pollute test logs
    });
    
    // Wait for server to boot up
    let up = false;
    for (let i=0; i<10; i++) {
        await sleep(500);
        try {
            await fetchJson('GET', '/api/portfolio');
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
        
        // --- Test 1: Reset Portfolio ---
        const reset = await fetchJson('POST', '/api/portfolio/reset');
        assert(reset.status === 200 && reset.json.success === true, 'Reset portfolio returns 200 OK');
        assert(reset.json.portfolio.cash === 1000000, 'Initial cash is ₹10,00,000');
        assert(Object.keys(reset.json.portfolio.holdings).length === 0, 'Initial holdings are empty');
        
        // --- Test 2: Valid BUY order ---
        const buy1 = await fetchJson('POST', '/api/portfolio/trade', {
            symbol: 'SUZLON', name: 'Suzlon Energy', action: 'BUY', quantity: 100, price: 45.50
        });
        assert(buy1.status === 200 && buy1.json.success === true, 'Buy order successful');
        assert(buy1.json.portfolio.cash === (1000000 - 4550), 'Cash deducted correctly (1000000 - 4550)');
        assert(buy1.json.portfolio.holdings['SUZLON'].quantity === 100, 'Holdings updated with 100 qty');
        assert(buy1.json.portfolio.holdings['SUZLON'].avgPrice === 45.50, 'Average price is correct');
        
        // --- Test 3: Average Price calculation on second BUY ---
        const buy2 = await fetchJson('POST', '/api/portfolio/trade', {
            symbol: 'SUZLON', name: 'Suzlon Energy', action: 'BUY', quantity: 100, price: 47.50
        });
        assert(buy2.status === 200, 'Second buy order successful');
        assert(buy2.json.portfolio.holdings['SUZLON'].quantity === 200, 'Holdings updated to 200 qty');
        assert(buy2.json.portfolio.holdings['SUZLON'].avgPrice === 46.50, 'Average price correctly recalculated to 46.50');
        
        // --- Test 4: Valid SELL order (partial) ---
        const sell1 = await fetchJson('POST', '/api/portfolio/trade', {
            symbol: 'SUZLON', name: 'Suzlon Energy', action: 'SELL', quantity: 50, price: 50.00
        });
        assert(sell1.status === 200, 'Partial sell order successful');
        assert(sell1.json.portfolio.holdings['SUZLON'].quantity === 150, 'Holdings reduced to 150');
        const expectedCash = (1000000 - (200 * 46.50)) + (50 * 50.00);
        assert(sell1.json.portfolio.cash === expectedCash, 'Cash credited correctly after sell');
        
        // --- Test 5: Full SELL order (closing position) ---
        const sell2 = await fetchJson('POST', '/api/portfolio/trade', {
            symbol: 'SUZLON', name: 'Suzlon Energy', action: 'SELL', quantity: 150, price: 50.00
        });
        assert(sell2.status === 200, 'Full sell order successful');
        assert(!sell2.json.portfolio.holdings['SUZLON'], 'Holding removed completely after full sell');
        
        // --- Test 6: Invalid inputs ---
        const badQty = await fetchJson('POST', '/api/portfolio/trade', {
            symbol: 'RELIANCE', action: 'BUY', quantity: -10, price: 100
        });
        assert(badQty.status === 400, 'Negative quantity rejected');
        
        const missingFields = await fetchJson('POST', '/api/portfolio/trade', {
            action: 'BUY', quantity: 10
        });
        assert(missingFields.status === 400, 'Missing fields rejected');
        
        // --- Test 7: Insufficient Cash ---
        const brokeBuy = await fetchJson('POST', '/api/portfolio/trade', {
            symbol: 'MRF', name: 'MRF', action: 'BUY', quantity: 100, price: 150000
        });
        assert(brokeBuy.status === 400 && brokeBuy.json.error === 'Insufficient cash', 'Insufficient cash rejected');
        
        // --- Test 8: Insufficient Holdings ---
        const shortSell = await fetchJson('POST', '/api/portfolio/trade', {
            symbol: 'HDFCBANK', name: 'HDFC', action: 'SELL', quantity: 10, price: 1500
        });
        assert(shortSell.status === 400 && shortSell.json.error === 'Insufficient holdings', 'Selling unowned stock rejected');
        
    } catch (e) {
        console.error('Test Execution Failed:', e);
        failed++;
    } finally {
        stopServer();
    }

    console.log(`\n--- Test Summary: ${passed} Passed, ${failed} Failed ---`);
    if (failed > 0) process.exit(1);
}

runTests();
