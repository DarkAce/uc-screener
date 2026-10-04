const fs = require('fs');

let css = fs.readFileSync('style.css', 'utf8');

// Replace the desktop .tab-btn
css = css.replace(/\.tab-btn \{\r?\n    width: 100%;\r?\n    display: flex;\r?\n    align-items: center;\r?\n    background: transparent;\r?\n    border: none;\r?\n    color: var\(--text-muted\);\r?\n    padding: 0\.65rem 0\.75rem;\r?\n    border-radius: 8px;\r?\n    font-size: 0\.85rem;\r?\n    font-weight: 500;\r?\n    cursor: pointer;\r?\n    text-align: left;\r?\n    transition: all 0\.2s ease;\r?\n    margin-bottom: 0\.25rem;\r?\n\}/, 
`.tab-btn {
    width: 100%;
    display: flex;
    align-items: center;
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 0.65rem 0.75rem;
    min-height: 44px; /* Ensure 44px touch target */
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s ease;
    margin-bottom: 0.25rem;
}`);

// Replace the mobile query `.tab-btn` if it exists and looks like the old one
css = css.replace(/\.tab-btn \{ width: auto; margin: 0; padding: 0\.6rem 1rem; border-radius: 20px; min-height: 44px; \}/,
                 ".tab-btn { width: auto; margin: 0; padding: 0.6rem 1rem; border-radius: 20px; min-height: 44px; justify-content: center; }");

fs.writeFileSync('style.css', css);
console.log('Fixed touch targets.');
