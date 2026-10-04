// Mission Apollo 11 (juillet 1969) : Saturn V, orbite terrestre, injection translunaire, vol vers la Lune, orbite lunaire, descente du LEM « Eagle » à la Mer de la Tranquillité,
// séjour, remontée, rendez-vous, retour, rentrée et amerrissage. Les trajectoires sont CALCULÉES (js/data/apollo11.js, généré par tools/make-apollo.js : problème restreint des trois corps
// Terre + Lune sur orbite circulaire, orbites képlériennes autour de la Lune, descente à guidage polynomial, remontée, recherche de la TEI, rentrée avec traînée) dans le plan de la montée.
// ApolloMission réutilise Launch pour la montée (S-IC, S-II/S-IVB, tour de sauvetage, débris) en REPÈRE INERTIEL (`inertial`) : c'est la Terre qui tourne (main.js fait tourner le groupe `world`).
// Après l'orbite d'attente, les véhicules (S-IVB, CSM « Columbia », LEM « Eagle », module de service, module de commande) suivent les échantillons de la mission (interpolation d'Hermite).
// Les tracés près de la Lune sont stockés RELATIVEMENT à la Lune (précision du float32) dans un repère qui suit la Lune sans tourner.
const APOLLO_SITE = { id: 'lc39a', name: 'Cap Canaveral — LC-39A (États-Unis)', lat: 28.608, lon: -80.6048 };
const AP_SOI = 66e6;   // rayon de la sphère d'influence de la Lune (m) : au-delà, vitesses et hauteurs sont comptées par rapport à la Terre
// état d'une table d'échantillons [t, x, y, vx, vy] à l'instant T (Hermite cubique) ; hors table : premier / dernier échantillon
function apTrack(a, T, o) {
  o = o || {}; let lo = 0, hi = a.length - 1;
  if (T <= a[0][0]) { o.x = a[0][1]; o.y = a[0][2]; o.vx = a[0][3]; o.vy = a[0][4]; return o; }
  if (T >= a[hi][0]) { o.x = a[hi][1]; o.y = a[hi][2]; o.vx = a[hi][3]; o.vy = a[hi][4]; return o; }
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m][0] <= T) lo = m; else hi = m; }
  const p = a[lo], q = a[hi], h = q[0] - p[0]; if (h < 1e-6) { o.x = q[1]; o.y = q[2]; o.vx = q[3]; o.vy = q[4]; return o; }
  const u = (T - p[0]) / h, u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  const d00 = 6 * u2 - 6 * u, d10 = 3 * u2 - 4 * u + 1, d01 = -6 * u2 + 6 * u, d11 = 3 * u2 - 2 * u;
  o.x = h00 * p[1] + h10 * h * p[3] + h01 * q[1] + h11 * h * q[3]; o.y = h00 * p[2] + h10 * h * p[4] + h01 * q[2] + h11 * h * q[4];
  o.vx = (d00 * p[1] + d01 * q[1]) / h + d10 * p[3] + d11 * q[3]; o.vy = (d00 * p[2] + d01 * q[2]) / h + d10 * p[4] + d11 * q[4];
  return o;
}
const apMoon = (T, A) => { const th = A.th0 + A.nM * T; return { x: A.DM * Math.cos(th), y: A.DM * Math.sin(th), vx: -A.DM * A.nM * Math.sin(th), vy: A.DM * A.nM * Math.cos(th) }; };
const apFlame = (r, h, color) => { const geo = new THREE.ConeGeometry(r, h, 14, 1, true); geo.rotateX(Math.PI); geo.translate(0, -h / 2, 0); const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: color || 0xffd080, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); const g = new THREE.Group(); g.add(m); g.userData.cone = m; g.visible = false; return g; };

