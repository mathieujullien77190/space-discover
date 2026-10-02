// Moteur physique générique : tout ce qu'on envoie (fusée, étage, booster, coiffe, satellite, sonde, missile…) est un `Body` décrit par un MODÈLE (masses, forme, moteur) et un ÉTAT initial
// (position, vitesse, direction) ; le moteur le fait évoluer comme dans la vraie vie, à peu près : gravité en 1/r², traînée atmosphérique (densité exponentielle, vent relatif dû à la rotation de la Terre),
// poussée avec Isp variable avec la pression, consommation de propergol, guidage branchable. Un débris (booster, coiffe, étage vidé) n'a besoin d'AUCUN code : on lui passe son modèle (masse, dimensions)
// et son état à la séparation, le coefficient balistique en découle (masse / (Cd·surface moyenne)).
// Mouvement dans le plan orbital défini par la position et la vitesse initiales (x : direction de la verticale au départ, y : sens du mouvement horizontal) : plan x, y en mètres, repère inertiel.
// Sans DOM : fonctions pures, testables dans Node (tools/test/physics.test.js).
const PH = { MU: 3.986004418e14, RE: 6378137, WE: 7.2921159e-5, G0: 9.80665, H: 7200, RHO0: 1.225 };
const phRho = h => PH.RHO0 * Math.exp(-Math.max(h, 0) / PH.H);

// accélération (gravité + traînée + poussée) d'un corps de masse m, de coefficient de traînée cdA (m²), poussé de F newtons vers (tx, ty) ; wEff = vitesse angulaire du vent dû à la rotation de la Terre dans le plan
function phAccel(x, y, vx, vy, m, F, tx, ty, cdA, wEff) {
  const r = Math.hypot(x, y), h = r - PH.RE, g = PH.MU / (r * r), vrx = vx + wEff * y, vry = vy - wEff * x, vrel = Math.hypot(vrx, vry);   // vitesse relative à l'air : v − ω×r
  const q = 0.5 * phRho(h) * vrel * vrel, D = q * cdA;
  return { ax: F / m * tx - g * x / r - (vrel > 1e-6 ? D / m * vrx / vrel : 0), ay: F / m * ty - g * y / r - (vrel > 1e-6 ? D / m * vry / vrel : 0), q, h, g };
}

// surface frontale moyenne (m²) d'un corps qui culbute (théorème de Cauchy : un quart de la surface d'un solide convexe) ; end-on : vu par le bout
// shape : { type: 'cyl' (r, h) | 'shell' (r, h : demi-coque ouverte) | 'sphere' (r) | 'box' (a, b, c) }
function shapeArea(shape, mode) {
  const s = shape || { type: 'sphere', r: 1 };
  if (s.type === 'sphere') return Math.PI * s.r * s.r;
  if (s.type === 'box') return mode === 'end-on' ? s.a * s.b : (s.a * s.b + s.b * s.c + s.a * s.c) / 2;
  if (s.type === 'shell') return mode === 'end-on' ? Math.PI * s.r * s.r / 2 : (2 * s.r * s.h) * 0.7;    // demi-coque : surface projetée de côté × recouvrement moyen
  return mode === 'end-on' ? Math.PI * s.r * s.r : (Math.PI * s.r * s.r + Math.PI * s.r * s.h) / 2;       // cylindre fermé : S/4 = (2πr² + 2πrh)/4
}
// coefficient de traînée × surface d'un modèle : Cd par défaut 1,0 (corps épais qui culbute) ou 0,5 (profilé, vu par le bout)
function modelCdA(model, mode) { return (model.cd != null ? model.cd : (mode === 'end-on' ? 0.5 : 1.0)) * shapeArea(model.shape, mode); }

