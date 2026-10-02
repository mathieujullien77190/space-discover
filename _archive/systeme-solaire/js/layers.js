// Calques : afficher / masquer les composants du système (panneau « Calques », mémorisé dans le navigateur).
const LAYER_DEFS = [
  ['Étoiles de fond', 'stars'], ['Orbites des planètes', 'planetOrbits'],
  ['Lunes', 'moons'], ['Orbites des lunes', 'moonOrbits'],
  ['Sondes', 'probes'], ['Trajectoires des sondes', 'trails'],
  ['Comètes', 'comets'], ['Orbites des comètes', 'cometOrbits'],
  ['Météorites (sur la Terre)', 'pins'], ['Étoiles voisines', 'neighbors'], ['Frontières, pays et villes (Terre)', 'borders'], ['Globes en 3D (three.js)', 'globes3d'], ['Photos plaquées sur les globes (NASA)', 'photos'], ['Fond schématique : pays colorés (Terre)', 'countryFill'], ['Reliefs nommés (cratères, monts…)', 'names'], ['Étiquettes', 'labels'],
];
const LAYERS_OFF = ['photos'];   // calques éteints au départ : la carte schématique est le fond par défaut, la photo NASA est une option
const LAYERS = Object.fromEntries(LAYER_DEFS.map(d => [d[1], !LAYERS_OFF.includes(d[1])]));
try { Object.assign(LAYERS, JSON.parse(localStorage.getItem('sys-layers') || '{}')); } catch (e) { /* stockage indisponible : tout reste affiché */ }
function saveLayers() { try { localStorage.setItem('sys-layers', JSON.stringify(LAYERS)); } catch (e) { /* ignoré */ } }

const layersEl = document.getElementById('layers');
let layersOpen = false;
function buildLayers() {
  layersEl.innerHTML = '';
  layersEl.append(mkBtn('⚙ Calques ' + (layersOpen ? '▴' : '▾'), layersOpen, () => { layersOpen = !layersOpen; buildLayers(); }));
  if (!layersOpen) return;
  const body = document.createElement('div'); body.className = 'layers-body';
  for (const [label, key] of LAYER_DEFS) {
    const row = document.createElement('label'), cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = LAYERS[key];
    cb.addEventListener('change', () => { LAYERS[key] = cb.checked; saveLayers(); });
    row.append(cb, ' ' + label); body.append(row);
  }
  const all = (v) => { for (const d of LAYER_DEFS) LAYERS[d[1]] = v; saveLayers(); buildLayers(); };
  const btns = document.createElement('div'); btns.className = 'layers-btns';
  btns.append(mkBtn('Tout', false, () => all(true)), mkBtn('Rien', false, () => all(false)));
  body.append(btns); layersEl.append(body);
}
// choisir un astre dont le calque est masqué le réactive (sinon on ne verrait rien)
function ensureLayerFor(b) {
  const key = b.probe ? 'probes' : b.comet ? 'comets' : b.parent && b.parent !== SUN ? 'moons' : null;
  if (key && !LAYERS[key]) { LAYERS[key] = true; saveLayers(); if (layersOpen) buildLayers(); }
}
