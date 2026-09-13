const name = "O'REILLY";
const symbol = "ORE";

// What we want:
// <div onclick="openStockDetail('ORE', 'O\'REILLY')">

const html = `<div onclick="openStockDetail('${symbol}', '${name.replace(/'/g, "\\'")}')">`;
console.log(html);