class Body {
  // model : { name, dry (kg), prop (kg), shape, cd, cdA (écrase le calcul), engine: { thrust (N, vide) | burn (s), ispV, ispS (s), profile: 'const' | 'srb' } }
  // state : { x, y, vx, vy, t } (plan orbital, repère inertiel) ; opt : { wEff (vent, rad/s), extraMass (kg : charge utile), guidance, mode: 'tumble' | 'end-on' }
  constructor(model, state, opt) {
    const o = opt || {};
    this.model = model; this.tStart = state.t || 0; this.x = state.x; this.y = state.y; this.vx = state.vx; this.vy = state.vy; this.t = state.t || 0;
    this.prop = model.prop || 0; this.extra = o.extraMass || 0; this.wEff = o.wEff || 0; this.guidance = o.guidance || null; this.mode = o.mode || 'tumble';
    this.cdA = model.cdA != null ? model.cdA : modelCdA(model, this.mode);
    const e = model.engine; this.engine = e ? Object.assign({ ispV: 300, ispS: 270, profile: 'const' }, e) : null;
    if (this.engine) { this.mdot0 = this.engine.thrust ? this.engine.thrust / (this.engine.ispV * PH.G0) : (model.prop || 0) / this.engine.burn; this.tIgnite = this.t; }
  }
  mass() { return (this.model.dry || 0) + this.prop + this.extra; }
  // poussée (N) et débit (kg/s) à l'instant courant
  engineNow(t) {
    const e = this.engine; if (!e || this.prop <= 0 || (this.cutoff != null && t >= this.cutoff)) return { F: 0, md: 0 };
    const air = Math.exp(-(Math.hypot(this.x, this.y) - PH.RE) / PH.H), shape = e.profile === 'srb' ? (1.35 - 0.55 * (t - this.tIgnite) / (e.burn || 100)) / 1.075 : 1;
    const md = this.mdot0 * shape; return { F: md * (e.ispV - (e.ispV - e.ispS) * air) * PH.G0, md };
  }
  // propage jusqu'à la fin (impact, rentrée, temps) et retourne { samples: [{ t, x, y, vx, vy, m, alt, v, F, q }], end: { reason, t } }
  // opt : { tMax, sampleDt, stop: (body) => 'raison' | null, burnupAlt (m : se désintègre sous cette altitude en descendant), dt }
  propagate(opt) {
    const o = Object.assign({ tMax: 9000, sampleDt: 1, dt: 0.5 }, opt || {}), out = [], t0 = this.t; let nextS = this.t, reason = 'time', n = 0;
    for (; this.t - t0 < o.tMax; n++) {
      const r = Math.hypot(this.x, this.y), alt = r - PH.RE, ux = this.x / r, uy = this.y / r, vr = this.vx * ux + this.vy * uy;
      const eng = this.engineNow(this.t), m = this.mass(), vrx = this.vx + this.wEff * this.y, vry = this.vy - this.wEff * this.x;
      // direction de poussée : guidage (retourne l'angle phi au-dessus de l'horizontale locale) ou « le long de la vitesse relative »
      let phi = Math.atan2(vrx * ux + vry * uy, vrx * -uy + vry * ux);
      if (this.guidance) { const p = this.guidance(this, { r, alt, vr, vt: this.vx * -uy + this.vy * ux, t: this.t, F: eng.F, m }); if (p != null) phi = p; }
      const tx = ux * Math.sin(phi) - uy * Math.cos(phi), ty = uy * Math.sin(phi) + ux * Math.cos(phi);
      const a = phAccel(this.x, this.y, this.vx, this.vy, m, eng.F, tx, ty, this.cdA, this.wEff);
      if (this.t >= nextS - 1e-9) { out.push({ t: this.t, x: this.x, y: this.y, vx: this.vx, vy: this.vy, m, alt, v: Math.hypot(this.vx, this.vy), F: eng.F, q: a.q, phi }); nextS += o.sampleDt; }
      if (r < PH.RE) { reason = 'impact'; break; }
      if (o.burnupAlt != null && n > 20 && alt < o.burnupAlt && vr < 0) { reason = 'burnup'; break; }
      const stop = o.stop && o.stop(this); if (stop) { reason = stop; break; }
      const dt = eng.F > 0 || alt < 120e3 ? Math.min(o.dt, 0.1) : o.dt;
      if (eng.md > 0) this.prop = Math.max(0, this.prop - eng.md * dt);
      this.vx += a.ax * dt; this.vy += a.ay * dt; this.x += this.vx * dt; this.y += this.vy * dt; this.t += dt;
    }
    return { samples: out, end: { reason, t: this.t } };
  }
}

// état initial d'un objet envoyé depuis un point de la Terre : latitude, longitude, altitude (m), vitesse (m/s) par rapport au sol, azimut (° depuis le nord, vers l'est) et élévation (° au-dessus de l'horizon)
// → { state: { x, y, vx, vy, t:0 }, s, e, n, wEff } avec s = verticale, e = sens horizontal du mouvement (repère inertiel figé à l'instant 0 = repère de la Terre à cet instant), n = normale du plan
// (les vecteurs sont des tableaux [x, y, z] dans le repère de la scène : x vers (0°, 0°), y vers le nord, z vers 90° O)
function bodyFromGeo(g) {
  const D = Math.PI / 180, lo = g.lon * D, la = g.lat * D, cl = Math.cos(la), s = [cl * Math.cos(lo), Math.sin(la), -cl * Math.sin(lo)];
  const east = [-Math.sin(lo), 0, -Math.cos(lo)], north = [-Math.sin(la) * Math.cos(lo), cl, Math.sin(la) * Math.sin(lo)], az = (g.az != null ? g.az : 90) * D, el = (g.el != null ? g.el : 90) * D, sp = g.speed || 0;
  const hor = east.map((c, i) => c * Math.sin(az) + north[i] * Math.cos(az));                           // horizontale vers l'azimut
  const vg = hor.map((c, i) => c * Math.cos(el) * sp + s[i] * Math.sin(el) * sp);                       // vitesse par rapport au sol
  const r = PH.RE + (g.alt || 0);
  // rotation de la Terre : ω = (0, WE, 0) dans le repère de la scène ; ω × p, p = r·s
  const wxp = [PH.WE * r * s[2], 0, -PH.WE * r * s[0]], v3 = vg.map((c, i) => c + wxp[i]);
  const vr = v3[0] * s[0] + v3[1] * s[1] + v3[2] * s[2], hv = v3.map((c, i) => c - vr * s[i]), vh = Math.hypot(hv[0], hv[1], hv[2]);
  const e = vh > 1e-9 ? hv.map(c => c / vh) : hor, n = [s[1] * e[2] - s[2] * e[1], s[2] * e[0] - s[0] * e[2], s[0] * e[1] - s[1] * e[0]];
  return { state: { x: r, y: 0, vx: vr, vy: vh, t: 0 }, s, e, n, wEff: PH.WE * cl * (e[0] * east[0] + e[1] * east[1] + e[2] * east[2]) };   // wEff : composante de la rotation de la Terre le long du mouvement
}

