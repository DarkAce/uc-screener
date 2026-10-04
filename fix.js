const fs = require('fs');
let d = fs.readFileSync('app.js', 'utf8');
d = d.replace("stocksContainer.style.display = 'block';", "stocksContainer.style.display = 'grid';");
fs.writeFileSync('app.js', d);
