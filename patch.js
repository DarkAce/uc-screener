async function fetchIPOData() {
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
    }
}

function updateIPOStats() {
    const active = ipoData.filter(i => i.status.toLowerCase().includes('open')).length;
    const highestGmp = Math.max(...ipoData.map(i => parseInt(i.gmp.replace(/[^0-9]/g, '')) || 0));
    document.getElementById('stat-consecutive').textContent = active;
    document.getElementById('stat-today').textContent = '₹' + highestGmp;
    document.getElementById('stat-yesterday').textContent = ipoData.length;
    document.querySelector('.stat-fire .stat-label').textContent = 'Active IPOs';
    document.getElementById('stat-today-label').textContent = 'Highest GMP';
    document.getElementById('stat-yesterday-label').textContent = 'Total Listed';
}

function renderIPOs() {
    const container = document.getElementById('ipo-container');
    if(ipoData.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>Loading IPOs...</h3></div>';
        return;
    }
    
    let filtered = ipoData;
    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        filtered = ipoData.filter(i => i.name.toLowerCase().includes(q));
    }
    
    container.innerHTML = filtered.map((ipo, idx) => {
        const gmpVal = parseInt(ipo.gmp.replace(/[^0-9-]/g, '')) || 0;
        const gmpColor = gmpVal > 0 ? '#00ff88' : gmpVal < 0 ? '#ff3366' : '#8a8d9e';
        const safeName = ipo.name.replace(/'/g, "\\'");
        return `
        <div class="stock-card" style="animation: slideUp 0.4s ease ${idx * 0.05}s both" onclick="openIPODetail('${ipo.link}', '${safeName}')">
            <div class="card-header">
                <div class="symbol-box">
                    <h3 class="symbol">${ipo.name}</h3>
                    <span class="company-name">${ipo.dates}</span>
                </div>
                <div class="price-box">
                    <h3 class="price" style="color: ${gmpColor}">${ipo.gmp}</h3>
                    <span class="pct-change pos">GMP</span>
                </div>
            </div>
            <div class="card-body">
                <div class="stat-row">
                    <span class="stat-label">Est. Listing</span>
                    <span class="stat-value">${ipo.estListing}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Status</span>
                    <span class="stat-value" style="color: #00ff88">${ipo.status}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Last Updated</span>
                    <span class="stat-value" style="color: #4d7cff; font-size: 0.8rem;">${ipo.lastUpdated}</span>
                </div>
            </div>
        </div>
        `;
    }).join('');
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
            let html = '<table style="width:100%; text-align:left; border-collapse: collapse; margin-top: 15px;">';
            html += '<tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: #8a8d9e; text-align: left;"><th>Date</th><th>Price</th><th>GMP</th><th>Est. Listing</th></tr>';
            data.history.forEach(row => {
                html += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 10px 0">${row.date}</td>
                    <td>${row.price}</td>
                    <td style="color: #00ff88">${row.gmp}</td>
                    <td>${row.estListing}</td>
                </tr>`;
            });
            html += '</table>';
            container.innerHTML = html;
        } else {
            container.innerHTML = '<div style="text-align:center; padding: 40px; color: #ff3366">No GMP history available.</div>';
        }
    } catch(err) {
        container.innerHTML = '<div style="text-align:center; padding: 40px; color: #ff3366">Failed to fetch history.</div>';
    }
}
