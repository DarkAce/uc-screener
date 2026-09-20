// ═══════════════════════════════════════════════════════════════════════
// UC Scanner — App Logic
// Fetches real NSE Bhavcopy data from /api/uc-stocks
// ═══════════════════════════════════════════════════════════════════════

// ─── State ───────────────────────────────────────────────────────────
let stocksData = [];
let ipoData = [];
let momentumData = [];
let isLiveMode = false;
let sessionInfo = { session1: null, session2: null };
let deepScanData = {};
let currentTab = 'consecutive';
let currentSearch = '';
let currentSort = 'change';

// ─── Utilities ───────────────────────────────────────────────────────
const formatCurrency = (val) => '₹' + parseFloat(val).toFixed(2);
const formatVolume = (num) => {
    num = parseInt(num) || 0;
    if (num >= 10000000) return (num / 10000000).toFixed(2) + ' Cr';
    if (num >= 100000) return (num / 100000).toFixed(2) + 'L';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
};

function filterStocks(data, tab) {
    return data.filter(s => {
        if (tab === 'consecutive') return s.ucSession1 && s.ucSession2;
        if (tab === 'today') return s.ucSession1;
        if (tab === 'yesterday') return s.ucSession2;
        return true;
    });
}

// ─── Data Fetching ───────────────────────────────────────────────────
async function fetchLiveData() {
    const container = document.getElementById('stocks-container');
    const genBtn = document.getElementById('generate-btn');

    // Show loading state on button
    if (genBtn) {
        genBtn.classList.add('loading');
        genBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Fetching...`;
    }

    container.innerHTML = `
        <div class="loading-state">
            <div class="loader"></div>
            <p id="main-loading-text">Connecting to server...</p>
            <div class="progress-bar-container">
                <div id="main-progress-fill" class="progress-bar-fill" style="width: 0%;"></div>
            </div>
        </div>
    `;

    const progressFill = document.getElementById('main-progress-fill');
    const loadingText = document.getElementById('main-loading-text');

    const eventSource = new EventSource('/api/uc-stocks/stream');

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress') {
            if (progressFill) progressFill.style.width = `${data.progress}%`;
            if (loadingText) loadingText.textContent = data.message;
        } 
        else if (data.type === 'complete') {
            eventSource.close();
            
            // Force progress to 100% and wait a moment so the user sees it complete
            if (progressFill) progressFill.style.width = '100%';
            if (loadingText) loadingText.textContent = 'Processing complete!';
            
            setTimeout(() => {
                const json = data.data;

                if (!json.success) {
                    showFetchError(container, json.error || 'API returned failure');
                    return;
                }

                sessionInfo = {
                    session1: json.session1,
                    session2: json.session2
                };

                // Transform API response into card format
                stocksData = json.stocks.map(s => ({
                    symbol: s.symbol,
                    name: s.name || s.symbol,
                    series: s.series,
                    price: s.price,
                    prevClose: s.prevClose,
                    open: s.open,
                    high: s.high,
                    low: s.low,
                    ucBand: s.ucBand || 5,
                    volume: s.volume,
                    ucSession1: s.ucSession1,
                    ucSession2: s.ucSession2,
                    changeSession1: s.changeSession1,
                    changeSession2: s.changeSession2,
                    session1Date: s.session1Date,
                    session2Date: s.session2Date,
                    closeSession2: s.closeSession2,
                    prevCloseSession2: s.prevCloseSession2
                }));

                isLiveMode = true;
                updateModeIndicator('live');
                resetGenerateBtn();
                updateTabs();
                updateStats();
                renderStocks();
                console.log(`✅ Live data: ${json.session1?.ucCount || 0} UC (${json.session1?.dateReadable}), ${json.session2?.ucCount || 0} UC (${json.session2?.dateReadable}), ${json.consecutiveCount} consecutive`);
            }, 400); // 400ms delay for visual feedback
        }
        else if (data.type === 'error') {
            eventSource.close();
            showFetchError(container, data.message);
        }
    };

    eventSource.onerror = (err) => {
        eventSource.close();
        showFetchError(container, 'Connection to server lost.');
    };
}

function showFetchError(container, message) {
    console.error('❌ Fetch failed:', message);
    updateModeIndicator('error');
    resetGenerateBtn();
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <h3>Could not fetch data</h3>
            <p>${message}</p>
            <p style="margin-top: 1rem; color: var(--text-muted);">Make sure the server is running: <code>npm start</code></p>
        </div>
    `;
}

function resetGenerateBtn() {
    const genBtn = document.getElementById('generate-btn');
    if (genBtn) {
        genBtn.classList.remove('loading');
        genBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Fetch UC Data`;
    }
}

// ─── Mode Indicator ──────────────────────────────────────────────────
function updateModeIndicator(mode) {
    const corsNote = document.querySelector('.cors-note');
    const refreshBtn = document.getElementById('refresh-btn');

    if (mode === 'live') {
        corsNote.innerHTML = '<span class="live-dot"></span> Live — NSE Bhavcopy Data';
        corsNote.style.color = '#00ff88';
        corsNote.style.background = 'rgba(0, 255, 136, 0.1)';
        corsNote.style.borderColor = 'rgba(0, 255, 136, 0.2)';
        if (refreshBtn) refreshBtn.style.display = 'inline-flex';
    } else {
        corsNote.innerHTML = '⚠️ Connection Error';
        corsNote.style.color = '#ff3366';
        corsNote.style.background = 'rgba(255, 51, 102, 0.1)';
        corsNote.style.borderColor = 'rgba(255, 51, 102, 0.2)';
        if (refreshBtn) refreshBtn.style.display = 'inline-flex';
    }
}

// ─── Update tab labels with dates ────────────────────────────────────
function updateTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const s1 = sessionInfo.session1?.dateReadable || 'Session 1';
    const s2 = sessionInfo.session2?.dateReadable || 'Session 2';

    tabs.forEach(tab => {
        const type = tab.dataset.tab;
        if (type === 'consecutive') {
            tab.textContent = `Consecutive UC 🔥`;
        } else if (type === 'today') {
            tab.textContent = `${s1} UC`;
        } else if (type === 'yesterday') {
            tab.textContent = `${s2} UC`;
        }
    });

    // Update session date display
    const dateDisplay = document.getElementById('session-dates');
    if (dateDisplay) {
        dateDisplay.textContent = `${s2} → ${s1}`;
    }
}

// ─── Update Stats ────────────────────────────────────────────────────
function updateStats() {
    const consecutive = stocksData.filter(s => s.ucSession1 && s.ucSession2).length;
    const session1Count = stocksData.filter(s => s.ucSession1).length;
    const session2Count = stocksData.filter(s => s.ucSession2).length;

    animateCounter('stat-consecutive', consecutive);
    animateCounter('stat-today', session1Count);
    animateCounter('stat-yesterday', session2Count);

    // Update stat labels with dates
    const s1 = sessionInfo.session1?.dateReadable || 'Session 1';
    const s2 = sessionInfo.session2?.dateReadable || 'Session 2';
    document.getElementById('stat-today-label').textContent = `UC on ${s1}`;
    document.getElementById('stat-yesterday-label').textContent = `UC on ${s2}`;

    // Update timestamp
    const timeEl = document.getElementById('time-display');
    timeEl.textContent = new Date().toLocaleTimeString();
}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    const current = parseInt(el.textContent) || 0;
    if (current === target) return;
    const duration = 500;
    const start = performance.now();

    function step(ts) {
        const p = Math.min((ts - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(current + (target - current) * eased);
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ─── Trend Sparkline ─────────────────────────────────────────────────
function generateTrendLines(s) {
    // 3 price points: prev of session2, close session2, close session1
    const p1 = s.prevCloseSession2 || s.prevClose;
    const p2 = s.closeSession2 || s.prevClose;
    const p3 = s.price;

    const min = Math.min(p1, p2, p3);
    const max = Math.max(p1, p2, p3);
    const range = max - min || 1;

    const getY = (val) => 26 - ((val - min) / range * 26);
    const y1 = getY(p1), y2 = getY(p2), y3 = getY(p3);
    const dx = 27;

    const calcAngle = (dy, dx) => Math.atan2(dy, dx) * 180 / Math.PI;
    const calcLen = (dy, dx) => Math.sqrt(dx * dx + dy * dy);

    return `
        <div class="trend-dot" style="left:0px;top:${y1 - 3}px"></div>
        <div class="trend-dot" style="left:${dx}px;top:${y2 - 3}px"></div>
        <div class="trend-dot" style="left:${dx * 2}px;top:${y3 - 3}px"></div>
        <div class="trend-line" style="left:3px;top:${y1}px;width:${calcLen(y2 - y1, dx)}px;transform:rotate(${calcAngle(y2 - y1, dx)}deg)"></div>
        <div class="trend-line" style="left:${dx + 3}px;top:${y2}px;width:${calcLen(y3 - y2, dx)}px;transform:rotate(${calcAngle(y3 - y2, dx)}deg)"></div>
    `;
}

// ─── Render Stock Cards ──────────────────────────────────────────────
function renderStocks() {
    const container = document.getElementById('stocks-container');

    // Filter by tab
    let filtered = filterStocks(stocksData, currentTab);

    // Search
    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        filtered = filtered.filter(s =>
            s.symbol.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q)
        );
    }

    // Sort
    let sorted = [...filtered];
    sorted.sort((a, b) => {
        if (currentSort === 'change') {
            const aChange = a.changeSession1 ?? a.changeSession2 ?? 0;
            const bChange = b.changeSession1 ?? b.changeSession2 ?? 0;
            return bChange - aChange;
        }
        if (currentSort === 'volume') return (b.volume || 0) - (a.volume || 0);
        if (currentSort === 'alpha') return a.symbol.localeCompare(b.symbol);
        return 0;
    });

    // Empty state
    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <h3>No stocks found</h3>
                <p>${currentSearch ? 'Try a different search term' : 'No UC stocks in this category'}</p>
            </div>
        `;
        return;
    }

    const s1Date = sessionInfo.session1?.dateReadable || 'Session 1';
    const s2Date = sessionInfo.session2?.dateReadable || 'Session 2';

    container.innerHTML = sorted.map((s, i) => {
        const isConsecutive = s.ucSession1 && s.ucSession2;

        // Session 1 change display
        let s1ChangeHtml = '';
        if (s.changeSession1 !== null && s.changeSession1 !== undefined) {
            const cls = s.changeSession1 >= 0 ? 'positive' : 'negative';
            const sign = s.changeSession1 > 0 ? '+' : '';
            s1ChangeHtml = `<span class="change-today ${cls}">${sign}${s.changeSession1.toFixed(2)}%</span>`;
        }

        // Session 2 change display
        let s2ChangeHtml = '';
        if (s.changeSession2 !== null && s.changeSession2 !== undefined) {
            const cls = s.changeSession2 >= 0 ? 'positive' : 'negative';
            const sign = s.changeSession2 > 0 ? '+' : '';
            s2ChangeHtml = `<span class="change-yesterday ${cls}">${sign}${s.changeSession2.toFixed(2)}%</span>`;
        }

        // UC day tags with dates
        let ucTags = '';
        if (s.ucSession1) ucTags += `<span class="uc-tag uc-today" title="${s1Date}">▲ ${s1Date.split(',')[0]}</span>`;
        if (s.ucSession2) ucTags += `<span class="uc-tag uc-yesterday" title="${s2Date}">▲ ${s2Date.split(',')[0]}</span>`;

        // Display price based on which session we're showing
        const displayPrice = s.ucSession1 ? s.price : (s.closeSession2 || s.price);

        return `
            <div class="stock-card ${isConsecutive ? 'consecutive-card' : ''}" style="animation-delay: ${i * 0.05}s" data-symbol="${s.symbol}" onclick="openStockDetail('${s.symbol}', '${(s.name || s.symbol).replace(/'/g, "\\'")}')">
                <div class="card-highlight"></div>
                ${isConsecutive ? '<div class="fire-badge">🔥 2-Day UC</div>' : ''}
                <div class="card-header">
                    <div>
                        <div class="stock-symbol">${s.symbol}</div>
                        <div class="stock-name">${s.name !== s.symbol ? s.name : ''} <span class="series-tag">${s.series}</span></div>
                    </div>
                    <div class="uc-badge">${s.ucBand}% UC</div>
                </div>
                <div class="card-body">
                    <div class="price-info">
                        <div class="current-price">${formatCurrency(displayPrice)}</div>
                        <div class="price-change">
                            ${s1ChangeHtml}
                            ${s2ChangeHtml}
                        </div>
                        <div class="price-detail">
                            Prev: ${formatCurrency(s.prevClose)}
                        </div>
                    </div>
                    <div class="trend-indicator">
                        ${generateTrendLines(s)}
                    </div>
                </div>
                <div class="card-footer">
                    <div class="volume">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                        ${formatVolume(s.volume)}
                    </div>
                    <div class="uc-tags">${ucTags}</div>
                </div>
                ${deepScanData[s.symbol] ? `
                <div class="ds-container">
                    <div class="ds-badge" style="background: ${deepScanData[s.symbol].badgeColor}">${deepScanData[s.symbol].rating}</div>
                    <div class="ds-summary">${deepScanData[s.symbol].summary}</div>
                    ${deepScanData[s.symbol].news.map(n => `<div class="ds-news-item">${n}</div>`).join('')}
                </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// ─── Event Listeners ─────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentTab = e.target.dataset.tab;
        
        const stocksContainer = document.getElementById('stocks-container');
        const ipoContainer = document.getElementById('ipo-container');
        const momentumContainer = document.getElementById('momentum-container');
        const swingContainer = document.getElementById('swing-container');
        
        if (currentTab === 'ipo') {
            document.getElementById('deep-scan-btn').style.display = 'none';
            stocksContainer.style.display = 'none';
            momentumContainer.style.display = 'none';
            swingContainer.style.display = 'none';
            ipoContainer.style.display = 'block';
            if (ipoData.length === 0) {
                fetchIPOData();
            } else {
                renderIPOs();
                updateIPOStats();
            }
        } else if (currentTab === 'momentum') {
            document.getElementById('deep-scan-btn').style.display = 'none';
            stocksContainer.style.display = 'none';
            ipoContainer.style.display = 'none';
            swingContainer.style.display = 'none';
            momentumContainer.style.display = 'block';
            if (momentumData.length === 0) {
                fetchMomentumData();
            } else {
                renderMomentum();
                updateMomentumStats();
            }
        } else if (currentTab === 'swing') {
            document.getElementById('deep-scan-btn').style.display = 'none';
            stocksContainer.style.display = 'none';
            ipoContainer.style.display = 'none';
            momentumContainer.style.display = 'none';
            swingContainer.style.display = 'grid';
            renderSwingStrategies();
        } else {
            document.getElementById('deep-scan-btn').style.display = 'flex';
            ipoContainer.style.display = 'none';
            momentumContainer.style.display = 'none';
            swingContainer.style.display = 'none';
            stocksContainer.style.display = 'grid';
            // Restore stat-fire card's original UC styling
            const fireCard = document.querySelector('.stat-fire');
            fireCard.style.background = '';
            fireCard.style.borderColor = '';
            document.getElementById('stat-consecutive').style.color = '';
            document.getElementById('stat-consecutive').style.textShadow = '';
            updateStats();
            renderStocks();
        }
    });
});

