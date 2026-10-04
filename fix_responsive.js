const fs = require('fs');

// --- 1. A11Y and Breakpoint CSS Fixes ---
let css = fs.readFileSync('style.css', 'utf8');

// A11y: Fix contrast for --text-muted
css = css.replace(/--text-muted: #888888;/g, "--text-muted: #a0a0a0;");

// A11y: Add focus-visible styles globally
const focusCss = `
/* Accessibility: Focus Rings */
*:focus-visible {
    outline: 2px solid var(--primary-accent);
    outline-offset: 2px;
}
.stock-card:focus-visible {
    outline: 2px solid var(--primary-accent);
    outline-offset: 4px;
}
`;
if (!css.includes('*:focus-visible')) {
    css += focusCss;
}

// Mobile: Increase tap targets
css = css.replace(/\.tab-btn \{[\s\S]*?padding: 0\.65rem 1rem;[\s\S]*?\}/, `.tab-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-family: var(--font-sans);
    font-size: 0.88rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0.8rem 1rem; /* Increased for 44px touch target */
    min-height: 44px;
    position: relative;
    transition: color 0.2s ease;
    white-space: nowrap;
}`);

// Mobile Media Query refinements
css = css.replace(/\.tab-btn \{ width: auto; margin: 0; padding: 0\.5rem 0\.8rem; border-radius: 20px; \}/g, 
                 ".tab-btn { width: auto; margin: 0; padding: 0.6rem 1rem; border-radius: 20px; min-height: 44px; }");

// IPO Table mobile overflow
css = css.replace(/\.ipo-table-container \{[\s\S]*?\}/, `.ipo-table-container {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius);
    animation: slideUp 0.4s ease both;
}`);

// Modal mobile refinements
css = css.replace(/@media \(max-width: 768px\) \{[\s\S]*?\.modal-content \{ padding: 1\.5rem; width: 95%; \}[\s\S]*?\}/, `@media (max-width: 768px) {
    .modal-content { 
        padding: 1.5rem; 
        width: 100%; 
        height: 100dvh; 
        max-height: 100dvh; 
        border-radius: 0;
        transform: translateY(100%);
    }
    .modal-overlay.active .modal-content { transform: translateY(0); }
    .modal-chart-container { padding: 1rem; }
    .modal-chart-container canvas { height: 250px !important; }
    .modal-stats { grid-template-columns: 1fr 1fr; }
}`);

// --- 2. HTML Fixes ---
let html = fs.readFileSync('index.html', 'utf8');

// Add aria-hidden to all svgs
html = html.replace(/<svg class="icon"/g, '<svg class="icon" aria-hidden="true"');

// Fix focusable cards (We need to add tabindex to cards in JS, but we can do it in app.js)

fs.writeFileSync('style.css', css);
fs.writeFileSync('index.html', html);


// --- 3. JS Fixes (Add tabindex to cards for keyboard nav) ---
let js = fs.readFileSync('app.js', 'utf8');

js = js.replace(/<div class="stock-card \${isConsecutive2 \? 'consecutive-card' : ''}"/g, 
                `<div class="stock-card \${isConsecutive2 ? 'consecutive-card' : ''}" tabindex="0" role="button" aria-label="\${s.name || s.symbol} stock details" onkeydown="if(event.key==='Enter') openStockDetail('\${s.symbol}', '\${(s.name || s.symbol).replace(/'/g, "\\\\'")}')"`);

fs.writeFileSync('app.js', js);

console.log("Responsive and A11y fixes applied.");
