const puppeteer = require('c:/Users/bhavi/.gemini/antigravity/playground/binary-pathfinder/resume-builder/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

const TARGET_URL = process.env.TEST_URL || 'http://localhost:3000/';

(async () => {
  console.log('Testing New Intraday & Swing Features on:', TARGET_URL);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true }); // iPhone 14 Pro

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(TARGET_URL, { waitUntil: 'networkidle2' });

  // 1. Test Intraday Tab Navigation
  console.log('\n--- 1. Testing Intraday Hub ---');
  await page.evaluate(() => {
    const btn = document.querySelector('[data-tab="intraday"]');
    btn.scrollIntoView({ inline: 'center' });
  });
  await new Promise(r => setTimeout(r, 200));
  await page.click('[data-tab="intraday"]');
  await page.waitForSelector('#intraday-container .scan-card', { timeout: 15000 });

  const intradayState = await page.evaluate(() => {
    const container = document.getElementById('intraday-container');
    const isVisible = container && window.getComputedStyle(container).display !== 'none';
    const cards = container.querySelectorAll('.scan-card').length;
    const subFilters = container.querySelectorAll('.subfilter-btn').length;
    return { isVisible, cards, subFilters };
  });
  console.log('Intraday Hub rendered:', intradayState);

  // Test Intraday subfilter click (e.g. NR7)
  await page.evaluate(() => {
    const btn = document.querySelector('.subfilter-btn:nth-child(2)');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 500));
  const nr7Cards = await page.evaluate(() => document.querySelectorAll('#intraday-container .scan-card').length);
  console.log('NR7 cards displayed after filter click:', nr7Cards);

  // 2. Test Swing Radar Navigation
  console.log('\n--- 2. Testing Swing Radar ---');
  await page.evaluate(() => {
    const btn = document.querySelector('[data-tab="swinghub"]');
    btn.scrollIntoView({ inline: 'center' });
  });
  await new Promise(r => setTimeout(r, 200));
  await page.click('[data-tab="swinghub"]');
  await page.waitForSelector('#swinghub-container .scan-card', { timeout: 15000 });

  const swingState = await page.evaluate(() => {
    const container = document.getElementById('swinghub-container');
    const isVisible = container && window.getComputedStyle(container).display !== 'none';
    const cards = container.querySelectorAll('.scan-card').length;
    const subFilters = container.querySelectorAll('.subfilter-btn').length;
    return { isVisible, cards, subFilters };
  });
  console.log('Swing Radar rendered:', swingState);

  // Test Swing subfilter click (Institutional Accumulation)
  await page.evaluate(() => {
    const btn = document.querySelector('#swinghub-container .subfilter-btn:nth-child(2)');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 500));
  const accumCards = await page.evaluate(() => document.querySelectorAll('#swinghub-container .scan-card').length);
  console.log('Institutional Accumulation cards displayed:', accumCards);

  // 3. Test Position Sizing & CPR Modal Analytics
  console.log('\n--- 3. Testing Position Sizing & CPR Modal Analytics ---');
  await page.evaluate(() => {
    const firstCard = document.querySelector('#intraday-container .scan-card') || document.querySelector('.scan-card');
    if (firstCard) firstCard.click();
  });
  await page.waitForSelector('#stock-modal.active', { timeout: 10000 });
  await page.waitForFunction(() => document.getElementById('modal-pivot-val')?.textContent !== '—', { timeout: 10000 });

  const modalRiskAudit = await page.evaluate(() => {
    const overlay = document.querySelector('.modal-overlay');
    const isActive = overlay && overlay.classList.contains('active');
    const riskPanel = document.getElementById('modal-risk-panel');
    const pivotVal = document.getElementById('modal-pivot-val')?.textContent;
    const h4Val = document.getElementById('modal-h4-val')?.textContent;
    const recQty = document.getElementById('rec-qty-val')?.textContent;
    return {
      isActive,
      hasRiskPanel: !!riskPanel,
      pivotVal,
      h4Val,
      recQty
    };
  });
  console.log('Modal Risk & CPR Analytics:', modalRiskAudit);

  // Test Apply Rec Qty to Trade Box
  await page.evaluate(() => {
    applyRecQty();
  });
  const tradeQtyVal = await page.$eval('#trade-qty', el => el.value);
  console.log('Trade Box populated with recommended qty:', tradeQtyVal);

  // 4. Mobile Viewport Overflow Check
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  console.log('\nHorizontal overflow on iPhone 14 Pro:', overflow ? 'OVERFLOW' : 'EXACT FIT (0px overflow)');

  // 5. Console Errors
  console.log('Console Errors caught:', errors.length);
  if (errors.length > 0) console.log(errors);

  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'intraday_swing_features_verified.png') });
  await browser.close();

  const success = intradayState.isVisible && swingState.isVisible && modalRiskAudit.hasRiskPanel && !overflow;
  console.log('\nOVERALL RESULT:', success ? 'ALL FEATURES PASSED ✅' : 'FAIL ❌');
  process.exit(success ? 0 : 1);
})();
