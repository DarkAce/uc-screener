const fs = require('fs');

// --- APP.JS FIXES ---
let app = fs.readFileSync('app.js', 'utf8');

// 1. Set currentTab = 'portfolio'
app = app.replace("let currentTab = 'consecutive';", "let currentTab = 'portfolio';");

// 2. Add 3-Day and 5-Day UC back to filter logic (it's already there)
// `if (tab === '3day') return s.ucDays && s.ucDays[0] && s.ucDays[1] && s.ucDays[2];`
// `if (tab === '5day') return s.ucDays && s.ucDays[0] && s.ucDays[1] && s.ucDays[2] && s.ucDays[3] && s.ucDays[4];`

// 3. Update tab switching logic to handle controls-bar visibility correctly
// Currently:
//        metricsStrip.style.display = 'none';
//        searchInput.style.display = 'none';
//        sortSelect.style.display = 'none';
app = app.replace(
    "        metricsStrip.style.display = 'none';\n        searchInput.style.display = 'none';\n        sortSelect.style.display = 'none';",
    "        metricsStrip.style.display = 'none';\n        document.querySelector('.controls-bar').style.display = 'none';\n        document.getElementById('generate-btn').style.display = 'none';"
);

app = app.replace(
    "        metricsStrip.style.display = 'none';\r\n        searchInput.style.display = 'none';\r\n        sortSelect.style.display = 'none';",
    "        metricsStrip.style.display = 'none';\r\n        document.querySelector('.controls-bar').style.display = 'none';\r\n        document.getElementById('generate-btn').style.display = 'none';"
);

// We need to restore it in the else block
app = app.replace(
    "            metricsStrip.style.display = 'flex';\n            searchInput.style.display = 'block';\n            sortSelect.style.display = 'block';",
    "            metricsStrip.style.display = 'flex';\n            document.querySelector('.controls-bar').style.display = 'flex';\n            document.getElementById('generate-btn').style.display = 'inline-flex';"
);
app = app.replace(
    "            metricsStrip.style.display = 'flex';\r\n            searchInput.style.display = 'block';\r\n            sortSelect.style.display = 'block';",
    "            metricsStrip.style.display = 'flex';\r\n            document.querySelector('.controls-bar').style.display = 'flex';\r\n            document.getElementById('generate-btn').style.display = 'inline-flex';"
);


// 4. Update initial welcome state to also handle portfolio empty state
const initBlockRegex = /\/\/ ─── Init ────────────────────────────────────────────────────────────[\s\S]*?(?=\/\/ ═══════════════════════════════════════════════════════════════════════)/;
const newInitBlock = `// ─── Init ────────────────────────────────────────────────────────────
// Portfolio empty state
{
    const pc = document.getElementById('portfolio-container');
    if (pc) {
        pc.innerHTML = \`
            <div class="empty-state">
                <div class="empty-icon">💼</div>
                <h3>Your Portfolio is Empty</h3>
                <p>Track your investments here.</p>
            </div>
        \`;
    }
}
// Show welcome state
{
    const c = document.getElementById('stocks-container');
    c.innerHTML = \`
        <div class="empty-state">
            <div class="empty-icon">⚡</div>
            <h3>Ready to scan</h3>
            <p>Click <strong>Fetch UC Data</strong> to download the last 2 sessions from NSE</p>
        </div>
    \`;
}
// Hide controls by default since we start on portfolio
setTimeout(() => {
    document.querySelector('.controls-bar').style.display = 'none';
    document.getElementById('generate-btn').style.display = 'none';
}, 0);

`;

app = app.replace(initBlockRegex, newInitBlock);
fs.writeFileSync('app.js', app);


// --- INDEX.HTML FIXES ---
let html = fs.readFileSync('index.html', 'utf8');

// 5. Remove background-pattern
html = html.replace('<div class="background-pattern"></div>\n    \n    ', '');
html = html.replace('<div class="background-pattern"></div>\r\n    \r\n    ', '');

// 6. Fix v3 Terminal -> NSE India
html = html.replace('<span class="session-dates" id="session-dates">v3 Terminal</span>', '<span class="session-dates" id="session-dates">NSE India</span>');

// 7. Add 3-Day and 5-Day UC to sidebar
const sidebarNavRegex = /(<button class="tab-btn" data-tab="consecutive"><span class="icon">🔥<\/span> 2-Day UC<\/button>)/;
html = html.replace(sidebarNavRegex, "$1\n                    <button class=\"tab-btn\" data-tab=\"3day\"><span class=\"icon\">🔥🔥</span> 3-Day UC</button>\n                    <button class=\"tab-btn\" data-tab=\"5day\"><span class=\"icon\">🚀</span> 5-Day UC</button>");

fs.writeFileSync('index.html', html);

// --- STYLE.CSS FIXES ---
let css = fs.readFileSync('style.css', 'utf8');

