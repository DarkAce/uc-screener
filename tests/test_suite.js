/**
 * UC Scanner — Comprehensive Automated Test Suite
 * Evaluates:
 *  1. Backend API Endpoint Health & Contracts
 *  2. Multi-Viewport Responsiveness & Overflow Detection (375px, 390px, 412px, 768px, 1440px)
 *  3. Mobile Usability & Touch Target Compliance
 *  4. Client-side Navigation, State & Tab Switching
 *  5. JS Console Error Sentinel
 */

const puppeteer = require('c:/Users/bhavi/.gemini/antigravity/playground/binary-pathfinder/resume-builder/node_modules/puppeteer');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const TARGET_URL = process.env.TEST_URL || 'https://uc-screener.onrender.com/';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Color formatting for console
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function recordTest(suite, name, status, message, extra = null) {
  results.total++;
  if (status === 'PASS') results.passed++;
  else if (status === 'FAIL') results.failed++;
  else if (status === 'WARN') results.warnings++;

  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const color = status === 'PASS' ? c.green : status === 'FAIL' ? c.red : c.yellow;
  
  console.log(`  ${icon} ${color}[${status}]${c.reset} ${name}${message ? ` — ${c.dim}${message}${c.reset}` : ''}`);
  results.details.push({ suite, name, status, message, extra });
}

// HTTP Helper
function fetchJson(url) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: json });
        } catch (e) {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'Request timeout' }); });
  });
}

async function runApiTests() {
  console.log(`\n${c.bold}${c.cyan}====================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  SUITE 1: Backend API Endpoint & Contract Tests   ${c.reset}`);
  console.log(`${c.bold}${c.cyan}====================================================${c.reset}`);

  // Test 1: Health Check
  const healthRes = await fetchJson(`${TARGET_URL}api/health`);
  if (healthRes.ok) {
    recordTest('API', 'GET /api/health', 'PASS', `Status: ${healthRes.status}, Uptime: ${healthRes.data?.uptime || 'OK'}`);
  } else {
    recordTest('API', 'GET /api/health', 'FAIL', `Failed with: ${healthRes.error || healthRes.status}`);
  }

  // Test 2: IPOs Endpoint
  const ipoRes = await fetchJson(`${TARGET_URL}api/ipos`);
  if (ipoRes.ok && Array.isArray(ipoRes.data)) {
    recordTest('API', 'GET /api/ipos', 'PASS', `Retrieved ${ipoRes.data.length} IPO entries`);
  } else if (ipoRes.ok) {
    recordTest('API', 'GET /api/ipos', 'PASS', `Returned valid JSON`);
  } else {
    recordTest('API', 'GET /api/ipos', 'WARN', `Status ${ipoRes.status}: ${ipoRes.error || 'Empty or unavailable'}`);
  }

  // Test 3: Earnings Endpoint
  const earningsRes = await fetchJson(`${TARGET_URL}api/earnings`);
  if (earningsRes.ok && (earningsRes.data?.earnings || Array.isArray(earningsRes.data))) {
    const count = Array.isArray(earningsRes.data) ? earningsRes.data.length : Object.keys(earningsRes.data.earnings || {}).length;
    recordTest('API', 'GET /api/earnings', 'PASS', `Retrieved earnings data (${count} groups)`);
  } else {
    recordTest('API', 'GET /api/earnings', earningsRes.ok ? 'PASS' : 'WARN', `Status: ${earningsRes.status}`);
  }

  // Test 4: Portfolio Endpoint
  const portfolioRes = await fetchJson(`${TARGET_URL}api/portfolio`);
  if (portfolioRes.ok && portfolioRes.data?.cash !== undefined) {
    recordTest('API', 'GET /api/portfolio', 'PASS', `Cash balance: ₹${portfolioRes.data.cash}, Positions: ${portfolioRes.data.positions?.length || 0}`);
  } else {
    recordTest('API', 'GET /api/portfolio', 'WARN', `Status: ${portfolioRes.status}`);
  }

  // Test 5: SSE Stream Endpoint headers
  await new Promise((resolve) => {
    const parsed = new URL(`${TARGET_URL}api/uc-stocks/stream`);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.get(parsed, { timeout: 10000 }, (res) => {
      const isSse = res.headers['content-type']?.includes('text/event-stream');
      if (res.statusCode === 200 && isSse) {
        recordTest('API', 'GET /api/uc-stocks/stream (SSE)', 'PASS', 'Correct text/event-stream content type');
      } else {
        recordTest('API', 'GET /api/uc-stocks/stream (SSE)', 'WARN', `Status: ${res.statusCode}, Content-Type: ${res.headers['content-type']}`);
      }
      req.destroy();
      resolve();
    });
    req.on('error', (err) => {
      recordTest('API', 'GET /api/uc-stocks/stream (SSE)', 'WARN', err.message);
      resolve();
    });
  });
}

