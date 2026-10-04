const fs = require('fs');
const appJs = fs.readFileSync('app.js', 'utf8');
const start = appJs.indexOf("if (currentTab === 'ipo')");
const end = appJs.indexOf("// Restore stat-fire card");
console.log(appJs.substring(start, end + 50));
