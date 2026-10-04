const fs = require('fs');

const indexHtmlPath = 'index.html';
let html = fs.readFileSync(indexHtmlPath, 'utf8');

// Replace everything inside body with the new sidebar layout structure
const newBody = `
    <div class="app-layout">
        <!-- Sidebar Navigation -->
        <aside class="sidebar">
            <div class="sidebar-header">
                <h1>UC Scanner</h1>
                <span class="session-dates" id="session-dates">v3 Terminal</span>
            </div>
            
            <nav class="sidebar-nav">
                <div class="nav-section">
                    <div class="nav-section-title">Dashboards</div>
                    <button class="tab-btn active" data-tab="portfolio"><span class="icon">💼</span> Portfolio</button>
                    <button class="tab-btn" data-tab="ipo"><span class="icon">🚀</span> IPO Center</button>
                </div>
                
                <div class="nav-section">
                    <div class="nav-section-title">Screeners</div>
                    <button class="tab-btn" data-tab="consecutive"><span class="icon">🔥</span> 2-Day UC</button>
                    <button class="tab-btn" data-tab="today"><span class="icon">📊</span> Session 1 UC</button>
                    <button class="tab-btn" data-tab="yesterday"><span class="icon">📈</span> Session 2 UC</button>
                    <button class="tab-btn" data-tab="momentum"><span class="icon">⚡</span> Momentum</button>
                    <button class="tab-btn" data-tab="swing"><span class="icon">🎯</span> Swing Ideas</button>
                </div>
                
                <div class="nav-section">
                    <div class="nav-section-title">Events</div>
                    <button class="tab-btn" data-tab="earnings"><span class="icon">📅</span> Q2 Results</button>
                </div>
            </nav>
            
            <div class="sidebar-footer">
                <div class="status-container">
                    <span class="cors-note">Live Mode</span>
                    <span id="time-display"></span>
                </div>
            </div>
        </aside>

        <!-- Main Content Area -->
        <div class="main-area">
            <!-- Dynamic Top Bar -->
            <header class="top-bar">
                <div class="top-bar-left">
                    <h2 id="page-title">Portfolio Dashboard</h2>
                    <div class="metrics-strip">
                        <div class="stat-card stat-fire">
                            <div class="stat-value" id="stat-consecutive">0</div>
                            <div class="stat-label">Consecutive UC</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="stat-today">0</div>
                            <div class="stat-label" id="stat-today-label">Session 1 UC</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="stat-yesterday">0</div>
                            <div class="stat-label" id="stat-yesterday-label">Session 2 UC</div>
                        </div>
                    </div>
                </div>
                
                <div class="top-bar-right">
                    <div class="controls-bar">
                        <div class="search-box">
                            <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <input type="text" id="search-input" placeholder="Search symbol...">
                        </div>
                        <div class="sort-box">
                            <select id="sort-select">
                                <option value="change">Sort by % Change</option>
                                <option value="volume">Sort by Volume</option>
                                <option value="alpha">Sort Alphabetically</option>
                            </select>
                        </div>
                        <button id="deep-scan-btn" class="deep-scan-btn" style="display: none;">
                            🧠 Deep Scan
                        </button>
                        <button id="earnings-refresh-btn" class="deep-scan-btn" style="display: none;" onclick="fetchEarningsData()">
                            🔄 Refresh Data
                        </button>
                    </div>
                    <button id="generate-btn" class="generate-btn" onclick="fetchLiveData()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        Fetch UC Data
                    </button>
                </div>
            </header>

            <!-- Container Injection -->
            <main class="content-scroll-area">
                <div id="stocks-container" class="stocks-grid" style="display: none;">
                    <div class="empty-state">
                        <div class="empty-icon">📈</div>
                        <h3>Ready to Scan</h3>
                        <p>Click "Fetch UC Data" to download the latest Bhavcopy.</p>
                    </div>
                </div>
                <div id="ipo-container" class="ipo-table-container" style="display: none;"></div>
                <div id="momentum-container" class="ipo-table-container" style="display: none;"></div>
                <div id="swing-container" class="swing-grid" style="display: none;"></div>
                <div id="portfolio-container" class="portfolio-container" style="display: block;"></div>
                <div id="earnings-container" class="earnings-container" style="display: none;"></div>
            </main>
        </div>
    </div>
`;

html = html.replace(/<div class="app-container">[\s\S]*?<\/main>\s*<\/div>/, newBody);
fs.writeFileSync('index.html', html);


// Now inject CSS for the Sidebar layout
const cssAddition = `
/* ─── SIDEBAR LAYOUT (v3) ──────────────────────────────────────────── */
body { overflow: hidden; /* Prevent body scroll, scroll main area instead */ }

.app-layout {
    display: grid;
    grid-template-columns: 240px 1fr;
    height: 100vh;
    background-color: var(--bg-dark);
}

.sidebar {
    background: var(--bg-surface);
    border-right: 1px solid var(--card-border);
    display: flex;
    flex-direction: column;
    padding: 1.5rem 1rem;
}

.sidebar-header { margin-bottom: 2rem; padding: 0 0.5rem; }
.sidebar-header h1 { font-size: 1.4rem; }

.sidebar-nav { flex: 1; overflow-y: auto; }
.nav-section { margin-bottom: 1.5rem; }
.nav-section-title {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
    padding: 0 0.5rem;
    font-weight: 700;
}

.tab-btn {
    width: 100%;
    display: flex;
    align-items: center;
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 0.65rem 0.75rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s ease;
    margin-bottom: 0.25rem;
}
.tab-btn .icon { margin-right: 10px; font-size: 1.1rem; }
.tab-btn:hover { background: var(--card-bg-hover); color: var(--text-main); }
.tab-btn.active {
    background: var(--primary-accent-dim);
    color: var(--primary-accent);
    font-weight: 600;
}

.sidebar-footer {
    padding-top: 1rem;
    border-top: 1px solid var(--card-border);
    font-size: 0.75rem;
    color: var(--text-muted);
}

.main-area {
    display: flex;
    flex-direction: column;
    height: 100vh;
}

.top-bar {
    padding: 1.25rem 2rem;
    border-bottom: 1px solid var(--card-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-dark);
    z-index: 10;
}

#page-title {
    font-size: 1.2rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
}

.top-bar-left { display: flex; flex-direction: column; }
.top-bar-right { display: flex; align-items: center; gap: 1rem; }

/* Redesign metrics strip to fit in top bar */
.metrics-strip { display: flex; gap: 1rem; }
.stat-card {
    background: transparent; border: none; padding: 0; box-shadow: none; backdrop-filter: none;
    display: flex; flex-direction: row; align-items: center; gap: 0.5rem; margin: 0;
}
.stat-value { font-size: 1rem; font-weight: 700; color: var(--text-main); }
.stat-label { font-size: 0.7rem; color: var(--text-muted); }

.content-scroll-area {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
}

/* Hide original .tabs and .app-container */
.tabs { display: none !important; }
.app-container { padding: 0; max-width: 100%; }
.stats-bar { display: none !important; } /* We moved it to metrics-strip */
`;

fs.appendFileSync('style.css', cssAddition);
console.log('Layout patched!');
