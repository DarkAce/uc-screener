const fs = require('fs');

let css = fs.readFileSync('style.css', 'utf8');

// Update theme colors to deep neutral grays (Zerodha Kite / Linear style)
const themeUpdate = `:root {
    --bg-dark: #0f1115;
    --bg-surface: #16181d;
    --card-bg: #1c1f26;
    --card-bg-hover: #22252e;
    --card-border: rgba(255, 255, 255, 0.08);
    --card-border-highlight: rgba(255, 255, 255, 0.16);
    
    --primary-accent: #e2e4e9;
    --primary-accent-dim: rgba(255, 255, 255, 0.06);
    
    --secondary-accent: #8b92a5;
    
    --positive: #16c784;
    --positive-dim: rgba(22, 199, 132, 0.1);
    
    --warning: #f5b028;
    --warning-dim: rgba(245, 176, 40, 0.1);
    
    --danger: #ea3943;
    
    --text-main: #f1f2f5;
    --text-muted: #9ba1b0;
    
    --radius: 8px;
    --radius-lg: 12px;
    --transition: 0.2s ease;
}`;

css = css.replace(/:root\s*\{[\s\S]*?--transition: 0\.2s ease;\r?\n\}/, themeUpdate);

// Also make the earnings date header match the new surface
css = css.replace(/\.earnings-date-header \{\r?\n    background: #0f0f12;/g, `.earnings-date-header {\n    background: var(--bg-dark);`);

fs.writeFileSync('style.css', css);

let js = fs.readFileSync('app.js', 'utf8');

// Add Indian formatting utility
const indianFormat = `const formatIndianNumber = (num) => {
    if (!num) return '—';
    const x = num.toString().split('.');
    let lastThree = x[0].substring(x[0].length - 3);
    const otherNumbers = x[0].substring(0, x[0].length - 3);
    if (otherNumbers !== '') lastThree = ',' + lastThree;
    const res = otherNumbers.replace(/\\B(?=(\\d{2})+(?!\\d))/g, ",") + lastThree;
    return x.length > 1 ? res + '.' + x[1] : res;
};`;

if (!js.includes('formatIndianNumber')) {
    js = js.replace('const formatCurrency = (val) =>', indianFormat + '\nconst formatCurrency = (val) =>');
    fs.writeFileSync('app.js', js);
}

console.log('Design system tokens updated.');