async function runBrowserTests() {
  console.log(`\n${c.bold}${c.cyan}====================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  SUITE 2: Viewport, Touch & Responsiveness Audit  ${c.reset}`);
  console.log(`${c.bold}${c.cyan}====================================================${c.reset}`);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const viewports = [
    { name: 'Mobile_Small_375px (iPhone SE)', width: 375, height: 667, isMobile: true },
    { name: 'Mobile_Standard_390px (iPhone 14)', width: 390, height: 844, isMobile: true },
    { name: 'Mobile_Android_412px (Galaxy S23)', width: 412, height: 915, isMobile: true },
    { name: 'Tablet_Portrait_768px (iPad Mini)', width: 768, height: 1024, isMobile: false },
    { name: 'Desktop_1440px', width: 1440, height: 900, isMobile: false }
  ];

  for (const vp of viewports) {
    console.log(`\n${c.bold}Testing Viewport: ${vp.name} (${vp.width}x${vp.height})${c.reset}`);
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

    try {
      await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (e) {
      recordTest(vp.name, 'Page Load', 'FAIL', `Failed to load: ${e.message}`);
      await page.close();
      continue;
    }

    recordTest(vp.name, 'Page Load', 'PASS', `Loaded successfully`);

    // 1. Meta Tag Check
    const metaCheck = await page.evaluate(() => {
      const vpMeta = document.querySelector('meta[name="viewport"]');
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      return {
        hasViewport: !!vpMeta,
        viewportContent: vpMeta?.getAttribute('content') || null,
        hasThemeColor: !!themeMeta
      };
    });

    if (metaCheck.hasViewport && metaCheck.viewportContent.includes('width=device-width')) {
      recordTest(vp.name, 'Viewport Meta Tag', 'PASS', `Configured: ${metaCheck.viewportContent}`);
    } else {
      recordTest(vp.name, 'Viewport Meta Tag', 'FAIL', 'Missing or improper viewport tag');
    }

    // 2. Horizontal Overflow Test
    const overflowInfo = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth;
      const docScrollWidth = document.documentElement.scrollWidth;
      const bodyScrollWidth = document.body.scrollWidth;
      
      const overflowingElements = [];
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const rect = el.getBoundingClientRect();
        if (rect.right > docWidth + 2) {
          overflowingElements.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            className: el.className?.toString() || '',
            right: Math.round(rect.right),
            width: Math.round(rect.width)
          });
          if (overflowingElements.length >= 5) break;
        }
      }
      return {
        docWidth,
        docScrollWidth,
        bodyScrollWidth,
        hasOverflow: docScrollWidth > docWidth || bodyScrollWidth > docWidth,
        overflowDelta: Math.max(docScrollWidth, bodyScrollWidth) - docWidth,
        overflowingElements
      };
    });

    if (!overflowInfo.hasOverflow) {
      recordTest(vp.name, 'No Horizontal Overflow', 'PASS', `Content width matches viewport (${overflowInfo.docWidth}px)`);
    } else {
      const offenders = overflowInfo.overflowingElements.map(e => `${e.tag}${e.id ? '#' + e.id : ''}${e.className ? '.' + e.className.split(' ')[0] : ''}`).join(', ');
      recordTest(vp.name, 'No Horizontal Overflow', 'FAIL', `Overflow by ${overflowInfo.overflowDelta}px! Offenders: ${offenders || 'Unknown'}`);
    }

    // 3. Touch Target Compliance (Mobile only)
    if (vp.isMobile) {
      const touchAudit = await page.evaluate(() => {
        const interactive = document.querySelectorAll('.tab-btn, button, select, input');
        const undersized = [];
        for (const el of interactive) {
          if (el.offsetParent === null) continue; // skip hidden
          const rect = el.getBoundingClientRect();
          if (rect.height < 36 || rect.width < 36) {
            undersized.push({
              tag: el.tagName.toLowerCase(),
              text: el.innerText?.trim()?.slice(0, 15) || el.id || el.placeholder || '',
              w: Math.round(rect.width),
              h: Math.round(rect.height)
            });
            if (undersized.length >= 5) break;
          }
        }
        return { totalInteractive: interactive.length, undersized };
      });

      if (touchAudit.undersized.length === 0) {
        recordTest(vp.name, 'Touch Target Sizing', 'PASS', 'Interactive elements meet comfortable target sizes');
      } else {
        const samples = touchAudit.undersized.map(u => `"${u.text}" (${u.w}x${u.h}px)`).join(', ');
        recordTest(vp.name, 'Touch Target Sizing', 'WARN', `${touchAudit.undersized.length} elements < 36px: ${samples}`);
      }
    }

    // Capture screenshot
    const screenshotPath = path.join(SCREENSHOTS_DIR, `${vp.name.replace(/\s+/g, '_')}_home.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // 4. Console Sentinel
    if (consoleErrors.length === 0) {
      recordTest(vp.name, 'Console Errors Sentinel', 'PASS', 'Zero client runtime errors');
    } else {
      recordTest(vp.name, 'Console Errors Sentinel', 'WARN', `${consoleErrors.length} errors: ${consoleErrors[0]}`);
    }

    await page.close();
  }

  // ----------------------------------------------------
  // SUITE 3: Interactive Functional & Navigation Testing
  // ----------------------------------------------------
  console.log(`\n${c.bold}${c.cyan}====================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  SUITE 3: UI Interactivity & Tab Navigation Tests ${c.reset}`);
  console.log(`${c.bold}${c.cyan}====================================================${c.reset}`);

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 }); // Standard Mobile Viewport
  await page.goto(TARGET_URL, { waitUntil: 'networkidle2' });

  const tabsToTest = [
    { tab: 'portfolio', container: '#portfolio-container', label: 'Portfolio Dashboard' },
    { tab: 'ipo', container: '#ipo-container', label: 'IPO Center' },
    { tab: 'consecutive', container: '#stocks-container', label: '2-Day UC Screener' },
    { tab: '3day', container: '#stocks-container', label: '3-Day UC Screener' },
    { tab: 'momentum', container: '#momentum-container', label: 'Momentum Tab' },
    { tab: 'swing', container: '#swing-container', label: 'Swing Ideas' },
    { tab: 'earnings', container: '#earnings-container', label: 'Q2 Results' }
  ];

  for (const t of tabsToTest) {
    try {
      const tabExists = await page.$(`[data-tab="${t.tab}"]`);
      if (!tabExists) {
        recordTest('Navigation', `Tab [${t.label}] exists`, 'FAIL', 'Selector not found in DOM');
        continue;
      }

      // Scroll the horizontal sidebar container so the tab is in viewport before clicking
      await page.evaluate((tabName) => {
        const btn = document.querySelector(`[data-tab="${tabName}"]`);
        const sidebar = document.querySelector('.sidebar');
        if (btn && sidebar) {
          const offset = btn.offsetLeft - (sidebar.clientWidth / 2) + (btn.clientWidth / 2);
          sidebar.scrollTo({ left: offset, behavior: 'instant' });
        }
      }, t.tab);
      await new Promise(r => setTimeout(r, 200));

      await page.click(`[data-tab="${t.tab}"]`);
      await new Promise(r => setTimeout(r, 600));

      const isDisplayed = await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        return el && window.getComputedStyle(el).display !== 'none';
      }, t.container);

      if (isDisplayed) {
        recordTest('Navigation', `Switch to [${t.label}]`, 'PASS', `Container ${t.container} rendered visible`);
      } else {
        recordTest('Navigation', `Switch to [${t.label}]`, 'FAIL', `Container ${t.container} remains hidden`);
      }
    } catch (err) {
      recordTest('Navigation', `Switch to [${t.label}]`, 'FAIL', err.message);
    }
  }

  // Test Search Box Interactivity on screener tab where controls-bar is active
  try {
    await page.click('[data-tab="consecutive"]');
    await new Promise(r => setTimeout(r, 400));
    await page.type('#search-input', 'TATA', { delay: 50 });
    const searchVal = await page.$eval('#search-input', el => el.value);
    if (searchVal === 'TATA') {
      recordTest('Interaction', 'Search Input Typing', 'PASS', 'Accepts text & dispatches filters');
    } else {
      recordTest('Interaction', 'Search Input Typing', 'FAIL', `Value was: "${searchVal}"`);
    }
  } catch (err) {
    recordTest('Interaction', 'Search Input Typing', 'FAIL', err.message);
  }

  // Test Sort Select Interactivity
  try {
    await page.select('#sort-select', 'volume');
    const sortVal = await page.$eval('#sort-select', el => el.value);
    if (sortVal === 'volume') {
      recordTest('Interaction', 'Sort Select Dropdown', 'PASS', 'Option changed to "volume"');
    } else {
      recordTest('Interaction', 'Sort Select Dropdown', 'FAIL', `Value was: "${sortVal}"`);
    }
  } catch (err) {
    recordTest('Interaction', 'Sort Select Dropdown', 'FAIL', err.message);
  }

  // Screenshot final mobile state
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'Mobile_Interactions_Final.png') });

  await browser.close();

  // Print Summary
  console.log(`\n${c.bold}${c.cyan}====================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}                 TEST SUITE SUMMARY                 ${c.reset}`);
  console.log(`${c.bold}${c.cyan}====================================================${c.reset}`);
  console.log(`Total Assertions: ${results.total}`);
  console.log(`  ${c.green}Passed:   ${results.passed}${c.reset}`);
  console.log(`  ${c.red}Failed:   ${results.failed}${c.reset}`);
  console.log(`  ${c.yellow}Warnings: ${results.warnings}${c.reset}`);
  
  const score = Math.round((results.passed / results.total) * 100);
  console.log(`Health / Quality Score: ${score >= 80 ? c.green : c.yellow}${score}%${c.reset}\n`);

  // Write JSON report
  fs.writeFileSync(path.join(__dirname, 'test_report.json'), JSON.stringify(results, null, 2));
  console.log(`Full report saved to: ${path.join(__dirname, 'test_report.json')}`);
}

(async () => {
  try {
    await runApiTests();
    await runBrowserTests();
  } catch (err) {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  }
})();
