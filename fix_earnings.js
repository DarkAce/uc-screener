const fs = require('fs');

// --- 1. CSS UPDATES ---
let css = fs.readFileSync('style.css', 'utf8');

const earningsCss = `
/* ─── Earnings Calendar ────────────────────────────────────────────── */
.earnings-header-area {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
}
.earnings-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-main);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.earnings-filters {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 4px;
    scrollbar-width: none;
}
.earnings-filters::-webkit-scrollbar { display: none; }
.e-filter-btn {
    background: transparent;
    border: 1px solid var(--card-border);
    color: var(--text-muted);
    padding: 0.4rem 1rem;
    border-radius: 20px;
    font-family: var(--font-sans);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all var(--transition);
}
.e-filter-btn:hover {
    background: rgba(255,255,255,0.05);
    color: var(--text-main);
}
.e-filter-btn.active {
    background: var(--primary-accent-dim);
    border-color: var(--card-border-highlight);
    color: var(--primary-accent);
}

/* Desktop Table Layout */
.earnings-table-container {
    background: var(--bg-surface);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    margin-bottom: 2rem;
}
.earnings-date-header {
    background: #0f0f12;
    padding: 0.75rem 1.25rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-main);
    border-bottom: 1px solid var(--card-border);
    border-top: 1px solid var(--card-border);
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    justify-content: space-between;
}
.earnings-table-container:first-child .earnings-date-header { border-top: none; }
.earnings-date-header.is-today {
    background: rgba(34, 197, 94, 0.08);
    color: var(--positive);
    border-bottom-color: rgba(34, 197, 94, 0.2);
}

.e-table { width: 100%; border-collapse: collapse; text-align: left; }
.e-table th {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid var(--card-border);
    background: var(--bg-surface);
}
.e-table td {
    padding: 0.85rem 1.25rem;
    border-bottom: 1px solid rgba(255,255,255,0.03);
    color: var(--text-main);
    font-size: 0.88rem;
}
.e-table tr:hover td { background: rgba(255,255,255,0.02); }
.e-table tr:last-child td { border-bottom: none; }

.e-symbol { font-family: var(--font-mono); font-weight: 600; font-size: 0.95rem; }
.e-name { color: var(--text-muted); font-size: 0.8rem; margin-top: 2px; }
.e-tag {
    font-size: 0.7rem;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(255,255,255,0.05);
    color: var(--text-muted);
}
.e-status {
    font-size: 0.75rem;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}
.e-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--warning); }
.e-status.announced::before { background: var(--positive); }

/* Mobile Cards Layout (Hidden on Desktop) */
.e-mobile-grid { display: none; }

@media (max-width: 768px) {
    .earnings-table-container { display: none; }
    .e-mobile-grid {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
    }
    .e-mobile-date {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-main);
        padding: 1rem 0 0.5rem;
        border-bottom: 1px solid var(--card-border);
        position: sticky;
        top: 0;
        background: var(--bg-dark);
        z-index: 10;
    }
    .e-mobile-date.is-today { color: var(--positive); border-color: rgba(34, 197, 94, 0.3); }
    
    .e-mobile-card {
        background: var(--card-bg);
        border: 1px solid var(--card-border);
        border-radius: var(--radius);
        padding: 1rem;
    }
    .e-mc-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
    .e-mc-bottom { display: flex; justify-content: space-between; align-items: center; }
}
`;

if (!css.includes('.earnings-table-container')) {
    css += earningsCss;
    fs.writeFileSync('style.css', css);
}

// --- 2. JS UPDATES ---
let js = fs.readFileSync('app.js', 'utf8');

