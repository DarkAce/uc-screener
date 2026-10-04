const fs = require('fs');

let css = fs.readFileSync('style.css', 'utf8');

// 1. A11y Contrast
css = css.replace(/--text-muted: #888888;/g, "--text-muted: #a0a0a0;");

// 2. A11y Focus Rings
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

// 3. Mobile Tab Buttons (Desktop)
css = css.replace(/\.tab-btn \{[\s\S]*?padding: 0\.65rem 1rem;[\s\S]*?\}/, `.tab-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-family: var(--font-sans);
    font-size: 0.88rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0.8rem 1rem;
    min-height: 44px;
    position: relative;
    transition: color 0.2s ease;
    white-space: nowrap;
}`);

// 4. Mobile Tab Buttons (Mobile Query)
css = css.replace(/\.tab-btn \{ width: auto; margin: 0; padding: 0\.5rem 0\.8rem; border-radius: 20px; \}/g, 
                 ".tab-btn { width: auto; margin: 0; padding: 0.6rem 1rem; border-radius: 20px; min-height: 44px; }");

// 5. IPO Table mobile scroll
css = css.replace(/\.ipo-table-container \{[\s\S]*?\}/, `.ipo-table-container {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius);
    animation: slideUp 0.4s ease both;
}`);

// 6. Mobile Modal Refinements
const modalRegex = /@media \(max-width: 768px\) \{\r?\n    \.modal-content \{ padding: 1\.5rem; width: 95%; \}\r?\n    \.modal-chart-container \{ padding: 1rem; \}\r?\n    \.modal-chart-container canvas \{ height: 250px !important; \}\r?\n\}/;
const newModalCss = `@media (max-width: 768px) {
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
}`;
css = css.replace(modalRegex, newModalCss);

fs.writeFileSync('style.css', css);
console.log('Fixed CSS.');