document.getElementById('search-input').addEventListener('input', (e) => {
    currentSearch = e.target.value;
    if (currentTab === 'ipo') {
        renderIPOs();
    } else if (currentTab === 'momentum') {
        renderMomentum();
    } else if (currentTab === 'swing') {
        renderSwingStrategies();
    } else {
        renderStocks();
    }
});

document.getElementById('sort-select').addEventListener('change', (e) => {
    currentSort = e.target.value;
    if (currentTab === 'ipo') {
        renderIPOs();
    } else if (currentTab === 'momentum') {
        renderMomentum();
    } else if (currentTab === 'swing') {
        renderSwingStrategies();
    } else {
        renderStocks();
    }
});

document.getElementById('deep-scan-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('deep-scan-btn');
    btn.innerHTML = '<span class="loader" style="width:14px;height:14px;border-width:2px;"></span> Scanning...';
    btn.disabled = true;
    
    // Get symbols currently visible on the screen
    let filtered = filterStocks(stocksData, currentTab);
    const symbols = filtered.slice(0, 10).map(s => s.symbol); // Limit to top 10 to prevent long waits
    
    try {
        const response = await fetch('/api/analyze-uc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbols })
        });
        const data = await response.json();
        if (data.success) {
            deepScanData = { ...deepScanData, ...data.analysis };
            renderStocks();
        }
    } catch (err) {
        console.error('Deep scan failed:', err);
    }
    
    btn.innerHTML = '🧠 Deep Scan';
    btn.disabled = false;
});

