const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');

const dom = new JSDOM(html, { runScripts: "outside-only" });
const window = dom.window;

// Polyfill missing things
window.fetch = async () => ({ json: async () => ({}) });
window.EventSource = class { constructor() {} };

try {
    window.eval(js);
    console.log("No syntax/init errors on load!");
    
    // Simulate clicking a tab
    const event = new window.MouseEvent('click');
    window.document.querySelector('[data-tab="ipo"]').dispatchEvent(event);
    console.log("Tab click worked without errors.");
    
} catch(e) {
    console.error("ERROR ON LOAD:", e);
}