// modèles (mètres, axe y = avant / poussée)
function apBuildCsm() {   // module de service (cylindre + tuyère) et module de commande (tronc de cône), origine au milieu
  const g = new THREE.Group(), M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.3 }, o || {}));
  const sm = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 7.5, 24), M(0xe4e4e0)); sm.position.y = -1.5;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.97, 1.97, 0.5, 24), M(0x555555)); band.position.y = 1.4;
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.25, 2.8, 16, 1, true), M(0x2c2c30, { side: THREE.DoubleSide })); bell.position.y = -6.65;
  const cm = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.95, 3.2, 24), M(0xc9c9c6)); cm.position.y = 4.35;
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.9, 0.12, 24), M(0x3b3733)); shield.position.y = 2.7;
  g.add(sm, band, bell, cm, shield); g.userData.nozzleY = -8; g.userData.len = 13.5; return g;
}
function apBuildLm() {   // étage de descente (prisme doré, 4 jambes, tuyère) et étage de remontée (cabine grise)
  const g = new THREE.Group(), M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.4 }, o || {}));
  const desc = new THREE.Group(), asc = new THREE.Group();
  const st = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 1.8, 8), M(0xd4a537)); st.position.y = 0.9; desc.add(st);
  const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.75, 1.2, 14, 1, true), M(0x2c2c30, { side: THREE.DoubleSide })); eng.position.y = -0.6; desc.add(eng);
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4, leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 6), M(0xe0c070)), foot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 12), M(0xe0c070));
    leg.position.set(Math.cos(a) * 3.1, -0.15, Math.sin(a) * 3.1); leg.rotation.set(Math.sin(a) * 0.62, 0, -Math.cos(a) * 0.62); foot.position.set(Math.cos(a) * 4.2, -1.78, Math.sin(a) * 4.2); desc.add(leg, foot);
  }
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.0, 2.4, 6), M(0xb9b9b6)); cab.position.y = 3.0; asc.add(cab);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 0.9, 12), M(0x9a9a98)); top.position.y = 4.65; asc.add(top);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.1), M(0x151a22)); win.position.set(0, 3.3, 1.75); asc.add(win);
  for (let k = 0; k < 4; k++) { const q = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.3), M(0x6a6a68)); const a = k * Math.PI / 2; q.position.set(Math.cos(a) * 2.35, 3.0, Math.sin(a) * 2.35); asc.add(q); }
  g.add(desc, asc); g.userData.desc = desc; g.userData.asc = asc; g.position.y = 0; return g;
}
function apBuildCm() {   // module de commande seul : la pointe vers +y, bouclier thermique vers −y
  const g = new THREE.Group(), M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.2 }, o || {}));
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.95, 3.2, 24), M(0xb8b4ae)), shield = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.9, 0.14, 24), M(0x3b3733));
  cone.position.y = 0.1; shield.position.y = -1.57; g.add(cone, shield); return g;
}
function apBuildChutes(n, r, color) { const g = new THREE.Group(); for (let k = 0; k < n; k++) { const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: k % 2 ? 0xffffff : color, side: THREE.DoubleSide, roughness: 0.9 })); const a = k * 2 * Math.PI / n; dome.position.set(n > 1 ? Math.cos(a) * r * 0.9 : 0, 3.2 * r, n > 1 ? Math.sin(a) * r * 0.9 : 0); g.add(dome); } return g; }