document.getElementById('refresh-btn')?.addEventListener('click', () => {
    const btn = document.getElementById('refresh-btn');
    btn.classList.add('spinning');
    fetchLiveData().finally(() => {
        setTimeout(() => btn.classList.remove('spinning'), 600);
    });
});

// ─── Init ────────────────────────────────────────────────────────────
// Show welcome state — user clicks "Fetch UC Data" to load
{
    const c = document.getElementById('stocks-container');
    c.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⚡</div>
            <h3>Ready to scan</h3>
            <p>Click <strong>Fetch UC Data</strong> to download the last 2 sessions from NSE</p>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════════════════
// Stock Detail Modal with 10-Day Volume + Price Chart
// ═══════════════════════════════════════════════════════════════════════

// Create modal DOM
const modalOverlay = document.createElement('div');
modalOverlay.className = 'modal-overlay';
modalOverlay.id = 'stock-modal';
modalOverlay.innerHTML = `
    <div class="modal-content">
        <div class="modal-header">
            <div>
                <h2 id="modal-symbol"></h2>
                <p id="modal-name" class="modal-name"></p>
            </div>
            <button class="modal-close" onclick="closeStockDetail()">&times;</button>
        </div>
        <div id="modal-stats" class="modal-stats"></div>
        <div class="modal-chart-container">
            <h3>10-Day Price & Volume</h3>
            <canvas id="modal-chart" width="800" height="360"></canvas>
        </div>
        <div id="modal-table" class="modal-table-container"></div>
        <div id="modal-news-container" class="modal-news-container">
            <h3>📰 Latest News</h3>
            <div id="modal-news" class="news-grid"></div>
        </div>
        <div id="modal-loading" class="modal-loading">
            <div class="loader"></div>
            <p id="modal-loading-text">Fetching 10-day history...</p>
            <div class="progress-bar-container">
                <div id="modal-progress-fill" class="progress-bar-fill"></div>
            </div>
        </div>
    </div>
`;
document.body.appendChild(modalOverlay);

// Close on overlay click
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeStockDetail();
});
// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeStockDetail();
});

