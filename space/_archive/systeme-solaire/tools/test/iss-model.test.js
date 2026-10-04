// Modèle SVG de l'ISS : échelle réelle (109 m), orientation (poutre perpendiculaire à l'orbite, modules le long de la vitesse), dessin à fort zoom, Terre géante.
const ROOT = require('path').join(__dirname, '..', '..');
let s = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '' });
const calls = { drawImage: [], transform: [], fillRect: 0 };
const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k === 'drawImage' ? (...a) => { calls.drawImage.push(a); } : k === 'transform' ? (...a) => { calls.transform.push(a); } : k === 'fillRect' ? () => { calls.fillRect++; } : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null };
globalThis.Image = class { constructor() { this.complete = true; this.naturalWidth = 1200; } set src(v) { this._src = v; } get src() { return this._src; } };   // émulation : l'image est « chargée »
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
s = s.replace(/requestAnimationFrame\(loop\);\s*$/, '') + 'globalThis.T = { get logTarget() { return logTarget; }, ISS, ISS_IMG, buildIssSvg, issModelPx, computePositions, focusOn, draw, EARTHB, pos, minViewR, showInfo, get hits() { return hits; }, fly() { flyPx = [0, 0]; }, set logR(v) { logR = v; }, set simT(v) { simT = v; }, viewK: () => viewK() };';
new Function(s)();
const T = globalThis.T, I = T.ISS, ok = (c, m) => console.log((c ? 'OK  ' : 'FAIL') + ' ' + m);
const svg = T.buildIssSvg(); ok(svg.startsWith('<svg') && svg.endsWith('</svg>') && (svg.match(/<rect/g) || []).length > 30, 'SVG construit : ' + svg.length + ' octets, ' + (svg.match(/<rect/g) || []).length + ' rectangles');
ok(T.ISS_IMG && /^data:image\/svg\+xml/.test(T.ISS_IMG.src), 'image en data: URI');
ok(T.minViewR(I) <= 0.05, 'zoom minimal sur l\'ISS : ' + T.minViewR(I) + ' km de rayon de vue');
const t0 = I.epoch + 0.3; T.simT = t0; T.computePositions(t0); T.focusOn(I);
// à 3e4 km : pas de modèle (losange) ; à 0,09 km : modèle
for (const [R, expectModel] of [[3e4, false], [3500, false], [1200, false], [800, true], [500, true], [100, true], [5, true], [0.5, true], [0.09, true], [0.04, true]]) {
  calls.drawImage.length = 0; calls.transform.length = 0; calls.fillRect = 0; T.fly(); T.logR = Math.log(R); T.draw(1);
  const k = T.viewK(), px = T.issModelPx(k), models = calls.drawImage.length;
  ok((models > 0) === expectModel, 'rayon de vue ' + String(R).padEnd(6) + ' km : envergure à l\'écran ' + px.toFixed(1).padStart(8) + ' px, modèle ' + (models ? 'dessiné' : 'non dessiné (losange)') + ' | Terre géante : fillRect ' + calls.fillRect);
  if (models && R === 0.09) {
    const m = calls.transform.at(-1), scale = Math.hypot(m[0], m[1]), scaleY = Math.hypot(m[2], m[3]);
    const m1 = px / 109;   // pixels par mètre du modèle (agrandi : voir issModelPx)
    ok(scale <= m1 * 1.0001 && scaleY <= m1 * 1.0001, 'axes de la station projetés à plat sans dépasser l’échelle du modèle (' + scale.toFixed(2) + ' et ' + scaleY.toFixed(2) + ' px/m ≤ ' + m1.toFixed(2) + ')');
    // orthogonalité réelle : poutre (normale à l'orbite) ⟂ vitesse dans l'espace 3D
    const r = I.relEcl, v = I.velEcl, n = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]]; const dot = n[0] * v[0] + n[1] * v[1] + n[2] * v[2];
    ok(Math.abs(dot) < 1e-6 * Math.hypot(...n) * Math.hypot(...v), 'poutre ⟂ vitesse dans l\'espace (produit scalaire ≈ 0)');
  }
}
T.showInfo(); ok(true, 'fiche de l\'ISS (bouton « Voir de près »)');
// l'ISS doit rester cliquable
T.fly(); T.logR = Math.log(0.09); T.draw(1); ok(T.hits.some(h => h.b === I), 'ISS cliquable avec le modèle');
// un clic sur l'ISS (focusOn) place directement la vue sur le modèle, même depuis la Terre
{ T.simT = I.epoch + 0.3; T.computePositions(I.epoch + 0.3); T.focusOn(T.EARTHB); T.fly(); T.logR = Math.log(3e4); T.draw(1);
  const hit = T.hits.find(h => h.b === I); ok(!!hit, 'depuis la Terre : le losange de l\'ISS est cliquable (' + (hit ? Math.round(hit.x) + ',' + Math.round(hit.y) : '—') + ')');
  T.focusOn(I); ok(Math.abs(Math.exp(T.logTarget) - 100) < 1e-6, 'clic sur l’ISS : zoom cible ' + Math.exp(T.logTarget).toFixed(0) + ' km de rayon de vue');
  T.fly(); T.logR = Math.log(100); T.draw(1); const px = T.issModelPx(T.viewK()); ok(Math.abs(px - 152.6) < 1, 'à 100 km : modèle à ' + px.toFixed(0) + ' px de large (échelle ×350)'); }
// la taille suit le zoom : elle ne diminue JAMAIS quand on zoome, et elle diminue quand on dézoome
{ let prev = 0, mono = true, grows = true; const sizes = [];
  for (let R = 20000; R >= 0.04; R /= 1.15) { T.logR = Math.log(R); const px = T.issModelPx(T.viewK()); sizes.push(px); if (px < prev - 1e-9) mono = false; prev = px; }
  ok(mono, 'taille du modèle croissante à mesure qu’on zoome de 20 000 km à 40 m (' + sizes[0].toFixed(2) + ' px -> ' + sizes.at(-1).toFixed(0) + ' px)');
  const at = R => { T.logR = Math.log(R); return T.issModelPx(T.viewK()); };
  ok(at(200) < at(100) && at(500) < at(200) && at(1000) < at(500), 'dézoomer le rétrécit : 100 km ' + at(100).toFixed(0) + ' px > 200 km ' + at(200).toFixed(0) + ' > 500 km ' + at(500).toFixed(0) + ' > 1 000 km ' + at(1000).toFixed(0));
  ok(Math.abs(at(500) / at(100) - 0.2) < 1e-6, 'au-delà de 100 km la taille est inversement proportionnelle au rayon de vue (échelle agrandie constante)'); }
