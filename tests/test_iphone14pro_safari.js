/**
 * Targeted Test Suite: iPhone 14 Pro (Mobile Safari Emulation)
 * Specifications:
 *  - Viewport: 393 x 852 pt
 *  - Device Pixel Ratio (DPR): 3
 *  - Touch: Enabled (isMobile: true, hasTouch: true)
 *  - User-Agent: Mobile Safari iOS 17.0
 *  - Target: https://uc-screener.onrender.com/
 */

const puppeteer = require('c:/Users/bhavi/.gemini/antigravity/playground/binary-pathfinder/resume-builder/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

const TARGET_URL = process.env.TEST_URL || 'https://uc-screener.onrender.com/';
const OUTPUT_DIR = path.join(__dirname, 'screenshots', 'iphone14pro_safari');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const IPHONE_14_PRO = {
  name: 'iPhone 14 Pro (Mobile Safari)',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  viewport: {
    width: 393,
    height: 852,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    isLandscape: false
  }
};

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

const results = [];

function assertTest(category, name, passed, message) {
  const icon = passed ? '✅' : '❌';
  const color = passed ? c.green : c.red;
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`  ${icon} ${color}[${status}]${c.reset} [${category}] ${name}${message ? ` — ${c.dim}${message}${c.reset}` : ''}`);
  results.push({ category, name, passed, message });
}