function openStockDetail(symbol, name) {
    const modal = document.getElementById('stock-modal');
    document.getElementById('modal-symbol').textContent = symbol;
    document.getElementById('modal-name').textContent = name !== symbol ? name : '';
    document.getElementById('modal-stats').innerHTML = '';
    document.getElementById('modal-table').innerHTML = '';
    const newsContainer = document.getElementById('modal-news');
    newsContainer.innerHTML = '';
    document.getElementById('modal-news-container').style.display = 'none';
    
    // Reset and show loader
    document.getElementById('modal-loading').style.display = 'flex';
    document.getElementById('modal-loading-text').textContent = `Fetching 10-day history for ${symbol}...`;
    const progressFill = document.getElementById('modal-progress-fill');
    progressFill.style.width = '0%';
    progressFill.style.opacity = '1';

    // Clear canvas
    const canvas = document.getElementById('modal-chart');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Fetch news in parallel
    fetch(`/api/stock/${symbol}/news`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.news.length > 0) {
                renderModalNews(data.news);
            }
        })
        .catch(err => console.error("News fetch failed", err));

    // Fetch history using Server-Sent Events for progress
    const eventSource = new EventSource(`/api/stock/${symbol}/history/stream?days=10`);

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress') {
            progressFill.style.width = `${data.progress}%`;
            document.getElementById('modal-loading-text').textContent = `Downloading: ${data.date} (${data.progress}%)`;
        } 
        else if (data.type === 'complete') {
            eventSource.close();
            
            setTimeout(() => {
                document.getElementById('modal-loading').style.display = 'none';
                if (!data.data.success || !data.data.history.length) {
                    document.getElementById('modal-stats').innerHTML = '<p style="color:var(--text-muted)">No history data available</p>';
                    return;
                }
                renderModalStats(data.data);
                drawChart(data.data.history);
                renderHistoryTable(data.data.history);
            }, 300); // Small delay so user sees 100%
        }
        else if (data.type === 'error') {
            eventSource.close();
            document.getElementById('modal-loading').style.display = 'none';
            document.getElementById('modal-stats').innerHTML = `<p style="color:var(--danger)">Error: ${data.message}</p>`;
        }
    };
    
    eventSource.onerror = (err) => {
        eventSource.close();
        document.getElementById('modal-loading').style.display = 'none';
        document.getElementById('modal-stats').innerHTML = `<p style="color:var(--danger)">Connection to server lost.</p>`;
    };
}

function closeStockDetail() {
    document.getElementById('stock-modal').classList.remove('active');
    document.body.style.overflow = '';
}