class ApolloMission extends Launch {
  constructor(opts) {
    const o = opts || {};
    super(APOLLO_SITE, 185, 133e3, 1, { az: 72.058 * DEG, rocketId: 'saturnv', story: 'apollo11', opt: o.opt, inertial: true });
    const A = this.A = APOLLO11, R = LCH.RE, V = this.V = A.veh;
    this.isApollo = true; this.Tmax = A.tEnd + 120; this.tAsc = this.sim.tEnd; this.maxDistU = 700; this.R = R;
    this.evA = {}; for (const e of A.ev) { this.evA[e.key] = e; this.ev[e.key] = e; this.sim.events.push({ t: e.t, key: e.key, label: e.label }); }
    const E = this.evA; this.tSep = E.sivbsep.t; this.tSM = E.smsep.t;
    this.tmpA = { x: 0, y: 0, vx: 0, vy: 0 }; this.tmpB = { x: 0, y: 0, vx: 0, vy: 0 };
    this.p3 = (x, y, out) => (out || new THREE.Vector3()).copy(this.s).multiplyScalar(x / R).addScaledVector(this.e, y / R);   // plan → scène (inertiel)
    // Lune : sphère texturée + repère qui suit la Lune sans tourner (tracés relatifs) + objets posés sur sa surface (tournent avec elle)
    this.moonFrame = new THREE.Group(); this.group.add(this.moonFrame);
    this.moonMesh = buildMoonMesh(null); this.moonFrame.add(this.moonMesh);
    this.moonSurf = new THREE.Group(); this.moonFrame.add(this.moonSurf);
    this.moonQ = new THREE.Quaternion(); this.mhat = new THREE.Vector3(); this.moonPos = new THREE.Vector3();
    { const pts = []; for (let k = 0; k <= 360; k++) { const a = k * DEG; pts.push(this.p3(A.DM * Math.cos(a), A.DM * Math.sin(a))); }
      this.moonOrbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x6f7f99, transparent: true, opacity: 0.3 })); this.moonOrbit.frustumCulled = false; this.group.add(this.moonOrbit); }
    // objets de la mission
    this.csmG = this.satG; while (this.csmG.children.length) this.csmG.remove(this.csmG.children[0]);
    this.csmM = apBuildCsm(); this.csmG.add(this.csmM); this.csmG.scale.setScalar(MU_M); this.satPan = new THREE.Group();
    this.csmFlame = apFlame(1.2, 14, 0xffd9a0); this.csmFlame.position.y = this.csmM.userData.nozzleY; this.csmM.add(this.csmFlame);
    this.lmG = new THREE.Group(); this.lmM = apBuildLm(); this.lmG.add(this.lmM); this.lmG.scale.setScalar(MU_M); this.group.add(this.lmG); this.lmG.visible = false;
    this.lmFlame = apFlame(0.9, 8, 0xfff0c0); this.lmFlame.position.y = -1.2; this.lmM.add(this.lmFlame);
    this.cmG = new THREE.Group(); this.cmM = apBuildCm(); this.cmG.add(this.cmM); this.cmG.scale.setScalar(MU_M); this.group.add(this.cmG); this.cmG.visible = false;
    this.plasma = apFlame(3.4, 30, 0xff7a3a); this.plasma.position.y = -1.7; this.cmM.add(this.plasma);
    this.drogue = apBuildChutes(2, 2.6, 0xff7a20); this.drogue.position.y = 8; this.cmM.add(this.drogue); this.drogue.visible = false;
    this.mainCh = apBuildChutes(3, 12.5, 0xff5a1a); this.mainCh.position.y = 26; this.cmM.add(this.mainCh); this.mainCh.visible = false;
    this.smG = new THREE.Group(); { const sm = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 7.5, 20), new THREE.MeshStandardMaterial({ color: 0xcfcfca, roughness: 0.6, metalness: 0.3 })); this.smG.add(sm); } this.smG.scale.setScalar(MU_M); this.group.add(this.smG); this.smG.visible = false;
    // LEM resté sur la Lune, drapeau, astronaute (après « un petit pas »)
    this.lmStay = apBuildLm(); this.lmStay.userData.asc.visible = false; this.lmStay.visible = false; this.moonSurf.add(this.lmStay); this.lmStay.scale.setScalar(MU_M);
    { const site = ll(A.lonSite / DEG, 0), up = site.clone(); this.siteV = site; this.lmStay.position.copy(site).multiplyScalar(MOON_R); this.lmStay.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
      this.figure = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.7, 8), new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.8 })); body.position.y = 0.85;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshStandardMaterial({ color: 0xe8c64a, roughness: 0.3, metalness: 0.6 })); head.position.y = 1.85; this.figure.add(body, head);
      const flag = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0xcccccc })); pole.position.y = 1.2; const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.02), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x303060 })); cloth.position.set(0.6, 2.0, 0); flag.add(pole, cloth);
      const east = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), site).normalize(), north = new THREE.Vector3(0, 1, 0);
      const place = (obj, de, dn) => { obj.position.copy(site).multiplyScalar(MOON_R).addScaledVector(east, de * MU_M).addScaledVector(north, dn * MU_M); obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), site); obj.scale.setScalar(MU_M); obj.visible = false; this.moonSurf.add(obj); };
      place(this.figure, 14, 6); place(flag, 22, -5); this.flag = flag; }
    // tracés : un par véhicule, en deux morceaux (repère de la Terre / repère de la Lune)
    this.paths = []; const colors = { sivb: 0x9aa0a8, csm: 0xffe08a, lm: 0xff9ad2, sm: 0xb0b0b0, cm: 0xffffff };
    for (const k of ['sivb', 'csm', 'lm', 'sm', 'cm']) this.buildPath(k, V[k], colors[k]);
    // marqueurs des étapes (étapes de la montée de Launch + étapes de la mission)
    const R2 = R, mk = this.markers; this.moonMarkers = [];
    for (const e of A.ev) {
      const tr = V[e.veh] || V.csm, s = apTrack(tr, e.t, {}), m = apMoon(e.t, A), dm = Math.hypot(s.x - m.x, s.y - m.y), moon = dm < AP_SOI;
      const pos = this.p3(s.x, s.y), item = { t: e.t, key: e.key, label: e.label, v: moon ? Math.hypot(s.vx - m.vx, s.vy - m.vy) : Math.hypot(s.vx, s.vy), pos, unit: pos.clone().normalize(), altKm: moon ? (dm - A.RM) / 1000 : (Math.hypot(s.x, s.y) - R2) / 1000 };
      if (moon) { item.moon = true; item.rel = this.p3(s.x - m.x, s.y - m.y); this.moonMarkers.push(item); }
      mk.push(item);
    }
    mk.sort((a, b) => a.t - b.t);
    { const pa = new Float32Array(mk.length * 3), da = new Float32Array(mk.length * 6); this.mkPosArr = pa; this.mkDropArr = da;
      mk.forEach((m, i) => { pa.set([m.pos.x, m.pos.y, m.pos.z], 3 * i); da.set([m.pos.x, m.pos.y, m.pos.z, m.unit.x, m.unit.y, m.unit.z], 6 * i); });
      this.markPts.geometry = new THREE.BufferGeometry(); this.markPts.geometry.setAttribute('position', new THREE.BufferAttribute(pa, 3));
      this.markDrops.geometry = new THREE.BufferGeometry(); this.markDrops.geometry.setAttribute('position', new THREE.BufferAttribute(da, 3)); }
    // étiquettes : noms propres aux missions
    this.tagMap.fairA.base = this.tagMap.fairA.text = 'Tour de sauvetage n°1'; this.tagMap.fairB.base = this.tagMap.fairB.text = 'Tour de sauvetage n°2';
    const V3 = () => new THREE.Vector3(), add = (id, text) => { const t = { id, text, base: text, pos: V3(), on: false }; this.tagList.push(t); this.tagMap[id] = t; };
    add('sivb', 'Étage S-IVB'); add('csm', 'Columbia (module de commande et de service)'); add('lm', 'Eagle (LEM)'); add('sm', 'Module de service'); add('cm', 'Module de commande'); add('moon', 'Lune');
    this.camAuto = { dist: 20000, dir: new THREE.Vector3(0, 0, 1) }; this.previewDir = this.n.clone().multiplyScalar(0.9).addScaledVector(this.s, 0.3).normalize(); this.previewDist = 118;
    this.dirCsm = new THREE.Vector3(1, 0, 0); this.dirLm = new THREE.Vector3(1, 0, 0); this.prim = 'csm'; this.phaseName = 'Montée'; this.dst = {};
  }
  // tracé d'un véhicule : morceau « repère de la Terre » (hors sphère d'influence) et morceau « repère de la Lune » (relatif à la Lune), segments entre échantillons voisins
  buildPath(k, tr, color) {
    const A = this.A, R = this.R, pe = [], pm = [], te = [], tm = [], v = new THREE.Vector3(), w = new THREE.Vector3();
    const info = tr.map(s => { const m = apMoon(s[0], A), dm = Math.hypot(s[1] - m.x, s[2] - m.y); return { moon: dm < AP_SOI, m }; });
    for (let i = 1; i < tr.length; i++) {
      const a = tr[i - 1], b = tr[i]; if (b[0] - a[0] > 3700 || b[0] - a[0] < 0.05 || info[i].moon !== info[i - 1].moon) continue;
      if (info[i].moon) { this.p3(a[1] - info[i - 1].m.x, a[2] - info[i - 1].m.y, v); this.p3(b[1] - info[i].m.x, b[2] - info[i].m.y, w); pm.push(v.x, v.y, v.z, w.x, w.y, w.z); tm.push(b[0]); }
      else { this.p3(a[1], a[2], v); this.p3(b[1], b[2], w); pe.push(v.x, v.y, v.z, w.x, w.y, w.z); te.push(b[0]); }
    }
    const mkLines = (arr, ts, parent) => {
      if (!arr.length) return null; const attr = new THREE.BufferAttribute(new Float32Array(arr), 3);
      const gp = new THREE.BufferGeometry(); gp.setAttribute('position', attr), gt = new THREE.BufferGeometry(); gt.setAttribute('position', attr); gt.setDrawRange(0, 0);
      const plan = new THREE.LineSegments(gp, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.32 })), trail = new THREE.LineSegments(gt, new THREE.LineBasicMaterial({ color }));
      plan.frustumCulled = trail.frustumCulled = false; parent.add(plan, trail); return { plan, trail, ts };
    };
    var gt;
    this.paths.push({ k, e: mkLines(pe, te, this.group), m: mkLines(pm, tm, this.moonFrame) });
  }
  // nombre de segments dont l'extrémité est passée
  static countUpTo(ts, T) { let lo = 0, hi = ts.length; while (lo < hi) { const m = (lo + hi) >> 1; if (ts[m] <= T) lo = m + 1; else hi = m; } return lo; }

  // ---------- états ----------
  stateAt(T) {   // (appelé aussi par le constructeur de Launch, avant que les champs de la mission existent : n'utilise que des globales)
    if (T < this.sim.tEnd) return super.stateAt(T);
    const A = APOLLO11, V = A.veh, R = LCH.RE, tSep = A.ev.find(e => e.key === 'sivbsep').t, tr = T > tSep && V.sivb.length ? V.sivb : V.csm, s = apTrack(tr, T, {}), m = apMoon(T, A), burning = T >= A.tliT && T <= A.tliT + 347;
    const dm = Math.hypot(s.x - m.x, s.y - m.y), moon = dm < AP_SOI, alt = moon ? dm - A.RM : Math.hypot(s.x, s.y) - R;
    const ef = new THREE.Vector3().copy(this.s).multiplyScalar(s.x / R).addScaledVector(this.e, s.y / R);
    return Object.assign({}, this.last, { x: s.x, y: s.y, vx: s.vx, vy: s.vy, ef, v: moon ? Math.hypot(s.vx - m.vx, s.vy - m.vy) : Math.hypot(s.vx, s.vy), alt, phi: 0, F: burning ? 5.1e6 : 0, acc: 0, q: 0, m: 0, eap: false, epc: false, esc: burning, fairing: false, eapAttached: false, epcAttached: false, phase: 'mission', idx: this.sim.samples.length - 1 });
  }
  // un véhicule à l'instant T : { s: {x, y, vx, vy}, on } (échantillons de la mission)
  veh(k, T, out) {
    const V = this.V, tr = V[k]; if (!tr || !tr.length) return null;
    if (T < tr[0][0] - 1e-6) return null; return apTrack(tr, T, out);
  }
  // hauteur et vitesse d'un état absolu par rapport au corps dominant
  refOf(s, T, out) {
    const A = this.A, m = apMoon(T, A), dm = Math.hypot(s.x - m.x, s.y - m.y); out = out || {};
    if (dm < AP_SOI) { out.moon = true; out.alt = dm - A.RM; out.speed = Math.hypot(s.vx - m.vx, s.vy - m.vy); out.m = m; out.dist = dm; } else { out.moon = false; out.alt = Math.hypot(s.x, s.y) - this.R; out.speed = Math.hypot(s.vx, s.vy); out.m = m; out.dist = Math.hypot(s.x, s.y); }
    return out;
  }
  // intervalle de poussée (moteur de manœuvre) de l'événement e
  burnOf(e) { return e.burn ? [e.t - e.burn / 2, e.t + e.burn / 2] : null; }
  burning(T) { for (const k of ['loi1', 'loi2', 'tei']) { const b = this.burnOf(this.evA[k]); if (b && T >= b[0] && T <= b[1]) return k; } return null; }
  phase(T) {
    const E = this.evA, past = k => T >= E[k].t;
    if (T < this.tAsc) return 'Montée de la Saturn V';
    if (!past('tli')) return 'Orbite d’attente (185 km)'; if (T < E.tli.t + 347) return 'Injection translunaire (S-IVB)'; if (!past('loi1')) return 'Vol vers la Lune';
    if (!past('loi2')) return 'Insertion en orbite lunaire'; if (!past('undock')) return 'Orbite lunaire (110 km)'; if (!past('pdi')) return 'LEM séparé, préparation de la descente'; if (!past('land')) return 'Descente motorisée';
    if (!past('lift')) return T < E.step.t ? 'Sur la Lune (Eagle s’est posé)' : T < E.eva.t ? 'Sortie lunaire' : 'Sur la Lune'; if (!past('ins')) return 'Remontée du LEM'; if (!past('dock')) return 'Rendez-vous en orbite lunaire';
    if (!past('tei')) return 'Orbite lunaire (retour)'; if (T < E.tei.t + 75) return 'Injection transterrestre'; if (!past('ei')) return 'Vol vers la Terre'; if (!past('drogue')) return 'Rentrée atmosphérique'; if (!past('splash')) return 'Sous parachutes'; return 'Amerrissage';
  }
  // masse (kg) de l'ensemble suivi, de mémoire
  massOf(T) {
    const E = this.evA;
    if (T < E.tli.t) return this.stateAt(T).m || 0; if (T < this.tSep) return 59e3 + 45.4e3; if (T < E.lift.t && T > E.undock.t && this.prim === 'lm') { const d = this.A.burns.lmDescent; if (T >= d[0][0] && T <= d[d.length - 1][0]) { let i = 0; while (i < d.length - 1 && d[i + 1][0] <= T) i++; return d[i][3]; } if (T > d[d.length - 1][0]) return d[d.length - 1][3]; return 15200; }
    if (this.prim === 'lm') return T < E.ins.t ? 4700 : 4700; if (this.prim === 'cm') return T < E.drogue.t || true ? 5560 : 5560; return T < E.undock.t || (T > E.dock.t && T < E.lmjett.t) ? 45.4e3 : 28.8e3;
  }
  poussee(T) {
    const E = this.evA, A = this.A; let F = 0;
    const d = A.burns.lmDescent; if (T >= d[0][0] && T <= d[d.length - 1][0]) { let i = 0; while (i < d.length - 1 && d[i + 1][0] <= T) i++; F = d[i][4]; }
    const u = A.burns.lmAscent; if (T >= u[0][0] && T <= u[u.length - 1][0]) F = 15600;
    if (T >= E.tli.t && T <= E.tli.t + 347) F = 5.1e6; if (this.burning(T)) F = 91e3;
    return F;
  }

  // ---------- mise à jour ----------
  update(dt, camera) {
    super.update(dt, camera);
    const T = this.T, A = this.A, E = this.evA, past = k => !!this.ev[k] && T >= this.ev[k].t, Y = this.Y;
    const dtR = Math.min(dt, 0.1);
    // Lune : position, orientation (rotation synchrone), tracés relatifs
    { const m = apMoon(T, A); this.p3(m.x, m.y, this.moonPos); this.mhat.copy(this.moonPos).normalize(); this.moonFrame.position.copy(this.moonPos); moonQuat(this.mhat, this.n, this.moonQ); this.moonMesh.quaternion.copy(this.moonQ); this.moonSurf.quaternion.copy(this.moonQ); }
    this.moonOrbit.visible = this.opt.plan;
    // marqueurs relatifs à la Lune
    { const pa = this.mkPosArr, da = this.mkDropArr, tmpv = new THREE.Vector3();
      for (const m of this.moonMarkers) { const i = this.markers.indexOf(m); m.pos.copy(this.moonPos).add(m.rel); m.unit.copy(m.rel).normalize(); pa[3 * i] = m.pos.x; pa[3 * i + 1] = m.pos.y; pa[3 * i + 2] = m.pos.z; tmpv.copy(this.moonPos).addScaledVector(m.unit, MOON_R); da.set([m.pos.x, m.pos.y, m.pos.z, tmpv.x, tmpv.y, tmpv.z], 6 * i); }
      this.markPts.geometry.attributes.position.needsUpdate = true; this.markDrops.geometry.attributes.position.needsUpdate = true; }
    // tracés
    for (const p of this.paths) for (const part of [p.e, p.m]) if (part) { const n = ApolloMission.countUpTo(part.ts, T); part.trail.geometry.setDrawRange(0, 2 * n); part.plan.visible = this.opt.plan; part.trail.visible = this.opt.trail; }
    // véhicules
    const sA = this.tmpA, sB = this.tmpB, tg = this.tagMap, ref = this.refOf, rf = {};
    const showTag = (id, on, pos, s) => { const t = tg[id]; t.on = on; if (!on) return; t.pos.copy(pos); if (s) { const r = this.refOf(s, T, rf); t.speed = r.speed; t.alt = r.alt; } };
    const afterAsc = T >= this.tAsc, csmTrack = T < this.tSM ? this.V.csm : null, dmeters = MU_M;
    let csmP = null, lmP = null, cmP = null, smP = null, csmS = null, lmS = null, cmS = null, smS = null;
    // S-IVB : modèle de Launch, sa charge utile (le CSM) est à l'extrémité du modèle
    if (afterAsc) { this.rocket.position.addScaledVector(this.dir, -this.payloadY * dmeters); this.center.copy(this.rocket.position).addScaledVector(this.dir, this.rocketLen / 2 * dmeters); }
    const sivbEnd = this.V.sivb.length ? this.V.sivb[this.V.sivb.length - 1][0] : 0;
    if (afterAsc && T > sivbEnd + 60) { this.rocket.visible = false; this.dotRocket.visible = false; }
    // CSM (le « sat » de Launch)
    if (afterAsc && csmTrack) { csmS = apTrack(csmTrack, T, sA); csmP = this.p3(csmS.x, csmS.y, new THREE.Vector3()); csmS = Object.assign({}, csmS); }
    if (afterAsc && T >= this.tSM && T < this.tSM + 1) { csmS = null; }
    // direction du CSM : prograde (rétrograde pendant les freinages lunaires), amortie
    if (csmS) {
      const b = this.burning(T), vel = new THREE.Vector3(); this.p3(csmS.vx, csmS.vy, vel); if (vel.lengthSq() > 0) vel.normalize();
      const retro = b === 'loi1' || b === 'loi2'; const target = retro ? vel.clone().negate() : vel;
      if (T < this.tSep) { target.copy(this.dir); }
      this.dirCsm.lerp(target, 1 - Math.exp(-dtR * 3)).normalize();
    }
    // LEM : arrimé au CSM ou en vol propre
    { const tr = this.V.lm, tD = E.dock.t, tJ = E.lmjett.t, tDOI = E.doi.t, tEnd = tr[tr.length - 1][0];
      const free = (T >= tDOI && T <= tD) || T >= tJ;
      if (free && T <= tEnd) { lmS = Object.assign({}, apTrack(tr, T, sB)); lmP = this.p3(lmS.x, lmS.y, new THREE.Vector3()); }
      else if (csmS && T >= this.tSep) { lmS = csmS; lmP = csmP.clone().addScaledVector(this.dirCsm, 11 * dmeters); if (T >= E.undock.t && T < tDOI) lmP.addScaledVector(new THREE.Vector3().crossVectors(this.dirCsm, this.n).normalize(), 25 * dmeters * Math.min(1, (T - E.undock.t) / 30)); }
    }
    // module de commande et module de service après leur séparation
    if (T >= this.tSM) { const cmS0 = this.veh('cm', T, {}); if (cmS0) { cmS = Object.assign({}, cmS0); cmP = this.p3(cmS.x, cmS.y, new THREE.Vector3()); } const smS0 = T <= this.V.sm[this.V.sm.length - 1][0] ? this.veh('sm', T, {}) : null; if (smS0) { smS = Object.assign({}, smS0); smP = this.p3(smS.x, smS.y, new THREE.Vector3()); } }
    // positions et modèles
    const csmVisible = afterAsc && !!csmP && past('fairing');
    this.csmG.visible = csmVisible || (!afterAsc && past('fairing') && !this.preview);
    if (afterAsc && csmP) { this.csmG.position.copy(csmP); this.csmG.quaternion.setFromUnitVectors(Y, this.dirCsm); }
    else if (!afterAsc) { this.csmG.position.copy(this.pos).addScaledVector(this.dir, (this.payloadY + 7) * dmeters); this.csmG.quaternion.copy(this.rocket.quaternion); }
    const cb = this.burning(T); this.csmFlame.visible = !!cb && this.csmG.visible; if (this.csmFlame.visible) this.csmFlame.userData.cone.scale.set(1, 0.85 + 0.3 * Math.random(), 1);
    // LEM : modèle, attitude, flamme
    this.lmG.visible = !!lmP && afterAsc && T >= this.tSep && T <= this.A.veh.lm[this.A.veh.lm.length - 1][0] + 1; const lmLanded = past('land') && !past('lift');
    if (this.lmG.visible) {
      this.lmG.position.copy(lmP);
      const onLm = lmS && T >= E.doi.t && T <= E.dock.t || (lmS && T >= E.lmjett.t);
      const up = new THREE.Vector3(); if (onLm || lmLanded) { const m = apMoon(T, A); up.copy(this.p3(lmS.x - m.x, lmS.y - m.y, new THREE.Vector3())).normalize(); }
      const d = this.A.burns.lmDescent, u = this.A.burns.lmAscent; let thr = null, F = 0;
      if (T >= d[0][0] && T <= d[d.length - 1][0]) { let i = 0; while (i < d.length - 1 && d[i + 1][0] <= T) i++; const q = d[i]; thr = this.p3(q[1], q[2], new THREE.Vector3()).normalize(); F = q[4]; }
      else if (T >= u[0][0] && T <= u[u.length - 1][0]) { let i = 0; while (i < u.length - 1 && u[i + 1][0] <= T) i++; const q = u[i]; thr = this.p3(q[1], q[2], new THREE.Vector3()).normalize(); F = q[4]; }
      let target;
      if (thr) target = thr; else if (lmLanded) target = up; else if (onLm) { target = this.p3(lmS.vx, lmS.vy, new THREE.Vector3()).normalize(); } else target = this.dirCsm.clone().negate();
      if (lmLanded) this.dirLm.copy(target); else this.dirLm.lerp(target, 1 - Math.exp(-dtR * 3)).normalize();
      this.lmG.quaternion.setFromUnitVectors(Y, this.dirLm);
      this.lmM.userData.desc.visible = !past('lift');
      this.lmFlame.visible = F > 0; if (F > 0) { this.lmFlame.userData.cone.scale.set(F / 45000 * (T < E.lift.t ? 1 : 0.35) + 0.15, (0.85 + 0.3 * Math.random()) * (T < E.lift.t ? 1 : 0.4) * F / 45000 + 0.2, F / 45000 * (T < E.lift.t ? 1 : 0.35) + 0.15); this.lmFlame.position.y = T < E.lift.t ? -1.2 : 1.7; }
    }
    this.lmStay.visible = past('land'); this.lmStay.userData.desc.visible = true; this.lmStay.userData.asc.visible = past('land') && !past('lift');
    this.figure.visible = T >= E.step.t && T < E.lift.t; this.flag.visible = T >= E.step.t + 900 && T < E.lift.t + 1e9;
    // CM, parachutes, plasma, SM
    this.cmG.visible = !!cmP; if (cmP) {
      this.cmG.position.copy(cmP); const v = this.p3(cmS.vx, cmS.vy, new THREE.Vector3()), r = this.refOf(cmS, T, rf);
      const under = past('drogue'), downDir = cmP.clone().normalize();
      const target = under ? downDir.clone().negate().multiplyScalar(-1) : v.lengthSq() > 0 ? v.normalize().negate() : downDir;   // bouclier vers l'avant (pointe vers l'arrière) puis pointe en haut sous parachute
      if (under) target.copy(downDir);
      this.dirCm = this.dirCm || target.clone(); this.dirCm.lerp(target, 1 - Math.exp(-dtR * 4)).normalize(); this.cmG.quaternion.setFromUnitVectors(Y, this.dirCm);
      this.drogue.visible = under && !past('main'); this.mainCh.visible = past('main'); const hot = r.alt < 95e3 && r.alt > 25e3 && r.speed > 1500 && !under;
      this.plasma.visible = hot; if (hot) this.plasma.userData.cone.scale.set(1, (0.6 + 0.4 * Math.random()) * Math.min(1.6, r.speed / 8000), 1);
    }
    this.smG.visible = !!smP; if (smP) { this.smG.position.copy(smP); this.smG.rotation.set(T * 0.3 % 6.28, 0, T * 0.2 % 6.28); }
    // étiquettes
    showTag('csm', !!csmP && past('fairing') && T < this.tSM, csmP || this.pos, csmS); tg.csm.text = past('dock') && !past('lmjett') || (T > this.tSep && T < E.undock.t) ? 'Columbia + Eagle' : 'Columbia (CSM)'; tg.csm.text = T < this.tSep ? 'Columbia (CSM) + Eagle (LEM)' : tg.csm.text;
    showTag('lm', !!lmP && this.lmG.visible && (T >= E.undock.t && !(T > E.dock.t && T < E.lmjett.t)), lmP || this.pos, lmS);
    showTag('cm', !!cmP, cmP || this.pos, cmS); showTag('sm', !!smP, smP || this.pos, smS);
    { const sv = afterAsc && T <= sivbEnd + 60 && T > this.tSep - 1 && this.rocket.visible; showTag('sivb', sv, this.rocket.position.clone().addScaledVector(this.dir, 55 * dmeters), this.stateAt(T)); }
    { const m = tg.moon; m.on = true; m.pos.copy(this.moonPos); const mm = apMoon(T, A); m.speed = Math.hypot(mm.vx, mm.vy); m.alt = null; }
    tg.sat.on = false; tg.rocket.on = !afterAsc || (T <= sivbEnd + 60 && false);
    if (afterAsc) { tg.rocket.on = false; }
    if (T < this.tAsc) { tg.csm.on = false; }
    // sujet suivi par la caméra et vue automatique
    this.camera3(dt, T, csmP, lmP, cmP, smP, csmS, lmS, cmS, camera);
    // télémétrie « principale »
    const ps = this.primState(T, csmS, lmS, cmS); if (ps) { const r = this.refOf(ps.s, T, rf); this.st = Object.assign({}, this.st, { v: r.speed, alt: r.alt }); this.altM = r.alt; this.primRef = r; }
  }
  // véhicule principal selon la phase
  primId(T) {
    const E = this.evA; if (T < this.tAsc) return 'rocket';
    if (this.follow && this.tagMap[this.follow] && !this.tagMap[this.follow].piece && this.follow !== 'rocket' && this.follow !== 'sat') return this.follow;
    if (T < E.undock.t) return 'csm'; if (T < E.dock.t) return 'lm'; if (T < this.tSM) return 'csm'; return 'cm';
  }
  primState(T, csmS, lmS, cmS) { const id = this.prim; if (id === 'csm') return csmS ? { s: csmS } : null; if (id === 'lm') return lmS ? { s: lmS } : null; if (id === 'cm') return cmS ? { s: cmS } : null; if (id === 'sm') return null; return null; }
  // caméra : cible, distance (km) et direction vers la caméra, selon la phase et les étapes proches
  camera3(dt, T, csmP, lmP, cmP, smP, csmS, lmS, cmS, camera) {
    const E = this.evA, A = this.A, kind = (id) => id;
    if (T < this.tAsc - 5) { this.prim = 'rocket'; return; }
    let id = this.primId(T); if (id === 'rocket') id = 'csm'; this.prim = id;
    const pos = id === 'csm' ? csmP : id === 'lm' ? lmP : id === 'cm' ? cmP : id === 'sm' ? smP : id === 'sivb' ? this.rocket.position : id === 'moon' ? this.moonPos : csmP;
    const s = id === 'csm' ? csmS : id === 'lm' ? lmS : id === 'cm' ? cmS : null;
    if (!pos) { return; }
    const r = s ? this.refOf(s, T, {}) : { moon: id === 'moon', alt: 0, speed: 0, dist: 0 };
    this.focusPos.copy(pos); this.center.copy(pos); this.pos.copy(pos);
    // verticale et pied (hauteur au-dessus de la Terre ou de la Lune)
    const mp = this.moonPos, rel = pos.clone().sub(r.moon ? mp : new THREE.Vector3()), up = rel.clone().normalize(), body = r.moon ? MOON_R : 1;
    this.radial = (r.moon ? mp.clone() : new THREE.Vector3()).addScaledVector(up, body); const ha = this.hLine.geometry.attributes.position; ha.setXYZ(0, pos.x, pos.y, pos.z); ha.setXYZ(1, this.radial.x, this.radial.y, this.radial.z); ha.needsUpdate = true;
    // distance voulue
    const near = [['tli', 0.3, 420], ['sivbsep', 0.4, 120], ['loi1', 0.15, 420], ['loi2', 0.15, 120], ['undock', 0.1, 120], ['doi', 0.1, 120], ['pdi', 0.5, 0], ['land', 0.06, 120], ['step', 0.04, 600], ['eva', 0.04, 300], ['lift', 0.08, 0], ['ins', 0.2, 100], ['rdv', 1.5, 200], ['dock', 0.1, 150], ['lmjett', 0.1, 120], ['tei', 0.15, 240], ['smsep', 0.12, 120], ['ei', 3, 0], ['gmax', 1.2, 0], ['drogue', 0.2, 60], ['main', 0.2, 60], ['splash', 0.15, 60]];
    let want = null;
    for (const [k, d, span] of near) { const e = E[k]; const b = e.burn ? [e.t - e.burn / 2 - 60, e.t + e.burn / 2 + 60] : [e.t - 45, e.t + Math.max(45, span)]; if (T >= b[0] && T <= b[1]) { want = d; break; } }
    let far;
    const alt = r.alt / 1000;
    if (id === 'lm' && r.moon && alt < 40 && T > E.pdi.t - 60 && T < E.land.t + 30) far = Math.max(0.05, alt * 0.8);
    else if (id === 'lm' && T >= E.land.t && T < E.lift.t) far = 0.05;
    else if (id === 'lm' && T >= E.lift.t && T < E.ins.t) far = Math.max(0.1, alt * 0.8);
    else if (id === 'cm' || (T > this.tSM - 600 && T > E.tei.t)) far = T > E.ei.t - 100 ? Math.max(0.3, alt * 0.6) : 20000;
    else if (r.moon) far = 6000;
    else far = Math.max(18000, 0.6 * r.dist / 1000);
    const goal = Math.log(want != null && id !== 'moon' ? want : far), cur = this.camLog == null ? goal : this.camLog; this.camLog = cur + (goal - cur) * (1 - Math.exp(-Math.min(dt, 0.1) * 1.5));
    this.camDistKm = Math.exp(this.camLog); if (id === 'moon') this.camDistKm = 9000;
    // direction : de côté (face au plan) pour les actions rapprochées, de dessus pour les vues d'ensemble
    const n = this.n, along = new THREE.Vector3().crossVectors(n, up).normalize(), farView = this.camDistKm > 1500, d = this.camDir;
    if (farView) d.copy(n).multiplyScalar(0.92).addScaledVector(up, 0.25).addScaledVector(along, -0.12); else d.copy(n).multiplyScalar(-0.88).addScaledVector(up, 0.3).addScaledVector(along, -0.18);
    d.normalize(); if (Math.abs(d.y) > 0.985) d.x += 0.15, d.normalize();
  }

  get zoomLenM() { return this.T < this.tAsc ? this.rocketLen : this.prim === 'lm' ? 14 : 22; }
  tel() {
    const T = this.T; if (T < this.tAsc) return Object.assign(super.tel(), { phase: 'Montée de la Saturn V' });
    const r = this.primRef || { alt: 0, speed: 0, moon: false }, st = this.st || {};
    return { eff: this.effSpeed, T, alt: r.alt / 1000, v: r.speed / 1000, acc: 0, q: 0, m: this.massOf(T) / 1000, F: this.poussee(T) / 1e6, phase: this.phase(T) + (r.moon ? ' · par rapport à la Lune' : '') };
  }
}
