// Écrit js/data/plans.js : copie embarquée de tous les plans de data/plans/*.json (la page s'ouvre aussi en file://, où fetch ne lit pas les fichiers locaux).
// Ajouter un plan : poser son JSON dans data/plans/ et l'ajouter à PLAN_FILES (clé = nom utilisé dans FLIGHT_PLANS), puis `node tools/make-plan.js --wrap`.
const fs = require('fs'), path = require('path');
const PLAN_FILES = { kourou500: 'kourou-ariane5-500km.json', starship500: 'starbase-starship-500km.json' };
function writePlansJs(root) {
  const plans = {}, paths = {};
  for (const [k, f] of Object.entries(PLAN_FILES)) { const p = path.join(root, 'data', 'plans', f); if (fs.existsSync(p)) { plans[k] = JSON.parse(fs.readFileSync(p, 'utf8')); paths[k] = 'data/plans/' + f; } }
  const NL = String.fromCharCode(10);
  fs.writeFileSync(path.join(root, 'js', 'data', 'plans.js'), '// GÉNÉRÉ par tools/make-plan.js et tools/make-starship.js à partir de data/plans/*.json : ne pas éditer (modifier le JSON puis `node tools/make-plan.js --wrap`).' + NL + 'const FLIGHT_PLANS = ' + JSON.stringify(plans) + ';' + NL + 'const FLIGHT_PLAN_FILES = ' + JSON.stringify(paths) + ';' + NL);
  return Object.keys(plans);
}
module.exports = { writePlansJs, PLAN_FILES };