function renderModalStats(data) {
    const h = data.history;
    const latest = h[h.length - 1];
    const oldest = h[0];
    const totalReturn = ((latest.close - oldest.close) / oldest.close * 100).toFixed(2);
    const maxVol = Math.max(...h.map(d => d.volume));
    const minPrice = Math.min(...h.map(d => d.low));
    const maxPrice = Math.max(...h.map(d => d.high));
    const ucDays = h.filter(d => d.isUC).length;

    document.getElementById('modal-stats').innerHTML = `
        <div class="mstat"><span class="mstat-val">${formatCurrency(latest.close)}</span><span class="mstat-lbl">Last Close</span></div>
        <div class="mstat"><span class="mstat-val ${parseFloat(totalReturn) >= 0 ? 'positive' : 'negative'}">${totalReturn > 0 ? '+' : ''}${totalReturn}%</span><span class="mstat-lbl">${data.days}-Day Return</span></div>
        <div class="mstat"><span class="mstat-val">${formatVolume(data.avgVolume)}</span><span class="mstat-lbl">Avg Volume</span></div>
        <div class="mstat"><span class="mstat-val">${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}</span><span class="mstat-lbl">Price Range</span></div>
        <div class="mstat"><span class="mstat-val" style="color:var(--warning-fire)">${ucDays}</span><span class="mstat-lbl">UC Days</span></div>
    `;
}