// guidages prêts à l'emploi : fonction (body, ctx) → angle phi de la poussée au-dessus de l'horizontale locale (rad), ou null = le long de la vitesse relative à l'air (virage gravitationnel naturel)
const Guidance = {
  fixed: deg => () => deg * Math.PI / 180,
  prograde: () => () => null,
  // verticale pendant `vertical` s, inclinaison de `kick` ° pendant `kickDur` s, puis virage gravitationnel
  gravityTurn: (o) => { const g = Object.assign({ vertical: 8, kick: 2, kickDur: 5 }, o || {}); return (b, c) => { const t = c.t - (b.tStart || 0); return t < g.vertical ? Math.PI / 2 : t < g.vertical + g.kickDur ? Math.PI / 2 - g.kick * Math.PI / 180 : null; }; },
  // table [[t(s), phi(°)], …] interpolée linéairement
  program: (tab) => (b, c) => { const t = c.t - (b.tStart || 0); if (t <= tab[0][0]) return tab[0][1] * Math.PI / 180; for (let i = 1; i < tab.length; i++) if (t <= tab[i][0]) return (tab[i - 1][1] + (tab[i][1] - tab[i - 1][1]) * (t - tab[i - 1][0]) / (tab[i][0] - tab[i - 1][0])) * Math.PI / 180; return tab[tab.length - 1][1] * Math.PI / 180; },
};

// ---------- orbite képlérienne dans le plan (sans traînée), pour prolonger un état orbital ----------
// éléments d'un état (x, y, vx, vy) : demi-grand axe a, excentricité e, argument de périgée w (angle du périgée dans le plan), paramètre p, rp, ra, période T ; mouvement direct (h > 0)
function phElements(x, y, vx, vy, muArg) {
  const mu = muArg || PH.MU, r = Math.hypot(x, y), v2 = vx * vx + vy * vy, rv = x * vx + y * vy;
  const ex = ((v2 - mu / r) * x - rv * vx) / mu, ey = ((v2 - mu / r) * y - rv * vy) / mu, e = Math.hypot(ex, ey), a = 1 / (2 / r - v2 / mu), p = a * (1 - e * e);
  return { a, e, w: e < 1e-10 ? 0 : Math.atan2(ey, ex), p, rp: a * (1 - e), ra: a * (1 + e), T: 2 * Math.PI * Math.sqrt(a * a * a / mu), n: Math.sqrt(mu / (a * a * a)), mu, nu0: Math.atan2(y, x) - (e < 1e-10 ? 0 : Math.atan2(ey, ex)) };
}
// état après dt secondes sur l'orbite képlérienne
function phKepler(s, dt, muArg) {   // muArg : constante gravitationnelle du corps central (défaut : la Terre ; Lune : 4,9048695e12)
  const el = phElements(s.x, s.y, s.vx, s.vy, muArg), e = el.e, E0 = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(el.nu0 / 2), Math.sqrt(1 + e) * Math.cos(el.nu0 / 2));
  const M = E0 - e * Math.sin(E0) + el.n * dt; let E = M; for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2)), r = el.a * (1 - e * Math.cos(E)), th = el.w + nu, k = Math.sqrt(el.mu / el.p), vr = k * e * Math.sin(nu), vt = k * (1 + e * Math.cos(nu));
  return { x: r * Math.cos(th), y: r * Math.sin(th), vx: vr * Math.cos(th) - vt * Math.sin(th), vy: vr * Math.sin(th) + vt * Math.cos(th) };
}
// n points de l'orbite complète dans le plan
function phOrbitPoints(s, n, muArg) {
  const el = phElements(s.x, s.y, s.vx, s.vy, muArg), out = [];
  for (let k = 0; k <= n; k++) { const nu = 2 * Math.PI * k / n, r = el.p / (1 + el.e * Math.cos(nu)), th = el.w + nu; out.push([r * Math.cos(th), r * Math.sin(th)]); }
  return out;
}
