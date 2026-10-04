// Éphémérides du Soleil et de la Lune (formules approchées de Meeus, précision ≈ 0,3° pour la Lune) : fonctions PURES, sans three.js, partagées par la scène (js/moon.js) et par le moteur de vol (js/flight-object.js,
// attraction de la Lune et du Soleil). Repère INERTIEL (équatorial) en axes de la scène : (X, Y, Z)équatorial → (X, Z, −Y) ; y = pôle nord ; mètres. Pour passer au repère de la Terre fixe : tourner de −GMST autour de y.
const EPH = {
  AU_M: 149597870700, MU_SUN: 1.32712440018e20, MU_MOON: 4.9048695e12, EPS: 23.4393 * Math.PI / 180,
  days: ms => ms / 86400000 + 2440587.5 - 2451545,                                       // jours depuis J2000 (ms : date en millisecondes UTC)
  gmst: D => (((280.46061837 + 360.98564736629 * D) % 360) + 360) % 360 * Math.PI / 180,   // temps sidéral de Greenwich (rad)
  sun(D) {                                                                               // Terre → Soleil, [x, y, z] en mètres
    const r = Math.PI / 180, M = (357.528 + 0.9856003 * D) * r, lam = (280.46 + 0.9856474 * D + 1.915 * Math.sin(M) + 0.02 * Math.sin(2 * M)) * r, R = 1.00014 - 0.01671 * Math.cos(M) - 0.00014 * Math.cos(2 * M), E = this.EPS, k = R * this.AU_M;
    return [k * Math.cos(lam), k * Math.sin(lam) * Math.sin(E), -k * Math.sin(lam) * Math.cos(E)];   // (X, Y, Z) → (X, Z, −Y)
  },
  moon(D) {                                                                              // Terre → Lune : { pos: [x, y, z] en mètres, km }
    const r = Math.PI / 180, L = 218.316 + 13.176396 * D, M = (134.963 + 13.064993 * D) * r, F = (93.272 + 13.22935 * D) * r, E = this.EPS;
    const lon = (L + 6.289 * Math.sin(M)) * r, lat = 5.128 * Math.sin(F) * r, km = 385001 - 20905 * Math.cos(M);
    const ra = Math.atan2(Math.sin(lon) * Math.cos(E) - Math.tan(lat) * Math.sin(E), Math.cos(lon)), dec = Math.asin(Math.sin(lat) * Math.cos(E) + Math.cos(lat) * Math.sin(E) * Math.sin(lon)), d = km * 1000;
    return { pos: [d * Math.cos(dec) * Math.cos(ra), d * Math.sin(dec), -d * Math.cos(dec) * Math.sin(ra)], km };
  },
};
// Attraction de la Lune et du Soleil sur un objet (effet de marée : on est dans le repère de la Terre, qui tombe elle aussi vers ces astres) : a = Σ μ [ (d − r) / |d − r|³ − d / |d|³ ], positions inertielles.
// Renvoie une fonction (t, x, y) → [ax, ay] (m/s²) pour un vol dans le plan « vertical du site + direction du tir » figé à la date du départ (celui de flyObject) : x = verticale du site, y = direction (azimut),
// la composante hors plan est ignorée. lat, lon, azimut en degrés ; date0 = instant du départ (Date) ; t en secondes de vol. Les positions des astres sont recalculées toutes les 60 s (ils bougent peu).
function ephThirdBody(latDeg, lonDeg, azDeg, date0) {
  const D = Math.PI / 180, la = latDeg * D, lo = lonDeg * D, az = azDeg * D, cl = Math.cos(la), D0 = EPH.days(date0.getTime()), g0 = EPH.gmst(D0), cg = Math.cos(-g0), sg = Math.sin(-g0);
  const s = [cl * Math.cos(lo), Math.sin(la), -cl * Math.sin(lo)], east = [-Math.sin(lo), 0, -Math.cos(lo)], north = [-Math.sin(la) * Math.cos(lo), cl, Math.sin(la) * Math.sin(lo)];
  const e = east.map((c, i) => c * Math.sin(az) + north[i] * Math.cos(az)), n = [s[1] * e[2] - s[2] * e[1], s[2] * e[0] - s[0] * e[2], s[0] * e[1] - s[1] * e[0]], dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const toPlane = v => { const w = [v[0] * cg + v[2] * sg, v[1], -v[0] * sg + v[2] * cg]; return [dot(w, s), dot(w, e), dot(w, n)]; };   // inertiel → repère de la Terre à l'instant de départ → (verticale, direction, hors plan)
  let tCache = -1e9, B = null;
  return (t, x, y) => {
    if (t - tCache >= 60 || t < tCache) { tCache = t; const Dt = D0 + t / 86400; B = [[EPH.MU_MOON, toPlane(EPH.moon(Dt).pos)], [EPH.MU_SUN, toPlane(EPH.sun(Dt))]]; }
    let ax = 0, ay = 0;
    for (const [mu, d] of B) { const rx = d[0] - x, ry = d[1] - y, rz = d[2], r3 = Math.pow(rx * rx + ry * ry + rz * rz, 1.5), d3 = Math.pow(d[0] * d[0] + d[1] * d[1] + d[2] * d[2], 1.5); ax += mu * (rx / r3 - d[0] / d3); ay += mu * (ry / r3 - d[1] / d3); }
    return [ax, ay];
  };
}
