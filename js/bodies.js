// ASTRES décrits en JSON (objects/<astre>/<astre>.json, "kind": "body") : étoile (Soleil), planète (Terre, Mars), lune naturelle (Lune), comète (Halley)… même esprit que les engins (un dossier, un JSON, aucun code à toucher),
// mais un astre n'a pas de poussée ni de paliers : il a des CONSTANTES PHYSIQUES (rayon, masse, µ = GM, rotation), un MOUVEMENT (autour de quoi, quel modèle), un ASPECT (sphère peinte, étoile, comète avec queue), et des réglages d'AFFICHAGE (menu, vue, étiquette, trace).
// Pur (sans three.js) : testé dans Node (tools/test/bodies.test.js). Dépend de js/data/objects.js (FLIGHT_OBJECTS) et de js/ephemeris.js (EPH). Repère : géocentrique inertiel, axes de la scène (x, y = pôle nord, z), mètres.
//   bodyType   "star" | "planet" | "moon" | "comet" (| "asteroid", "dwarf") : choisit les valeurs par défaut de l'aspect
//   around     nom du corps central ("sun", "earth") ; sceneOrigin : true = le corps qui est l'origine de la scène (la Terre)
//   motion     { frame: "geocentric" | "heliocentric", model, … }
//                model "meeus-moon" | "meeus-sun" : formules de js/ephemeris.js (position géocentrique)
//                model "inverse", of: "sun" : position = opposé de celle d'un autre corps (la Terre vue du Soleil)
//                model "kepler" : éléments orbitaux autour de `around` (ecliptique J2000) : semiMajorAxisKm, eccentricity, inclinationDeg, nodeDeg, argPerigeeDeg, meanAnomalyDeg à l'époque epochD2000 (jours depuis J2000), periodDays
//   appearance { kind: "earth" | "painted" (painter) | "star" | "sphere" | "comet" (tail), color … }, orientation: "tidal-lock", trace { fullOrbit | pastDays, futureDays, color }, dot { color, minDistanceUnits }, label { text, metricText, minDistanceUnits | minDistanceRadii },
//   thirdBody : true = son attraction agit sur les engins (marée, voir ephThirdBody), info : sa distance est écrite dans l'info, menu { order, icon, mode | view { distanceUnits, text } } : entrée du sélecteur de vues.
const BODY = {
  get(id) { return typeof FLIGHT_OBJECTS !== 'undefined' && FLIGHT_OBJECTS[id] && FLIGHT_OBJECTS[id].kind === 'body' ? FLIGHT_OBJECTS[id] : null; },
  ids() { return Object.keys(FLIGHT_OBJECTS).filter(k => FLIGHT_OBJECTS[k].kind === 'body'); },
  list() { return this.ids().map(k => Object.assign({ id: k }, FLIGHT_OBJECTS[k])); },
  menu() { return this.list().filter(b => b.menu).sort((a, b) => a.menu.order - b.menu.order); },   // entrées du sélecteur de vues, dans l'ordre
  origin() { const o = this.list().find(b => b.sceneOrigin); return o ? o.id : 'earth'; },
  radiusUnits(id) { return this.get(id).radiusKm / this.get(this.origin()).radiusKm; },   // rayon en unités de la scène (rayon de la Terre = 1)
  // vecteur [x, y, z] (m) d'un corps relativement à son corps central, à la date D (jours depuis J2000), axes de la scène
  rel(id, D) {
    const b = this.get(id), m = b.motion; if (b.sceneOrigin && m.model !== 'inverse') return [0, 0, 0];
    if (m.model === 'meeus-moon') return EPH.moon(D).pos;
    if (m.model === 'meeus-sun') return EPH.sun(D);
    if (m.model === 'inverse') return this.geo(m.of, D).map(c => -c);
    if (m.model === 'kepler') return this.kepler(m, D);
    throw new Error('astre « ' + id + ' » : modèle de mouvement inconnu « ' + m.model + ' »');
  },
  // position géocentrique [x, y, z] (m) : la Terre est l'origine ; un astre « géocentrique » (Lune, Soleil) donne directement sa position ; un astre « héliocentrique » s'ajoute à celle de son corps central
  geo(id, D) {
    const b = this.get(id); if (b.sceneOrigin) return [0, 0, 0];
    const r = this.rel(id, D); if (b.motion.frame === 'geocentric' || !b.around) return r;
    const p = this.geo(b.around, D); return [p[0] + r[0], p[1] + r[1], p[2] + r[2]];
  },
  // éléments képlériens → position relative (ecliptique J2000 → équatorial → axes de la scène)
  kepler(m, D, Eover) {
    const R = Math.PI / 180, a = m.semiMajorAxisKm * 1000, e = m.eccentricity, M = m.meanAnomalyDeg * R + 2 * Math.PI / m.periodDays * (D - (m.epochD2000 || 0));
    let E = Eover != null ? Eover : (() => { const Mn = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); let x = Mn + e * Math.sin(Mn) / (1 - Math.sin(Mn + e) + Math.sin(Mn)); if (!isFinite(x)) x = e > 0.8 ? Math.PI : Mn; for (let i = 0; i < 60; i++) { const d = (x - e * Math.sin(x) - Mn) / (1 - e * Math.cos(x)); x -= d; if (Math.abs(d) < 1e-13) break; } return x; })();
    const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E), O = m.nodeDeg * R, w = m.argPerigeeDeg * R, i = m.inclinationDeg * R, co = Math.cos(O), so = Math.sin(O), cw = Math.cos(w), sw = Math.sin(w), ci = Math.cos(i), si = Math.sin(i);
    const X = xp * (co * cw - so * sw * ci) - yp * (co * sw + so * cw * ci), Y = xp * (so * cw + co * sw * ci) - yp * (so * sw - co * cw * ci), Z = xp * sw * si + yp * cw * si, eps = EPH.EPS;
    const Ye = Y * Math.cos(eps) - Z * Math.sin(eps), Ze = Y * Math.sin(eps) + Z * Math.cos(eps);
    return [X, Ze, -Ye];
  },
  // points de l'orbite complète relativement au corps central (n + 1 points) : par anomalie excentrique pour un modèle képlérien (régulier même pour une comète), par le temps pour les autres (la Terre : une année)
  orbitPoints(id, D, n) {
    const b = this.get(id), m = b.motion, out = [];
    if (m.model === 'kepler') for (let k = 0; k <= n; k++) out.push(this.kepler(m, D, 2 * Math.PI * k / n));
    else for (let k = 0; k <= n; k++) out.push(this.rel(id, D + k * m.periodDays / n));
    return out;
  },
  // distance (m) entre deux corps à la date D
  distance(a, b, D) { const p = this.geo(a, D), q = this.geo(b, D); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); },
};
