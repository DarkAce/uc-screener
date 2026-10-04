const fs = require('fs');

// 1. UPDATE INDEX.HTML (SVG Icons, Fonts)
let html = fs.readFileSync('index.html', 'utf8');

// Add JetBrains Mono
html = html.replace(
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">',
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">'
);

const svgIcons = {
    portfolio: `<svg class="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
    ipo: `<svg class="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M2 12h4l3-9 5 18 3-9h5"></path></svg>`,
    consecutive: `<svg class="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
    '3day': `<svg class="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    '5day': `<svg class="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon><circle cx="12" cy="12" r="1"></circle></svg>`,
    today: `<svg class="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
    yesterday: `<svg class="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="20" x2="18" y2="4"></line><line x1="12" y1="20" x2="12" y2="10"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>`,
    momentum: `<svg class="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`,
    swing: `<svg class="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
    earnings: `<svg class="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`
};

html = html.replace(/<span class="icon">💼<\/span>/, svgIcons.portfolio);
html = html.replace(/<span class="icon">🚀<\/span>/, svgIcons.ipo);
html = html.replace(/<span class="icon">🔥<\/span>/, svgIcons.consecutive);
html = html.replace(/<span class="icon">🔥🔥<\/span>/, svgIcons['3day']);
html = html.replace(/<span class="icon">🚀<\/span>/, svgIcons['5day']);
html = html.replace(/<span class="icon">📊<\/span>/, svgIcons.today);
html = html.replace(/<span class="icon">📈<\/span>/, svgIcons.yesterday);
html = html.replace(/<span class="icon">⚡<\/span>/, svgIcons.momentum);
html = html.replace(/<span class="icon">🎯<\/span>/, svgIcons.swing);
html = html.replace(/<span class="icon">📅<\/span>/, svgIcons.earnings);

fs.writeFileSync('index.html', html);


// 2. CSS UPGRADES
let css = fs.readFileSync('style.css', 'utf8');

// Replace Root Vars
const newRoot = `:root {
    --bg-dark: #000000;
    --bg-surface: #0a0a0a;
    --card-bg: #111111;
    --card-bg-hover: #161616;
    --card-border: rgba(255, 255, 255, 0.08);
    --card-border-highlight: rgba(255, 255, 255, 0.15);
    
    --primary-accent: #e2e2e2;
    --primary-accent-dim: rgba(255, 255, 255, 0.05);
    
    --secondary-accent: #8e8ea0;
    
    --positive: #22c55e;
    --positive-dim: rgba(34, 197, 94, 0.1);
    
    --warning: #f59e0b;
    --warning-dim: rgba(245, 158, 11, 0.1);
    
    --danger: #ef4444;
    
    --text-main: #eeeeee;
    --text-muted: #888888;
    
    --radius: 8px;
    --radius-lg: 12px;
    --transition: 0.2s ease;
}`;

css = css.replace(/:root\s*\{[\s\S]*?\}/, newRoot);

// Global typography fixes
css = css.replace(/font-family: 'Inter', system-ui, -apple-system, sans-serif;/g, "font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;\n    letter-spacing: -0.01em;");

// Cards styling to be linear-like
css = css.replace(/\.stock-card\s*\{[\s\S]*?border-radius: 20px;[\s\S]*?box-shadow:[\s\S]*?\}/, `.stock-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
    position: relative;
    cursor: pointer;
    transition: transform var(--transition), border-color var(--transition), background var(--transition);
    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
    transform: translateY(10px);
}`);

css = css.replace(/\.stock-card:hover\s*\{[\s\S]*?\}/, `.stock-card:hover {
    transform: translateY(-2px);
    background: var(--card-bg-hover);
    border-color: var(--card-border-highlight);
}`);

// Stock Symbol mono font
css = css.replace(/\.stock-symbol\s*\{[\s\S]*?\}/, `.stock-symbol {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--text-main);
    letter-spacing: -0.5px;
}`);

// Price formatting
css = css.replace(/\.current-price\s*\{[\s\S]*?\}/, `.current-price {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.4rem;
    font-weight: 600;
    letter-spacing: -0.5px;
    color: var(--text-main);
}`);

// Button formatting
css = css.replace(/\.generate-btn\s*\{[\s\S]*?\}/, `.generate-btn {
    background: #ffffff;
    color: #000000;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-family: 'Inter', sans-serif;
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
}`);

css = css.replace(/\.generate-btn:hover\s*\{[\s\S]*?\}/, `.generate-btn:hover {
    background: #f0f0f0;
}`);

// Sidebar nav 
css = css.replace(/\.tab-btn\.active\s*\{[\s\S]*?\}/, `.tab-btn.active {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
    font-weight: 500;
}`);

// Top bar border
css = css.replace(/border-bottom: 1px solid var\(--card-border\);/g, "border-bottom: 1px solid rgba(255,255,255,0.05);");
css = css.replace(/border-right: 1px solid var\(--card-border\);/g, "border-right: 1px solid rgba(255,255,255,0.05);");

// Inputs
css = css.replace(/input, select\s*\{[\s\S]*?backdrop-filter: blur\(10px\);\n\}/, `input, select {
    background: transparent;
    border: 1px solid var(--card-border);
    color: var(--text-main);
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-family: 'Inter', sans-serif;
    font-size: 0.82rem;
    outline: none;
    transition: border-color 0.2s ease;
}`);

css = css.replace(/input:focus, select:focus\s*\{[\s\S]*?\}/, `input:focus, select:focus {
    border-color: rgba(255, 255, 255, 0.3);
}`);

// Remove glow shadows
css = css.replace(/box-shadow: 0 0 6px rgba\([^)]+\);/g, "");
css = css.replace(/box-shadow: inset 0 1px 0[^;]+;/g, "");

// Scrollbars (Premium)
css += `
/* Custom Scrollbars */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
`;

fs.writeFileSync('style.css', css);

console.log('Premium upgrades applied to HTML and CSS.');