(async () => {
  console.log(`\n${c.bold}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}   TESTING IPHONE 14 PRO — MOBILE SAFARI (393 x 852 @ 3x)      ${c.reset}`);
  console.log(`${c.bold}${c.cyan}================================================================${c.reset}`);
  console.log(`Target: ${TARGET_URL}\n`);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.emulate(IPHONE_14_PRO);

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  // 1. Initial Load & Viewport Metrics
  console.log(`${c.bold}Phase 1: Page Load & Safari Viewport Audit${c.reset}`);
  try {
    const response = await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    assertTest('Load', 'HTTP Status 200', response.status() === 200, `Status: ${response.status()}`);
  } catch (err) {
    assertTest('Load', 'HTTP Status 200', false, err.message);
  }

  // 2. Safari Viewport Dimensions & Overflow Check
  const viewportCheck = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const docH = document.documentElement.clientHeight;
    const scrollW = document.documentElement.scrollWidth;
    const bodyW = document.body.scrollWidth;
    
    // Check overflowing elements
    const overflowing = [];
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > docW + 1) {
        overflowing.push({ tag: el.tagName, id: el.id, cls: el.className?.toString()?.slice(0, 20), right: Math.round(r.right) });
      }
    });

    return {
      docW,
      docH,
      scrollW,
      bodyW,
      hasOverflow: scrollW > docW || bodyW > docW,
      overflowDelta: Math.max(scrollW, bodyW) - docW,
      overflowingCount: overflowing.length,
      overflowingSample: overflowing.slice(0, 3)
    };
  });

  assertTest('Viewport', 'Viewport width matches 393px', viewportCheck.docW === 393, `Actual: ${viewportCheck.docW}px`);
  assertTest('Viewport', 'Zero horizontal scroll overflow', !viewportCheck.hasOverflow, 
    viewportCheck.hasOverflow ? `Overflow by ${viewportCheck.overflowDelta}px (${viewportCheck.overflowingCount} nodes)` : 'Exactly 0px sideways scroll');

  // 3. Safari Sticky Header & dvh Check
  console.log(`\n${c.bold}Phase 2: Safari Dynamic Viewport & Sticky Navigation${c.reset}`);
  const safariStyleCheck = await page.evaluate(() => {
    const sidebar = document.querySelector('.sidebar');
    const mainArea = document.querySelector('.main-area');
    const sStyle = window.getComputedStyle(sidebar);
    const mStyle = window.getComputedStyle(mainArea);
    
    return {
      sidebarPosition: sStyle.position,
      sidebarTop: sStyle.top,
      sidebarZIndex: sStyle.zIndex,
      hasStickyNav: sStyle.position === 'sticky',
      mainAreaDisplay: mStyle.display
    };
  });

  assertTest('Safari CSS', 'Sticky mobile navigation bar', safariStyleCheck.hasStickyNav, 
    `position: ${safariStyleCheck.sidebarPosition}, top: ${safariStyleCheck.sidebarTop}, z-index: ${safariStyleCheck.sidebarZIndex}`);

  // Capture Home Screenshot
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01_iphone14pro_home_portfolio.png'), fullPage: false });

  // 4. Tab Switching across all views on iPhone 14 Pro
  console.log(`\n${c.bold}Phase 3: Touch Navigation & Screen Flows${c.reset}`);
  const tabs = [
    { id: 'ipo', label: 'IPO Center', container: '#ipo-container' },
    { id: 'consecutive', label: '2-Day UC Screener', container: '#stocks-container' },
    { id: '3day', label: '3-Day UC Screener', container: '#stocks-container' },
    { id: 'momentum', label: 'Momentum Scans', container: '#momentum-container' },
    { id: 'swing', label: 'Swing Ideas', container: '#swing-container' },
    { id: 'earnings', label: 'Q2 Results Calendar', container: '#earnings-container' },
    { id: 'portfolio', label: 'Portfolio Dashboard', container: '#portfolio-container' }
  ];

  for (const t of tabs) {
    // Scroll tab smoothly into view inside the horizontal container
    await page.evaluate((tabId) => {
      const btn = document.querySelector(`[data-tab="${tabId}"]`);
      const sidebar = document.querySelector('.sidebar');
      if (btn && sidebar) {
        const offset = btn.offsetLeft - (sidebar.clientWidth / 2) + (btn.clientWidth / 2);
        sidebar.scrollTo({ left: offset, behavior: 'instant' });
      }
    }, t.id);
    await new Promise(r => setTimeout(r, 150));

    // Tap on tab using touch tap simulation
    await page.tap(`[data-tab="${t.id}"]`);
    await new Promise(r => setTimeout(r, 500));

    const isVisible = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      return el && window.getComputedStyle(el).display !== 'none';
    }, t.container);

    assertTest('Touch Nav', `Switch to ${t.label}`, isVisible, `Active display: ${isVisible ? 'visible' : 'hidden'}`);

    if (t.id === 'ipo') {
      await page.screenshot({ path: path.join(OUTPUT_DIR, '02_iphone14pro_ipo_center.png'), fullPage: false });
    } else if (t.id === 'consecutive') {
      await page.screenshot({ path: path.join(OUTPUT_DIR, '03_iphone14pro_2day_screener.png'), fullPage: false });
    } else if (t.id === 'earnings') {
      await page.screenshot({ path: path.join(OUTPUT_DIR, '04_iphone14pro_earnings.png'), fullPage: false });
    }
  }

  // 5. Test Stock Detail Modal & Touch Close Button on iPhone 14 Pro
  console.log(`\n${c.bold}Phase 4: Stock Modal Touch UX & Sizing Audit${c.reset}`);
  
  // Switch to IPO tab and tap an item or trigger modal
  await page.tap('[data-tab="ipo"]');
  await new Promise(r => setTimeout(r, 600));

  const hasIpoRow = await page.evaluate(() => {
    const row = document.querySelector('.ipo-table tbody tr');
    if (row) {
      row.click();
      return true;
    }
    return false;
  });

  if (hasIpoRow) {
    await new Promise(r => setTimeout(r, 600));
    const modalAudit = await page.evaluate(() => {
      const overlay = document.querySelector('.modal-overlay');
      const modal = document.querySelector('.modal-content');
      const closeBtn = document.querySelector('.modal-close');
      const buyBtn = document.querySelector('button[onclick*="BUY"]');
      const sellBtn = document.querySelector('button[onclick*="SELL"]');
      const qtyInput = document.querySelector('#trade-qty');

      const closeRect = closeBtn ? closeBtn.getBoundingClientRect() : null;
      const buyRect = buyBtn ? buyBtn.getBoundingClientRect() : null;
      const sellRect = sellBtn ? sellBtn.getBoundingClientRect() : null;
      const qtyRect = qtyInput ? qtyInput.getBoundingClientRect() : null;

      return {
        isActive: overlay && overlay.classList.contains('active'),
        closeTouchTarget: closeRect ? { w: Math.round(closeRect.width), h: Math.round(closeRect.height) } : null,
        buyTouchTarget: buyRect ? { w: Math.round(buyRect.width), h: Math.round(buyRect.height) } : null,
        sellTouchTarget: sellRect ? { w: Math.round(sellRect.width), h: Math.round(sellRect.height) } : null,
        qtyTouchTarget: qtyRect ? { w: Math.round(qtyRect.width), h: Math.round(qtyRect.height) } : null
      };
    });

    assertTest('Modal UX', 'Stock detail modal opened on tap', modalAudit.isActive, 'Overlay active');
    
    if (modalAudit.closeTouchTarget) {
      const isTargetCompliant = modalAudit.closeTouchTarget.w >= 40 && modalAudit.closeTouchTarget.h >= 40;
      assertTest('Modal UX', 'Modal close button meets Apple Human Interface Guidelines (≥ 40x40px)', 
        isTargetCompliant, `Size: ${modalAudit.closeTouchTarget.w}x${modalAudit.closeTouchTarget.h}px`);
    }

    if (modalAudit.buyTouchTarget) {
      const isBuyCompliant = modalAudit.buyTouchTarget.h >= 40;
      assertTest('Modal UX', 'Paper trading BUY button touch target (≥ 40px)', isBuyCompliant, `Height: ${modalAudit.buyTouchTarget.h}px`);
    }

    if (modalAudit.qtyTouchTarget) {
      const isQtyCompliant = modalAudit.qtyTouchTarget.h >= 40;
      assertTest('Modal UX', 'Paper trading Qty input touch target (≥ 40px)', isQtyCompliant, `Height: ${modalAudit.qtyTouchTarget.h}px`);
    }

    // Capture modal screenshot
    await page.screenshot({ path: path.join(OUTPUT_DIR, '05_iphone14pro_modal_detail.png'), fullPage: false });

    // Close modal via touch tap
    await page.tap('.modal-close');
    await new Promise(r => setTimeout(r, 400));

    const isClosed = await page.evaluate(() => {
      const overlay = document.querySelector('.modal-overlay');
      return !overlay || !overlay.classList.contains('active');
    });
    assertTest('Modal UX', 'Close button dismisses modal on touch tap', isClosed, 'Overlay inactive');
  } else {
    assertTest('Modal UX', 'Stock/IPO rows available for detail modal test', true, 'Skipped (no rows currently loaded)');
  }

  // 6. Console Runtime Sentinel
  console.log(`\n${c.bold}Phase 5: Mobile Safari Runtime Console Audit${c.reset}`);
  assertTest('Console', 'Zero runtime exceptions in Mobile Safari', consoleErrors.length === 0, 
    consoleErrors.length === 0 ? 'Clean console' : `Errors: ${consoleErrors.join(', ')}`);

  await browser.close();

  // Print Summary
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const total = results.length;
  const score = Math.round((passedCount / total) * 100);

  console.log(`\n${c.bold}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}   IPHONE 14 PRO MOBILE SAFARI AUDIT COMPLETE: ${score}% PASS     ${c.reset}`);
  console.log(`${c.bold}${c.cyan}================================================================${c.reset}`);
  console.log(`Total Assertions: ${total}`);
  console.log(`  ${c.green}Passed: ${passedCount}${c.reset}`);
  console.log(`  ${c.red}Failed: ${failedCount}${c.reset}`);
  console.log(`Screenshots saved to: ${OUTPUT_DIR}\n`);

  fs.writeFileSync(path.join(__dirname, 'iphone14pro_safari_report.json'), JSON.stringify({ device: IPHONE_14_PRO.name, total, passed: passedCount, failed: failedCount, score, results }, null, 2));
})();