function renderHistoryTable(history) {
    const rows = history.map(d => {
        const cls = d.pctChange >= 0 ? 'positive' : 'negative';
        const sign = d.pctChange > 0 ? '+' : '';
        return `<tr${d.isUC ? ' class="uc-row"' : ''}>
            <td>${d.dateShort}</td>
            <td>${formatCurrency(d.open)}</td>
            <td>${formatCurrency(d.high)}</td>
            <td>${formatCurrency(d.low)}</td>
            <td><strong>${formatCurrency(d.close)}</strong></td>
            <td class="${cls}">${sign}${d.pctChange.toFixed(2)}%</td>
            <td>${formatVolume(d.volume)}</td>
            <td>${d.isUC ? '🔒 UC' : ''}</td>
        </tr>`;
    }).reverse().join('');

    document.getElementById('modal-table').innerHTML = `
        <table>
            <thead><tr>
                <th>Date</th><th>Open</th><th>High</th><th>Low</th><th>Close</th><th>Change</th><th>Volume</th><th>Status</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

// ─── Canvas Chart Drawing ────────────────────────────────────────────
function drawChart(history) {
    const canvas = document.getElementById('modal-chart');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 360 * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '360px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = 360;
    const pad = { top: 20, right: 60, bottom: 50, left: 65 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const n = history.length;
    const barW = Math.min(chartW / n * 0.55, 40);
    const gap = chartW / n;

    // Data ranges
    const prices = history.flatMap(d => [d.high, d.low]);
    const minP = Math.min(...prices) * 0.995;
    const maxP = Math.max(...prices) * 1.005;
    const volumes = history.map(d => d.volume);
    const maxV = Math.max(...volumes) * 1.2;

    // Y scalers
    const yPrice = (v) => pad.top + chartH - ((v - minP) / (maxP - minP)) * chartH;
    const yVol = (v) => pad.top + chartH - (v / maxV) * (chartH * 0.35);
    const xPos = (i) => pad.left + gap * i + gap / 2;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (chartH / 4) * i;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
        // Price label
        const pVal = maxP - ((maxP - minP) / 4) * i;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('₹' + pVal.toFixed(2), pad.left - 8, y + 4);
    }

    // Volume bars
    history.forEach((d, i) => {
        const x = xPos(i);
        const barH = (d.volume / maxV) * (chartH * 0.35);
        const barY = pad.top + chartH - barH;

        const isUC = d.isUC;
        const isUp = d.close >= d.prevClose;
        ctx.fillStyle = isUC
            ? 'rgba(255, 107, 53, 0.35)'
            : isUp ? 'rgba(0, 255, 136, 0.18)' : 'rgba(255, 51, 102, 0.18)';

        // Rounded top bar
        const r = Math.min(3, barW / 2);
        ctx.beginPath();
        ctx.moveTo(x - barW/2, pad.top + chartH);
        ctx.lineTo(x - barW/2, barY + r);
        ctx.quadraticCurveTo(x - barW/2, barY, x - barW/2 + r, barY);
        ctx.lineTo(x + barW/2 - r, barY);
        ctx.quadraticCurveTo(x + barW/2, barY, x + barW/2, barY + r);
        ctx.lineTo(x + barW/2, pad.top + chartH);
        ctx.closePath();
        ctx.fill();

        // Volume label on hover (always show for now)
        if (n <= 12) {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '9px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(formatVolume(d.volume), x, barY - 4);
        }
    });

    // Price line — area fill
    ctx.beginPath();
    history.forEach((d, i) => {
        const x = xPos(i);
        const y = yPrice(d.close);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    // Area
    const lastX = xPos(n - 1);
    ctx.lineTo(lastX, pad.top + chartH);
    ctx.lineTo(xPos(0), pad.top + chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    grad.addColorStop(0, 'rgba(0, 255, 136, 0.15)');
    grad.addColorStop(1, 'rgba(0, 255, 136, 0.01)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Price line — stroke
    ctx.beginPath();
    history.forEach((d, i) => {
        const x = xPos(i);
        const y = yPrice(d.close);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Price dots + UC markers
    history.forEach((d, i) => {
        const x = xPos(i);
        const y = yPrice(d.close);

        // Dot
        ctx.beginPath();
        ctx.arc(x, y, d.isUC ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = d.isUC ? '#ff6b35' : '#00ff88';
        ctx.fill();
        if (d.isUC) {
            ctx.strokeStyle = 'rgba(255, 107, 53, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Price label
        ctx.fillStyle = d.isUC ? '#ff6b35' : 'rgba(255,255,255,0.7)';
        ctx.font = `${d.isUC ? 'bold ' : ''}11px Inter`;
        ctx.textAlign = 'center';
        ctx.fillText('₹' + d.close.toFixed(2), x, y - 10);
    });

    // X-axis date labels
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px Inter';
    ctx.textAlign = 'center';
    history.forEach((d, i) => {
        const x = xPos(i);
        ctx.fillText(d.dateShort, x, pad.top + chartH + 20);
    });

    // Volume axis label
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    ctx.translate(W - 15, pad.top + chartH - 30);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Volume', 0, 0);
    ctx.restore();

    // Legend
    ctx.font = '11px Inter';
    ctx.textAlign = 'left';
    // Price legend
    ctx.fillStyle = '#00ff88';
    ctx.beginPath(); ctx.arc(pad.left + 10, H - 12, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Close Price', pad.left + 20, H - 8);
    // UC legend
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath(); ctx.arc(pad.left + 110, H - 12, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('UC Day', pad.left + 120, H - 8);
}

function renderModalNews(news) {
    const container = document.getElementById('modal-news-container');
    const grid = document.getElementById('modal-news');
    
    if (!news || news.length === 0) return;
    
    container.style.display = 'block';
    
    grid.innerHTML = news.map(item => {
        // Calculate time ago
        const date = new Date(item.pubDate);
        const diffMs = new Date() - date;
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        let timeAgo = diffHrs < 24 ? `${diffHrs}h ago` : `${Math.floor(diffHrs/24)}d ago`;
        if (diffHrs === 0) timeAgo = 'Just now';
        
        return `
            <a href="${item.link}" target="_blank" class="news-card">
                <div class="news-meta">
                    <span class="news-source">${item.source}</span>
                    <span class="news-time">${timeAgo}</span>
                </div>
                <h4 class="news-title">${item.title}</h4>
            </a>
        `;
    }).join('');
}

// ─── Initialization ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Auto-fetch data on load
    fetchLiveData();
});
async function fetchIPOData() {
    const container = document.getElementById('ipo-container');
    container.innerHTML = `
        <div class="ipo-loading">
            <div class="loader"></div>
            <p>Fetching live IPO data...</p>
        </div>`;
    try {
        const res = await fetch('/api/ipos');
        const data = await res.json();
        if(data.success) {
            ipoData = data.ipos;
            renderIPOs();
            updateIPOStats();
        }
    } catch(err) {
        console.error('Failed to fetch IPO data', err);
        container.innerHTML = '<div class="ipo-loading"><p style="color: var(--danger)">Failed to load IPO data.</p></div>';
    }
}

function updateIPOStats() {
    const active = ipoData.filter(i => i.status.toLowerCase().includes('open')).length;
    const upcoming = ipoData.filter(i => i.status.toLowerCase().includes('upcoming')).length;
    const highestGmp = Math.max(...ipoData.map(i => parseInt(i.gmp.replace(/[^0-9]/g, '')) || 0));
    document.getElementById('stat-consecutive').textContent = active;
    document.getElementById('stat-today').textContent = '₹' + highestGmp;
    document.getElementById('stat-yesterday').textContent = upcoming;

    // Fix #11: Update labels AND remove fire-specific styling
    const fireCard = document.querySelector('.stat-fire');
    fireCard.querySelector('.stat-label').textContent = 'Open IPOs';
    fireCard.style.background = 'linear-gradient(135deg, rgba(167, 139, 250, 0.06), rgba(167, 139, 250, 0.02))';
    fireCard.style.borderColor = 'rgba(167, 139, 250, 0.2)';
    document.getElementById('stat-consecutive').style.color = '#a78bfa';
    document.getElementById('stat-consecutive').style.textShadow = '0 0 20px rgba(167, 139, 250, 0.4)';
    document.getElementById('stat-today-label').textContent = 'Highest GMP';
    document.getElementById('stat-yesterday-label').textContent = 'Upcoming';
}

function renderIPOs() {
    const container = document.getElementById('ipo-container');
    if(ipoData.length === 0) {
        container.innerHTML = '<div class="ipo-loading"><div class="loader"></div><p>Loading IPOs...</p></div>';
        return;
    }
    
    let filtered = ipoData;
    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        filtered = ipoData.filter(i => i.name.toLowerCase().includes(q));
    }
    
    let html = `
    <table class="ipo-table">
        <thead>
            <tr>
                <th>IPO Name</th>
                <th>Price Band</th>
                <th>GMP</th>
                <th>Est. Listing</th>
                <th>IPO P/E</th>
                <th>Post P/E</th>
                <th>Peer P/E</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Last Updated</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    html += filtered.map((ipo) => {
        const gmpVal = parseInt(ipo.gmp.replace(/[^0-9-]/g, '')) || 0;
        const gmpColor = gmpVal > 0 ? 'var(--primary-accent)' : gmpVal < 0 ? 'var(--danger)' : 'var(--text-muted)';
        const gmpHighClass = gmpVal >= 50 ? ' gmp-high' : '';
        const safeName = ipo.name.replace(/'/g, "\\'");
        
        // Fix #5: Determine status badge class
        const statusLower = ipo.status.toLowerCase();
        let statusClass = 'status-closed';
        if (statusLower.includes('open')) statusClass = 'status-open';
        else if (statusLower.includes('upcoming')) statusClass = 'status-upcoming';
        
        // Fix #3: Trend emoji from source
        const trendEmoji = ipo.trend || '';
        
        return `
        <tr onclick="openIPODetail('${ipo.link}', '${safeName}')">
            <td class="primary-col">${ipo.name}</td>
            <td class="price-band-col">${ipo.priceBand || '—'}</td>
            <td class="gmp-cell${gmpHighClass}" style="color: ${gmpColor}">${ipo.gmp}<span class="gmp-trend">${trendEmoji}</span></td>
            <td class="est-listing-col">${ipo.estListing}</td>
            <td class="pe-col">${ipo.pe || 'N/A'}</td>
            <td class="pe-col">${ipo.postPe || 'N/A'}</td>
            <td class="pe-col">${ipo.peerPe || 'N/A'}</td>
            <td>${ipo.dates}</td>
            <td><span class="status-badge ${statusClass}">${ipo.status}</span></td>
            <td class="updated-col">${ipo.lastUpdated}</td>
        </tr>
        `;
    }).join('');
    
    html += `
        </tbody>
    </table>
    `;
    
    container.innerHTML = html;
}

async function openIPODetail(link, name) {
    const modal = document.getElementById('stock-modal');
    const container = document.getElementById('modal-chart-container');
    const newsContainer = document.getElementById('modal-news-container');
    document.getElementById('modal-symbol').textContent = name;
    document.getElementById('modal-company').textContent = 'Live GMP History';
    document.getElementById('modal-price').textContent = '';
    document.getElementById('modal-change').textContent = '';
    
    container.innerHTML = '<div style="text-align:center; padding: 40px; color: #00ff88">Fetching GMP History...</div>';
    newsContainer.style.display = 'none';
    modal.classList.add('active');
    
    try {
        const res = await fetch('/api/ipo/history?url=' + encodeURIComponent(link));
        const data = await res.json();
        if(data.success && data.history.length > 0) {
            let html = '<div class="modal-table-container"><table><thead><tr><th>Date</th><th>IPO GMP</th><th>Trend</th><th>Est. Listing</th></tr></thead><tbody>';
            data.history.forEach(row => {
                const gmpVal = parseInt((row.price || '0').replace(/[^0-9-]/g, '')) || 0;
                const gmpStyle = gmpVal > 0 ? 'color: var(--primary-accent)' : gmpVal < 0 ? 'color: var(--danger)' : '';
                html += `<tr>
                    <td>${row.date}</td>
                    <td style="${gmpStyle}; font-weight: 600">${row.price}</td>
                    <td>${row.gmp}</td>
                    <td>${row.estListing}</td>
                </tr>`;
            });
            html += '</tbody></table></div>';
            container.innerHTML = html;
        } else {
            container.innerHTML = '<div class="ipo-loading"><p style="color: var(--danger)">No GMP history available for this IPO.</p></div>';
        }
    } catch(err) {
        container.innerHTML = '<div class="ipo-loading"><p style="color: var(--danger)">Failed to fetch history.</p></div>';
    }
}

// ─── Momentum Logic ──────────────────────────────────────────────────
function fetchMomentumData() {
    const container = document.getElementById('momentum-container');
    container.innerHTML = `
        <div class="ipo-loading" style="color: #f59e0b">
            <div class="loader" style="border-top-color: #f59e0b"></div>
            <p id="momentum-loading-text">Connecting to server...</p>
            <div class="progress-bar-container" style="width: 200px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin-top: 15px; overflow: hidden;">
                <div id="momentum-progress-fill" style="width: 0%; height: 100%; background: #f59e0b; transition: width 0.3s ease;"></div>
            </div>
        </div>`;
    
    const eventSource = new EventSource('/api/momentum');
    
    eventSource.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'progress') {
            const pFill = document.getElementById('momentum-progress-fill');
            const pText = document.getElementById('momentum-loading-text');
            if (pFill) pFill.style.width = data.progress + '%';
            if (pText) pText.textContent = data.message;
        } else if (data.type === 'complete') {
            momentumData = data.data.stocks;
            if (currentTab === 'swing') {
                renderSwingStrategies();
            } else {
                renderMomentum();
                updateMomentumStats();
            }
            eventSource.close();
        } else if (data.type === 'error') {
            container.innerHTML = `<div class="ipo-loading"><p style="color: var(--danger)">Error: ${data.message}</p></div>`;
            eventSource.close();
        }
    };
    
    eventSource.onerror = () => {
        container.innerHTML = '<div class="ipo-loading"><p style="color: var(--danger)">Connection to server lost.</p></div>';
        eventSource.close();
    };
}

