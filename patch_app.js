const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// Find the tab switching listener
const tabSwitcherStart = appJs.indexOf("document.querySelectorAll('.tab-btn').forEach(btn => {");
if (tabSwitcherStart === -1) {
    console.error('Could not find tab switcher in app.js');
    process.exit(1);
}

// We will inject logic right before we evaluate currentTab.
const injectionPointStr = "currentTab = e.target.dataset.tab;";
const injectionPoint = appJs.indexOf(injectionPointStr);

const logicStr = `currentTab = e.target.dataset.tab || e.target.closest('.tab-btn').dataset.tab;
        
        // Update Title and Contextual UI
        const pageTitle = document.getElementById('page-title');
        const metricsStrip = document.querySelector('.metrics-strip');
        const searchInput = document.getElementById('search-input');
        const sortSelect = document.getElementById('sort-select');
        
        // Defaults
        metricsStrip.style.display = 'none';
        searchInput.style.display = 'none';
        sortSelect.style.display = 'none';
        
        if (currentTab === 'portfolio') {
            pageTitle.textContent = 'Portfolio Dashboard';
        } else if (currentTab === 'ipo') {
            pageTitle.textContent = 'IPO Center';
        } else if (currentTab === 'earnings') {
            pageTitle.textContent = 'Q2 Results Calendar';
        } else if (currentTab === 'momentum') {
            pageTitle.textContent = 'Momentum Scans';
        } else if (currentTab === 'swing') {
            pageTitle.textContent = 'Swing Trading Ideas';
        } else {
            // Upper Circuit screener tabs
            pageTitle.textContent = 'Upper Circuit Screener';
            metricsStrip.style.display = 'flex';
            searchInput.style.display = 'block';
            sortSelect.style.display = 'block';
        }
`;

appJs = appJs.replace(injectionPointStr, logicStr);

fs.writeFileSync('app.js', appJs);
console.log('App.js patched for contextual headers!');
