const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 900 });
  
  console.log("Navigating to site...");
  await page.goto('https://uc-screener.onrender.com/', { waitUntil: 'networkidle2' });
  
  console.log("Taking screenshot...");
  await page.screenshot({ path: 'screenshot_home.png', fullPage: true });
  
  console.log("Clicking IPO tab...");
  await page.click('[data-tab="ipo"]');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'screenshot_ipo.png', fullPage: true });
  
  await browser.close();
  console.log("Done!");
})();