// Remove .background-pattern css
const bgPatternRegex = /\/\* ─── Background pattern ────────────────────────────────────────────── \*\/\n\.background-pattern \{[\s\S]*?pointer-events: none;\n\}\n\n\.background-pattern::after \{[\s\S]*?pointer-events: none;\n\}/g;
css = css.replace(bgPatternRegex, '');
const bgPatternRegexCRLF = /\/\* ─── Background pattern ────────────────────────────────────────────── \*\/\r\n\.background-pattern \{[\s\S]*?pointer-events: none;\r\n\}\r\n\r\n\.background-pattern::after \{[\s\S]*?pointer-events: none;\r\n\}/g;
css = css.replace(bgPatternRegexCRLF, '');

// Clean Space Grotesk
css = css.replace("h1, h2, h3 { font-family: 'Space Grotesk', sans-serif; }", "h1, h2, h3 { font-family: 'Inter', sans-serif; }");

// Remove old .tabs and .tab-btn css
const tabsRegex = /\/\* ─── Tabs ──────────────────────────────────────────────────────────── \*\/\n\.tabs \{[\s\S]*?\.tab-btn\[data-tab="consecutive"\]\.active::after \{\n    background: var\(--warning-fire\);\n\}/g;
css = css.replace(tabsRegex, '');
const tabsRegexCRLF = /\/\* ─── Tabs ──────────────────────────────────────────────────────────── \*\/\r\n\.tabs \{[\s\S]*?\.tab-btn\[data-tab="consecutive"\]\.active::after \{\r\n    background: var\(--warning-fire\);\r\n\}/g;
css = css.replace(tabsRegexCRLF, '');

// Remove old stats-bar css
const statsBarRegex = /\/\* ─── Stats Bar ─────────────────────────────────────────────────────── \*\/\n\.stats-bar \{[\s\S]*?\.stat-label \{\n    color: var\(--text-muted\);\n    font-size: 0\.75rem;\n    font-weight: 500;\n\}/g;
css = css.replace(statsBarRegex, '');
const statsBarRegexCRLF = /\/\* ─── Stats Bar ─────────────────────────────────────────────────────── \*\/\r\n\.stats-bar \{[\s\S]*?\.stat-label \{\r\n    color: var\(--text-muted\);\r\n    font-size: 0\.75rem;\r\n    font-weight: 500;\r\n\}/g;
css = css.replace(statsBarRegexCRLF, '');

// Format mobile css
const mobileCssStr = "@media (max-width: 768px) { .app-layout { display: flex; flex-direction: column; height: 100dvh; } .sidebar { width: 100%; height: auto; flex-direction: row; padding: 0.5rem; overflow-x: auto; border-right: none; border-bottom: 1px solid var(--card-border); } .sidebar-nav { display: flex; flex-direction: row; gap: 0.5rem; white-space: nowrap; } .nav-section { display: flex; margin: 0; align-items: center; } .nav-section-title { display: none; } .tab-btn { width: auto; margin: 0; padding: 0.5rem; } .sidebar-header, .sidebar-footer { display: none; } .top-bar { flex-direction: column; align-items: flex-start; padding: 1rem; gap: 1rem; } .top-bar-right { width: 100%; justify-content: space-between; } .metrics-strip { flex-wrap: wrap; } .controls-bar { width: 100%; flex-wrap: wrap; } .main-area { height: auto; flex: 1; } }";

const formattedMobileCss = `
/* ─── Mobile Layout ─────────────────────────────────────────────────── */
@media (max-width: 768px) {
    .app-layout { display: flex; flex-direction: column; height: 100dvh; }
    .sidebar { 
        width: 100%; height: auto; flex-direction: row; padding: 0.5rem; 
        overflow-x: auto; border-right: none; border-bottom: 1px solid var(--card-border); 
        scrollbar-width: none; /* Firefox */
    }
    .sidebar::-webkit-scrollbar { display: none; /* Chrome/Safari */ }
    .sidebar-nav { display: flex; flex-direction: row; gap: 0.5rem; white-space: nowrap; }
    .nav-section { display: flex; margin: 0; align-items: center; gap: 0.5rem; }
    .nav-section-title { display: none; }
    .tab-btn { width: auto; margin: 0; padding: 0.5rem 0.8rem; border-radius: 20px; }
    .sidebar-header, .sidebar-footer { display: none; }
    .top-bar { flex-direction: column; align-items: flex-start; padding: 1rem; gap: 1rem; }
    .top-bar-right { width: 100%; justify-content: space-between; }
    .metrics-strip { flex-wrap: wrap; }
    .controls-bar { width: 100%; flex-wrap: wrap; }
    .main-area { height: auto; flex: 1; }
    
    /* Make controls wrap nicely */
    .controls-bar .search-box { width: 100%; flex: 100%; }
    #sort-select { flex: 1; }
    #deep-scan-btn { flex: 1; justify-content: center; }
}`;

css = css.replace(mobileCssStr, formattedMobileCss);

fs.writeFileSync('style.css', css);

console.log("All fixes applied successfully.");
