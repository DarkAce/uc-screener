const http = require('http');

function fetchJson(path) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:3000${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, json: JSON.parse(data) });
                } catch (e) {
                    reject(new Error(`Failed to parse JSON: ${data}`));
                }
            });
        }).on('error', reject);
    });
}

async function runTests() {
    console.log('--- Starting Backend Tests ---');
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
        // Test 1: Health Check
        const health = await fetchJson('/api/health');
        assert(health.status === 200 && health.json.status === 'ok', 'Health endpoint returns 200 OK');

        // Test 2: Main UC Stocks Endpoint
        const ucStocks = await fetchJson('/api/uc-stocks');
        assert(ucStocks.status === 200 && ucStocks.json.success === true, 'UC stocks endpoint returns 200 OK and success=true');
        assert(Array.isArray(ucStocks.json.stocks), 'UC stocks response contains a stocks array');
        assert(ucStocks.json.stocks.length > 0, 'UC stocks array is not empty (assuming data exists)');
        
        // Find a symbol to test history
        const testSymbol = ucStocks.json.stocks[0]?.symbol || 'RELIANCE';

        // Test 3: History Endpoint (Valid Symbol)
        const history = await fetchJson(`/api/stock/${testSymbol}/history?days=5`);
        assert(history.status === 200 && history.json.success === true, `History endpoint for ${testSymbol} returns 200 OK`);
        assert(Array.isArray(history.json.history), 'History response contains a history array');
        assert(history.json.history.length > 0 && history.json.history.length <= 5, 'History array length is correct');

        // Test 4: History Endpoint (Invalid Symbol)
        const invalidHistory = await fetchJson(`/api/stock/INVALID_SYMBOL_123/history`);
        assert(invalidHistory.status === 200 && invalidHistory.json.history.length === 0, 'History endpoint for invalid symbol returns empty array gracefully');

    } catch (e) {
        console.error('Test Execution Failed:', e.message);
    }

    console.log(`--- Test Summary: ${passed} Passed, ${failed} Failed ---`);
}

runTests();
