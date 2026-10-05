// Modèle SVG de l'ISS, à l'échelle réelle, affiché quand on zoome assez sur la station (envergure 109 m, longueur 73 m).
// Repère du dessin : unités = mètres ; x = axe de la poutre (envergure), y = axe des modules, + y = avant (sens de la marche). Vue de dessus, simplifiée :
// poutre centrale, 8 ailes de panneaux solaires (35 m × 11,6 m), radiateurs, empilement de modules (Zvezda à l'arrière, Harmony à l'avant avec Columbus et Kibo),
// un Progress à l'arrière et une capsule Dragon à l'avant (les véhicules amarrés changent en réalité). L'orientation suit le repère de vol nominal
// (modules le long de la vitesse, poutre perpendiculaire au plan de l'orbite) projeté sur le plan de l'écran ; les panneaux, qui suivent le Soleil, sont montrés à plat.
const ISS_SPAN_M = 109, ISS_LEN_M = 73;

function buildIssSvg() {
  const rect = (x, y, w, h, a) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${a || ''}/>`;
  const wing = (cx, y0, y1) => {   // une aile : deux couvertures de panneaux de part et d'autre de la poutre
    const x = cx - 5.8, y = Math.min(y0, y1), h = Math.abs(y1 - y0);
    return rect(x, y, 11.6, h, 'fill="url(#sa)" stroke="#c9a227" stroke-width="0.35"') + rect(x, y, 11.6, h, 'fill="url(#cells)"');
  };
  const mod = (x0, x1, y0, y1) => rect(x0, y0, x1 - x0, y1 - y0, 'rx="1.1" fill="url(#md)" stroke="#8a8a82" stroke-width="0.22"');
  let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -44 120 88" width="1200" height="880">';
  s += '<defs>'
    + '<linearGradient id="sa" x1="0" x2="1"><stop offset="0" stop-color="#16265c"/><stop offset="0.5" stop-color="#2f4ba3"/><stop offset="1" stop-color="#16265c"/></linearGradient>'
    + '<pattern id="cells" width="1.45" height="2.9" patternUnits="userSpaceOnUse"><rect width="1.45" height="2.9" fill="none" stroke="#a9bcff" stroke-width="0.07" opacity="0.55"/></pattern>'
    + '<linearGradient id="md" x1="0" x2="1"><stop offset="0" stop-color="#9c9c94"/><stop offset="0.45" stop-color="#f4f4ee"/><stop offset="1" stop-color="#a6a69e"/></linearGradient>'
    + '<linearGradient id="tr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c3c7cf"/><stop offset="1" stop-color="#737881"/></linearGradient>'
    + '<linearGradient id="rd" x1="0" x2="1"><stop offset="0" stop-color="#cfd6dd"/><stop offset="0.5" stop-color="#f7f9fb"/><stop offset="1" stop-color="#cfd6dd"/></linearGradient>'
    + '</defs>';
  for (const sx of [-1, 1]) for (const cx of [28, 45]) s += wing(sx * cx, 1.2, 36.2) + wing(sx * cx, -36.2, -1.2);        // 8 ailes de panneaux : P4, S4, P6, S6 (avant et arrière)
  for (const sx of [-1, 1]) s += rect(sx * 15 - 2.5, 1.2, 5, 23, 'fill="url(#rd)" stroke="#aeb7c0" stroke-width="0.2"') + rect(sx * 15 - 2.5, -24.2, 5, 23, 'fill="url(#rd)" stroke="#aeb7c0" stroke-width="0.2"');   // radiateurs
  s += rect(-54.5, -1.3, 109, 2.6, 'fill="url(#tr)" stroke="#555a62" stroke-width="0.2"');                               // poutre de 109 m
  for (const x of [-40.5, -27, -13.5, 0, 13.5, 27, 40.5]) s += `<line x1="${x}" y1="-1.3" x2="${x}" y2="1.3" stroke="#4a4e55" stroke-width="0.25"/>`;
  for (const sx of [-1, 1]) s += rect(sx * 28 - 1.2, -1.5, 2.4, 3, 'fill="#7b7f87"') + rect(sx * 45 - 1.2, -1.5, 2.4, 3, 'fill="#7b7f87"');   // articulations des panneaux
  s += rect(2.1, -33, 9, 4, 'fill="url(#sa)" stroke="#c9a227" stroke-width="0.25"') + rect(-11.1, -33, 9, 4, 'fill="url(#sa)" stroke="#c9a227" stroke-width="0.25"');   // petits panneaux de Zvezda
  s += mod(-1.4, 1.4, -41, -36) + mod(-2.1, 2.1, -36, -23) + mod(-2.05, 2.05, -23, -10) + mod(-2.2, 2.2, -10, -4.8) + mod(-2.15, 2.15, -4.8, 3.8) + mod(-2.2, 2.2, 3.8, 10.6);   // Progress, Zvezda, Zarya, Unity, Destiny, Harmony
  s += mod(2.2, 8.9, 5.2, 9.6) + mod(-13.8, -2.2, 4.6, 9.2) + rect(-17, 5.1, 3.2, 3, 'rx="0.5" fill="#c9c9c1" stroke="#8a8a82" stroke-width="0.2"');   // Columbus, Kibo et sa plateforme exposée
  s += '<path d="M-2 10.6 L2 10.6 L1.5 15.6 L-1.5 15.6 Z" fill="#eceef2" stroke="#8a8f99" stroke-width="0.2"/>' + rect(-1.6, 15.6, 3.2, 3.4, 'fill="#2b2e35"');   // capsule Dragon amarrée à l'avant
  return s + '</svg>';
}
const ISS_IMG = typeof Image !== 'undefined' ? (() => { const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(buildIssSvg()); return im; })() : null;

// Largeur du modèle en pixels pour l'échelle k (px/km). TRICHE ASSUMÉE : à l'échelle réelle la station (109 m) serait invisible tant qu'on n'est pas à quelques km.
// Le modèle est donc agrandi, MAIS sa taille suit le zoom (il grossit quand on zoome, rétrécit quand on dézoome) : facteur constant ISS_EXAG = 350 pour un rayon de vue
// ≥ 100 km (≈ 150 px à 100 km, ≈ 30 px à 500 km, ≈ 15 px à 1 000 km, où le repère reprend la main) ; en dessous de 100 km le facteur décroît doucement (∝ R^0,75)
// jusqu'à 1, l'échelle réelle (à ~40 m de rayon de vue), sans jamais faire reculer la taille affichée quand on zoome.
const ISS_EXAG = 350, ISS_EXAG_KM = 100;
function issExag(viewKm) { return viewKm >= ISS_EXAG_KM ? ISS_EXAG : Math.max(1, ISS_EXAG * Math.pow(viewKm / ISS_EXAG_KM, 0.75)); }
function issModelPx(k) { return ISS_SPAN_M * k / 1000 * issExag(Math.min(W, H) / 2 / k); }
// dessine le modèle centré en s = [x, y] ; retourne false s'il n'est pas prêt
function drawIssModel(p, s, k) {
  if (!ISS_IMG || !ISS_IMG.complete || !ISS_IMG.naturalWidth || !p.relEcl || !p.velEcl) return false;
  const m = issModelPx(k) / ISS_SPAN_M, r = p.relEcl, v = p.velEcl, vl = Math.hypot(v[0], v[1], v[2]) || 1;
  const nx = r[1] * v[2] - r[2] * v[1], ny = r[2] * v[0] - r[0] * v[2], nz = r[0] * v[1] - r[1] * v[0], nl = Math.hypot(nx, ny, nz) || 1;   // normale à l'orbite = axe de la poutre
  // l'axe x du dessin (poutre) et l'axe y (avant) sont projetés sur l'écran (y vers le bas) ; l'échelle est en pixels par mètre (agrandie : voir issModelPx)
  ctx.save(); ctx.transform(nx / nl * m, -ny / nl * m, v[0] / vl * m, -v[1] / vl * m, s[0], s[1]);
  ctx.drawImage(ISS_IMG, -60, -44, 120, 88); ctx.restore();
  return true;
}
