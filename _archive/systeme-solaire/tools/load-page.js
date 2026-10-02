// Charge les scripts de index.html (dans l'ordre des balises <script src>) en une seule source JS, pour les tester dans Node avec un faux DOM.
// Usage : const src = require('./tools/load-page.js')();   puis  new Function(src + ' ...exposer des variables...')();
const fs = require('fs'), path = require('path');
module.exports = function loadPage(root = path.join(__dirname, '..')) {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
  return srcs.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
};
