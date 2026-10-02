// node tools/test/apollo-data.test.js : continuité des trajectoires générées (js/data/apollo11.js)
const fs = require('fs'), vm = require('vm'), ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../../js/data/apollo11.js', 'utf8') + ';this.A=APOLLO11', ctx);
const A = ctx.A;
for (const k in A.veh) {
  const a = A.veh[k]; let worst = 0, at = 0, big = 0;
  for (let i = 1; i < a.length; i++) { const dt = a[i][0] - a[i - 1][0]; if (dt <= 0.02) continue; const d = Math.hypot(a[i][1] - a[i - 1][1], a[i][2] - a[i - 1][2]), v = (Math.hypot(a[i][3], a[i][4]) + Math.hypot(a[i - 1][3], a[i - 1][4])) / 2 * dt, r = Math.abs(d - v) / Math.max(1, v); if (r > worst) { worst = r; at = a[i][0] / 3600; } if (r > 0.1) big++; }
  console.log(k.padEnd(5), String(a.length).padStart(5), 'éch.', (a[0][0] / 3600).toFixed(2) + ' h → ' + (a[a.length - 1][0] / 3600).toFixed(2) + ' h', ' pire écart déplacement/vitesse×dt', (worst * 100).toFixed(1) + ' % à ' + at.toFixed(2) + ' h', ' (>10 % : ' + big + ')');
}
console.log('stats', JSON.stringify(A.stats));