function updateMomentumStats() {
    if (!momentumData.length) return;
    
    // Top score
    const topStock = momentumData[0];
    
    // Avg return of top 50
    const avgReturn = momentumData.reduce((acc, s) => acc + s.return10d, 0) / momentumData.length;
    
    document.getElementById('stat-consecutive').textContent = topStock.symbol;
    document.getElementById('stat-today').textContent = avgReturn.toFixed(1) + '%';
    document.getElementById('stat-yesterday').textContent = momentumData.length;
    
    const fireCard = document.querySelector('.stat-fire');
    fireCard.querySelector('.stat-label').textContent = 'Top Momentum';
    fireCard.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(245, 158, 11, 0.02))';
    fireCard.style.borderColor = 'rgba(245, 158, 11, 0.2)';
    document.getElementById('stat-consecutive').style.color = '#f59e0b';
    document.getElementById('stat-consecutive').style.textShadow = '0 0 20px rgba(245, 158, 11, 0.4)';
    document.getElementById('stat-today-label').textContent = 'Avg 10D Return';
    document.getElementById('stat-yesterday-label').textContent = 'Stocks Found';
}

function renderSwingStrategies() {
    const container = document.getElementById('swing-container');
    
    if (momentumData.length === 0) {
        container.innerHTML = `
        <div class="ipo-loading" style="color: #4d7cff">
            <div class="loader" style="border-top-color: #4d7cff"></div>
            <p>Analyzing historical support & resistance for Swing setups...</p>
        </div>`;
        return;
    }
    
    // Get top momentum stocks with high score
    let candidates = momentumData.filter(s => s.momentumScore > 60);
    
    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        candidates = candidates.filter(i => i.name.toLowerCase().includes(q) || i.symbol.toLowerCase().includes(q));
    }
    
    if(candidates.length === 0) {
        container.innerHTML = '<div class="ipo-loading"><p>No high-probability swing setups found right now.</p></div>';
        return;
    }
    
    let html = '';
    candidates.forEach(stock => {
        const entry = stock.latestClose;
        
        // Smart Support & Resistance
        let stop = stock.low10d;
        // If the 10-day low is too far (e.g. > 15% away), set a tighter -5% stop loss
        if ((entry - stop) / entry > 0.15) {
            stop = entry * 0.95;
        }
        // If the 10-day low is exactly the entry, set a tight -3% stop loss
        if (stop >= entry) {
            stop = entry * 0.97;
        }
        
        const risk = entry - stop;
        const target = entry + (risk * 2); // Enforce 1:2 Risk/Reward
        
        // Check if our mathematical target is above the 10-day high (breakout trade)
        const isBreakout = target > stock.high10d;
        
        const safeName = stock.name.replace(/'/g, "\\'");
        
        html += `
        <div class="swing-card" onclick="openStockDetail('${stock.symbol}', '${safeName}', null)">
            <div class="swing-header">
                <div>
                    <div class="swing-symbol">${stock.symbol} ${isBreakout ? '🚀' : ''}</div>
                    <div class="swing-name">${stock.name}</div>
                </div>
                <div class="swing-rr" title="Risk/Reward 1:2">R:R 1:2</div>
            </div>
            
            <div class="swing-levels">
                <div class="swing-level">
                    <span class="level-label">Target (+${((target - entry) / entry * 100).toFixed(1)}%)</span>
                    <span class="level-value level-target">₹${target.toFixed(2)}</span>
                </div>
                <div class="swing-level" style="background: rgba(77, 124, 255, 0.1);">
                    <span class="level-label" style="color: rgba(77, 124, 255, 0.8)">Entry Zone</span>
                    <span class="level-value level-entry">₹${entry.toFixed(2)}</span>
                </div>
                <div class="swing-level">
                    <span class="level-label">Stop Loss (-${((entry - stop) / entry * 100).toFixed(1)}%)</span>
                    <span class="level-value level-stop">₹${stop.toFixed(2)}</span>
                </div>
            </div>
        </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderMomentum() {
    const container = document.getElementById('momentum-container');
    if(momentumData.length === 0) {
        container.innerHTML = '<div class="ipo-loading"><p>No momentum stocks found.</p></div>';
        return;
    }
    
    let filtered = momentumData;
    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        filtered = momentumData.filter(i => i.name.toLowerCase().includes(q) || i.symbol.toLowerCase().includes(q));
    }
    
    let html = `
    <table class="ipo-table momentum-table">
        <thead>
            <tr>
                <th>#</th>
                <th>Symbol & Name</th>
                <th>Price</th>
                <th>10D Return</th>
                <th>Green Days</th>
                <th>Vol Surge</th>
                <th>Momentum Score</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    html += filtered.map((stock, index) => {
        const scoreColor = `rgba(245, 158, 11, ${0.4 + (stock.momentumScore / 100) * 0.6})`;
        const safeName = stock.name.replace(/'/g, "\\'");
        
        return `
        <tr onclick="openStockDetail('${stock.symbol}', '${safeName}', null)">
            <td style="color: var(--text-muted); font-size: 0.85rem">${index + 1}</td>
            <td>
                <div class="primary-col">${stock.symbol}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px">${stock.name}</div>
            </td>
            <td style="font-family: 'Space Grotesk', sans-serif">₹${stock.latestClose}</td>
            <td style="color: var(--primary-accent); font-weight: 600">+${stock.return10d}%</td>
            <td>${stock.greenDays}/${stock.totalDays} <span style="font-size: 0.75rem; color: var(--text-muted)">(${stock.consecutiveGreen} consec)</span></td>
            <td>${stock.volumeSurge}x</td>
            <td style="width: 150px">
                <div style="display: flex; align-items: center; gap: 10px">
                    <span style="font-family: 'Space Grotesk', sans-serif; font-weight: 600; color: ${scoreColor}">${stock.momentumScore}</span>
                    <div style="flex: 1; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden">
                        <div style="width: ${stock.momentumScore}%; height: 100%; background: ${scoreColor}; box-shadow: 0 0 10px ${scoreColor}"></div>
                    </div>
                </div>
            </td>
        </tr>
        `;
    }).join('');
    
    html += `
        </tbody>
    </table>
    `;
    
    container.innerHTML = html;
}
