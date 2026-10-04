const fs = require('fs');
let d = fs.readFileSync('app.js', 'utf8');
d = d.replace(/e\.target\.classList\.add\('active'\);\s*currentTab = e\.target\.dataset\.tab \|\| e\.target\.closest\('\.tab-btn'\)\.dataset\.tab;/, 
"const targetBtn = e.target.closest('.tab-btn');\n        if (targetBtn) targetBtn.classList.add('active');\n        currentTab = targetBtn ? targetBtn.dataset.tab : null;");
fs.writeFileSync('app.js', d);
