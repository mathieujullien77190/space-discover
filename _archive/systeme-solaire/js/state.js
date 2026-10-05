// État : temps, caméra, focus, relecture du voyage d'une sonde.
// =====================================================================
//  ÉTAT : temps, caméra
// =====================================================================
const canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
let W = 0, H = 0, dpr = 1;
function resize() { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
addEventListener('resize', resize); resize();

let simT = (Date.now() - J2000) / DAYMS;     // jours depuis J2000
let speed = 1;                                // jours simulés par seconde réelle
let playing = true;
const LOG_MAX = Math.log(1.2e15);   // jusqu'à ~125 années-lumière : les étoiles voisines
const OVERVIEW_R = 8e9;
let focus = SUN, logR = Math.log(OVERVIEW_R), logTarget = logR;
let pan = [0, 0];            // décalage libre en km (glisser)
let flyPx = [0, 0];          // décalage de transition en pixels, qui s'estompe

let overview = true;

const viewK = () => (Math.min(W, H) / 2) / Math.exp(logR);   // pixels par km
const minViewR = b => b.probe ? (b.minView || 2e6) : b.comet ? 1e5 : b === EARTHB ? 150 : Math.max(5, b.R * 0.3);   // la Terre : jusqu'à 150 km de rayon de vue (au-dessus d'un pays)
let camSun = false;     // la caméra reste centrée sur le Soleil (sondes lointaines : on les voit s'éloigner de nous ; orbite entière d'une comète)
let replay = false, replayP = null;   // relecture du voyage d'une sonde depuis son lancement
let menu = null;        // liste ouverte sous les puces : 'probes' | 'comets' | 'meteo'
let selStar = null;     // étoile voisine choisie
let selMeteo = null;    // météorite choisie (la Terre tourne pour la montrer)
const planeDist = b => Math.hypot(pos[b.idx][0], pos[b.idx][1]);
const camZoom = b => Math.log(Math.max(b.zoomMin || 3.5e8, 1.35 * planeDist(b)));
function worldTarget() { return camSun ? [0, 0] : pos[focus.idx]; }
function curCenter() { const k = viewK(), t = worldTarget(); return [t[0] + pan[0] + flyPx[0] / k, t[1] + pan[1] - flyPx[1] / k]; }

function stopReplay() { replay = false; }   // la vue reste telle quelle (la caméra continue sur le Soleil)
function focusOn(b, how) {
  const k = viewK(), oldC = curCenter();
  replay = false; selMeteo = null; selStar = null; issFollow = false; selCountry = null; launchView = false; ensureLayerFor(b);
  camSun = how === 'orbit' ? true : !!(b.probe && b.cam === 'sun');
  const t = camSun ? [0, 0] : pos[b.idx];
  focus = b; pan = [0, 0]; overview = false;
  menu = b.probe ? 'probes' : b.comet ? 'comets' : null;
  // décalage de transition : la caméra glisse de l'ancien centre vers le nouvel astre
  flyPx = [(oldC[0] - t[0]) * k, -(oldC[1] - t[1]) * k];
  if (how === 'system' && b.moons.length) logTarget = Math.log(Math.max(...b.moons.map(m => m.a)) * 1.25);
  else if (how === 'overview') { focus = SUN; camSun = false; overview = true; logTarget = Math.log(OVERVIEW_R); }
  else if (how === 'orbit') logTarget = Math.log(b.e < 1 ? Math.max(1.2e9, 1.15 * b.Q) : Math.max(4.5e9, 1.3 * Math.hypot(b.pos3[0], b.pos3[1])));
  else if (b.probe) logTarget = camSun ? camZoom(b) : Math.log(b.zoom);
  else if (b.comet) logTarget = Math.log(3e8);
  else logTarget = Math.log(Math.max(minViewR(b) * 1.2, b.R * 3));
  buildChips(); showInfo(); fadeHint();
}
// étoile voisine : la vue se centre sur l'étoile (la fiche donne sa distance, le temps de la lumière et le temps de Voyager 1)
function selectStar(st) {
  focusOn(SUN, 'overview'); selStar = st; menu = 'stars'; overview = true;
  pan = [st.x, st.y]; flyPx = [0, 0]; logTarget = Math.log(Math.max(3e12, st.ly * LY * 0.35));
  buildChips(); showInfo();
}
// météorite : on va sur la Terre, qui tourne pour montrer le repère au centre
function selectMeteo(m) {
  focusOn(EARTHB); if (!LAYERS.pins) { LAYERS.pins = true; saveLayers(); if (layersOpen) buildLayers(); } selMeteo = m; menu = 'meteo';
  buildChips(); showInfo();
}

// relance le voyage d'une sonde depuis son lancement, vitesse adaptée (lente aux rencontres, puis plus rapide)
function startReplay(p) {
  replayP = p; replay = true; camSun = true; overview = false; focus = p; pan = [0, 0]; flyPx = [0, 0]; selMeteo = null; menu = 'probes';
  simT = p.t0 - 2; speed = 15; playing = true;
  logR = logTarget = Math.log(p.zoomMin || 3.5e8);
  buildChips(); showInfo(); refreshTime(); fadeHint();
}
function replayStep() {
  if (!replay) return;
  const p = replayP, nowT = (Date.now() - J2000) / DAYMS, endT = Math.min(nowT, p.tEnd);
  let d = 1e9; for (const e of p.events) d = Math.min(d, Math.abs(simT - e.t));
  speed = Math.max(12, Math.min(365.256 * 0.8, 0.25 * d));
  logTarget = camZoom(p);
  if (simT >= endT) {
    simT = endT; replay = false;
    if (endT >= nowT) speed = 1 / 86400; else playing = false;
    refreshTime(); if (p.cam === 'follow') focusOn(p);
  }
}