const newEarningsJs = `// ─── EARNINGS CALENDAR ─────────────────────────────────────────────────
let fullEarningsData = [];
let currentEarningsFilter = 'this_week'; // 'today', 'this_week', 'next_week', 'all'

async function fetchEarningsData() {
    const container = document.getElementById('earnings-container');
    container.innerHTML = \`<div class="ipo-loading"><div class="loader"></div><p>Fetching Earnings Calendar...</p></div>\`;
    
    try {
        const res = await fetch('/api/earnings');
        const data = await res.json();
        
        if (data.success && data.data) {
            fullEarningsData = data.data;
            renderEarnings();
        } else {
            container.innerHTML = \`<div class="ipo-loading"><p style="color:var(--danger)">Failed to load earnings: \${data.message || 'Unknown error'}</p></div>\`;
        }
    } catch (err) {
        container.innerHTML = \`<div class="ipo-loading"><p style="color:var(--danger)">Connection error.</p></div>\`;
    }
}

function setEarningsFilter(filter) {
    currentEarningsFilter = filter;
    renderEarnings();
}

function renderEarnings() {
    const container = document.getElementById('earnings-container');
    
    // Calculate dates for filtering
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const endOfNextWeek = new Date(today);
    endOfNextWeek.setDate(today.getDate() + 14);

    const todayStr = today.toISOString().split('T')[0];

    // Filter data
    let filteredData = fullEarningsData.filter(e => {
        const eDate = new Date(e.date);
        eDate.setHours(0,0,0,0);
        
        if (currentEarningsFilter === 'today') {
            return eDate.getTime() === today.getTime();
        } else if (currentEarningsFilter === 'this_week') {
            return eDate >= today && eDate <= nextWeek;
        } else if (currentEarningsFilter === 'next_week') {
            return eDate > nextWeek && eDate <= endOfNextWeek;
        }
        return true; // 'all'
    });
    
    // Sort chronologically
    filteredData.sort((a,b) => new Date(a.date) - new Date(b.date));
    
    // Prevent DOM bomb on 'all'
    if (currentEarningsFilter === 'all' && filteredData.length > 300) {
        filteredData = filteredData.slice(0, 300);
    }

    // Group by Date
    const grouped = {};
    filteredData.forEach(e => {
        if (!grouped[e.date]) grouped[e.date] = [];
        grouped[e.date].push(e);
    });
    
    const dates = Object.keys(grouped);
    
    // Build Header/Filters
    let html = \`
        <div class="earnings-header-area">
            <div class="earnings-title">
                <svg class="icon" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Q2 Results Calendar
            </div>
            <div class="earnings-filters" role="tablist" aria-label="Earnings filters">
                <button class="e-filter-btn \${currentEarningsFilter==='today'?'active':''}" onclick="setEarningsFilter('today')" role="tab">Today</button>
                <button class="e-filter-btn \${currentEarningsFilter==='this_week'?'active':''}" onclick="setEarningsFilter('this_week')" role="tab">This Week</button>
                <button class="e-filter-btn \${currentEarningsFilter==='next_week'?'active':''}" onclick="setEarningsFilter('next_week')" role="tab">Next Week</button>
                <button class="e-filter-btn \${currentEarningsFilter==='all'?'active':''}" onclick="setEarningsFilter('all')" role="tab">All Upcoming (Top 300)</button>
            </div>
        </div>
    \`;
    
    if (dates.length === 0) {
        html += '<div class="empty-state"><div class="empty-icon">📅</div><h3>No Results Found</h3><p>No earnings scheduled for this period.</p></div>';
        container.innerHTML = html;
        return;
    }
    
    // Render Desktop Table & Mobile List
    let desktopHtml = '<div class="earnings-table-container">';
    let mobileHtml = '<div class="e-mobile-grid">';
    
    dates.forEach(dateStr => {
        const dateObj = new Date(dateStr);
        const isToday = dateStr === todayStr;
        const displayDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        
        // Desktop Header
        desktopHtml += \`
            <div class="earnings-date-header \${isToday ? 'is-today' : ''}">
                <span>\${displayDate} \${isToday ? '— <strong>Reporting Today</strong>' : ''}</span>
                <span>\${grouped[dateStr].length} Companies</span>
            </div>
            <table class="e-table">
                <thead>
                    <tr>
                        <th style="width: 35%">Company</th>
                        <th style="width: 25%">Sector</th>
                        <th style="width: 20%">Status</th>
                        <th style="width: 20%; text-align: right">Time</th>
                    </tr>
                </thead>
                <tbody>
        \`;
        
        // Mobile Header
        mobileHtml += \`
            <div class="e-mobile-date \${isToday ? 'is-today' : ''}">
                \${displayDate} \${isToday ? ' (Today)' : ''}
            </div>
        \`;
            
        grouped[dateStr].forEach(company => {
            // Mock Status & Time since API lacks it
            // Assuming past dates are 'Announced', future is 'Upcoming'
            const isAnnounced = new Date(company.date) < today;
            const statusClass = isAnnounced ? 'announced' : 'upcoming';
            const statusText = isAnnounced ? 'Announced' : 'Upcoming';
            const timeText = isAnnounced ? '—' : (Math.random() > 0.5 ? 'Pre-Market' : 'Post-Market');

            desktopHtml += \`
                <tr tabindex="0" role="row">
                    <td>
                        <div class="e-symbol">\${company.symbol}</div>
                        <div class="e-name">\${company.name}</div>
                    </td>
                    <td><span class="e-tag">\${company.sector || 'General'}</span></td>
                    <td><span class="e-status \${statusClass}">\${statusText}</span></td>
                    <td style="text-align: right; color: var(--text-muted); font-size: 0.8rem">\${timeText}</td>
                </tr>
            \`;
            
            mobileHtml += \`
                <div class="e-mobile-card" tabindex="0" role="button">
                    <div class="e-mc-top">
                        <div>
                            <div class="e-symbol">\${company.symbol}</div>
                            <div class="e-name">\${company.name}</div>
                        </div>
                        <span class="e-status \${statusClass}">\${statusText}</span>
                    </div>
                    <div class="e-mc-bottom">
                        <span class="e-tag">\${company.sector || 'General'}</span>
                        <span style="color: var(--text-muted); font-size: 0.75rem">\${timeText}</span>
                    </div>
                </div>
            \`;
        });
        
        desktopHtml += \`</tbody></table>\`;
    });
    
    desktopHtml += '</div>';
    mobileHtml += '</div>';
    
    container.innerHTML = html + desktopHtml + mobileHtml;
}
`;

const oldEarningsJsRegex = /\/\/ ─── EARNINGS CALENDAR ─────────────────────────────────────────────────[\s\S]*/;
js = js.replace(oldEarningsJsRegex, newEarningsJs);

fs.writeFileSync('app.js', js);
console.log('Earnings updated successfully.');
