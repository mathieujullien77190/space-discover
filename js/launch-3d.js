// Lancement de satellite en 3D sur la Terre : une fusée de type Ariane 5 ECA SIMPLIFIÉE (valeurs de js/launch.js, écrites de mémoire) décolle d'un site de lancement plein est
// et dépose un satellite sur une orbite circulaire. La physique (js/launch.js) est calculée d'un coup dans un plan inertiel vers l'est ; ici on la replace sur la sphère :
// plan défini par la verticale du site (s) et l'est local (e) à l'instant du décollage, puis rotation de −ω·T autour de l'axe des pôles pour passer dans le repère de la Terre (celui de la scène).
// Classe Launch : sans DOM (testable dans Node). buildLaunchPanel : le panneau (site, orbite, lecture, étapes).
const LAUNCH_SITES = [
  { id: 'kourou', name: 'Kourou (Guyane)', lat: 5.2408, lon: -52.7688 }   /* pas de tir d'Ariane 5 (ELA-3), repéré sur l'image Pléiades */,
  { id: 'canaveral', name: 'Cap Canaveral — LC-39A (États-Unis)', lat: 28.609, lon: -80.6048 },
  { id: 'sriharikota', name: 'Sriharikota (Inde)', lat: 13.7199, lon: 80.2304 },
  { id: 'wenchang', name: 'Wenchang (Chine)', lat: 19.6145, lon: 110.951 },
  { id: 'baikonour', name: 'Baïkonour — Site 1 (Kazakhstan)', lat: 45.92, lon: 63.3422 },
  { id: 'tanegashima', name: 'Tanegashima (Japon)', lat: 30.4009, lon: 130.9689 },
];

// types de satellite : chacun a son orbite (altitude circulaire), sa masse (charge utile de la fusée ; valeurs courantes, arrondies) et sa taille relative
const SAT_TYPES = [
  { name: 'Station spatiale / ravitaillement (ISS)', km: 400, payload: 9, scale: 1.4, desc: 'Orbite basse : 90 min par tour.' },
  { name: 'Internet en orbite basse (Starlink)', km: 550, payload: 3, scale: 1, desc: 'Orbite basse : 95 min par tour. En vrai, des dizaines de satellites par lancement.' },
  { name: 'Observation de la Terre (Sentinel, Landsat)', km: 700, payload: 2, scale: 0.9, desc: 'Orbite basse. En vrai héliosynchrone (≈ 98°, passe à la même heure solaire) ; ici lancée plein est.' },
  { name: 'Météo en orbite polaire (MetOp)', km: 830, payload: 4, scale: 1.1, desc: 'Orbite basse (101 min par tour). En vrai polaire ; ici plein est.' },
  { name: 'Téléphonie par satellite (Globalstar)', km: 1414, payload: 1, scale: 0.7, desc: 'Orbite moyenne basse : 114 min par tour.' },
  { name: 'Navigation GPS', km: 20200, payload: 2, scale: 1, desc: 'Orbite moyenne : 12 h par tour. Environ 3 h de transfert.' },
  { name: 'Navigation Galileo', km: 23222, payload: 2, scale: 1, desc: 'Orbite moyenne : 14 h par tour.' },
  { name: 'Télécom / météo géostationnaire', km: 35786, payload: 3, scale: 1.5, desc: 'Orbite géostationnaire : 24 h par tour, reste au-dessus d\'un point fixe de l\'équateur (si lancé depuis l\'équateur : sinon l\'orbite est inclinée de la latitude du site). Environ 5,6 h de transfert.' },
  { id: 'sputnik', story: 'sputnik', name: '📜 Histoire : Spoutnik 1 (1957)', km: 215, apoKm: 939, payload: 0.0836, scale: 1, site: 'baikonour', rocket: 'r7', az: Math.asin(Math.cos(65.1 * Math.PI / 180) / Math.cos(45.92 * Math.PI / 180)), desc: 'Le premier satellite artificiel (URSS) : fusée R-7 de Tiouratam, orbite elliptique 215 × 939 km inclinée de 65,1° (tir vers le nord-est, azimut ≈ 37°). Récit et photos à gauche.' },
];
const fmtPeriod = (km, apo) => { const T = 2 * Math.PI * Math.sqrt(Math.pow(LCH.RE + (apo != null ? (km + apo) / 2 : km) * 1000, 3) / LCH.MU) / 60; return T < 180 ? Math.round(T) + ' min' : (T / 60).toFixed(1).replace('.', ',') + ' h'; };
const NOZ = { epc: 5.5, eap: 3.5, esc: 2.2 };   // longueur (m) des tuyères sous chaque étage : le feu naît à leur sortie (à régler ici)
const SLOW_FLOOR = 0.3, SLOW_HOLD = 3, SLOW_K = 2;   // ralenti aux étapes : vitesse plancher, durée après l'événement (s de vol), raideur du freinage
const MU_M = 1e-3 / R_KM;   // unités de la scène par mètre
class Launch {
  constructor(site, targetKm, payloadKg, satScale, opts) {
    const L = LCH, o = opts || {}, spec = this.rocketSpec = (o.rocketId && ROCKETS[o.rocketId]) || rocketOf(site), az = o.az != null ? o.az : Math.PI / 2;   // az : azimut de tir (π/2 = plein est)
    this.payloadUsed = Math.min(payloadKg || 9e3, spec.maxPayload * 0.9);   // charge limitée par la capacité de la fusée
    const sim = this.sim = simulateLaunch(targetKm, { lat: site.lat, payload: this.payloadUsed, az, rocket: spec, apoKm: o.apoKm });
    this.story = o.story || null; this.direct = !!(spec.phys && spec.phys.direct);   // story : mission historique (js/story.js) ; direct : le dernier étage met la charge en orbite
    this.opt = o.opt || launchOptDefault();   // options d'affichage (partagées entre les lancements)
    this.site = site; this.targetKm = targetKm; this.satScale = satScale || 1; this.T = 0; this.speed = 1; this.stepPause = true; this.stopT = null; this.effSpeed = 1; this.playing = true; this.userDir = false;
    this.s = ll(site.lon, site.lat); { const east = new THREE.Vector3(-Math.sin(site.lon * DEG), 0, -Math.cos(site.lon * DEG)), north = new THREE.Vector3(0, 1, 0).addScaledVector(this.s, -this.s.y).normalize(); this.e = east.multiplyScalar(Math.sin(az)).addScaledVector(north, Math.cos(az)).normalize(); } this.n = new THREE.Vector3().crossVectors(this.s, this.e);   // verticale, est, nord (plan : s, e)
    this.crossTau = 80; this.crossV = LCH.WE * LCH.RE * Math.cos(site.lat * DEG) * new THREE.Vector3(-Math.sin(site.lon * DEG), 0, -Math.cos(site.lon * DEG)).dot(this.n);   // vitesse transversale initiale du pas de tir (m/s), annulée en ~80 s
    this.Y = new THREE.Vector3(0, 1, 0);
    const S = sim.samples; this.last = S[S.length - 1]; this.tEnd = sim.tEnd; this.Tmax = (sim.ok ? sim.tEnd : this.last.t) + 900;
    this.ev = {}; for (const e of sim.events) this.ev[e.key] = e;
    this.pos = new THREE.Vector3(); this.center = new THREE.Vector3();   // pos = base du lanceur ; center = milieu (cible de la caméra)
    this.dir = new THREE.Vector3(0, 1, 0); this.camDir = new THREE.Vector3(); this.camDistKm = 0.3; this.altM = 0;
    this.group = new THREE.Group();
    this.trailN = S.length; this.trailPos = new Float32Array((S.length + 1) * 3);
    const tmp = new THREE.Vector3();
    S.forEach((p, i) => { this.toEF(p.x, p.y, p.t, tmp); this.trailPos.set([tmp.x, tmp.y, tmp.z], 3 * i); });
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3)); tg.setDrawRange(0, 1);
    this.trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: 0xffb060 })); this.trail.frustumCulled = false; this.group.add(this.trail);
    // trajectoire PRÉVUE (tout le vol, tracée d'avance en pâle) et repères des étapes (position de chaque événement)
    let planArr = this.trailPos.slice(0, S.length * 3);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(planArr, 3));
    this.plan = new THREE.Line(pg, new THREE.LineBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.5 })); this.plan.frustumCulled = false; this.group.add(this.plan);
    const evList = sim.events.map(e => ({ t: e.t, key: e.key, label: e.label, x: e.x, y: e.y, v: e.v }));
    this.markers = [{ t: 0, key: 't0', label: 'Décollage', x: S[0].x, y: S[0].y, v: 0 }].concat(evList).map(m => { const p = m.x !== undefined ? this.toEF(m.x, m.y, m.t, new THREE.Vector3()) : this.efOf(this.stateAt(m.t), m.t, new THREE.Vector3()); return { t: m.t, key: m.key, v: m.v, label: m.label, pos: p, unit: p.clone().normalize(), altKm: (p.length() - 1) * R_KM }; });
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.markers.flatMap(m => [m.pos.x, m.pos.y, m.pos.z])), 3));
    // traits verticaux sous chaque étape (hauteur au-dessus du sol) et sous la fusée
    const vl = new Float32Array(this.markers.length * 6); this.markers.forEach((m, i) => vl.set([m.pos.x, m.pos.y, m.pos.z, m.unit.x, m.unit.y, m.unit.z], 6 * i));
    const vg = new THREE.BufferGeometry(); vg.setAttribute('position', new THREE.BufferAttribute(vl, 3));
    this.markDrops = new THREE.LineSegments(vg, new THREE.LineBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.4 })); this.markDrops.frustumCulled = false; this.group.add(this.markDrops);
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.hLine = new THREE.Line(hg, new THREE.LineBasicMaterial({ color: 0xffa040 })); this.hLine.frustumCulled = false; this.group.add(this.hLine);
    this.markPts = new THREE.Points(mg, new THREE.PointsMaterial({ color: 0x7fe3ff, size: 9, sizeAttenuation: false })); this.markPts.frustumCulled = false; this.group.add(this.markPts);
    // orbite finale (cercle dans le plan inertiel, tournée avec la Terre)
    this.ring = new THREE.Group(); this.ring.visible = false; this.group.add(this.ring);
    if (sim.ok) {
      const pts = phOrbitPoints(sim.state, 180).map(p => this.s.clone().multiplyScalar(p[0] / L.RE).addScaledVector(this.e, p[1] / L.RE));   // orbite visée (ellipse képlérienne)
      const rl = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x7fe3ff })); rl.frustumCulled = false; this.ring.add(rl);
    }
    this.buildModels();
    if (o.story === 'sputnik') this.buildSputnik();
    this.buildPieces();
    // noms affichés sur les éléments (étiquettes posées par main.js) : fusée, satellite, boosters, coiffe, étage principal
    const V = () => new THREE.Vector3();
    { const nm = spec.names, bo = spec.model.boosters, tl = [{ id: 'rocket', text: spec.name + '', pos: V(), on: true }, { id: 'sat', text: 'Satellite', pos: V(), on: false }];
      if (bo) for (let k = 0; k < bo.n; k++) tl.push({ id: 'eap' + (k + 1), text: 'Booster' + (bo.n > 1 ? ' n°' + (k + 1) : ''), pos: V(), on: false, piece: true });
      tl.push({ id: 'fairA', text: 'Coiffe n°1', pos: V(), on: false, piece: true }, { id: 'fairB', text: 'Coiffe n°2', pos: V(), on: false, piece: true }, { id: 'epc', text: nm.stage1, pos: V(), on: false, piece: true }); this.tagList = tl; }
    this.follow = 'rocket';   // élément suivi par la caméra : 'rocket', 'sat' ou l'id d'un débris (clic sur son nom)
    this.focusPos = new THREE.Vector3();
    this.tagMap = {}; for (const t of this.tagList) { t.base = t.text; this.tagMap[t.id] = t; }
    if (o.story === 'sputnik') { const t = this.tagMap.sat; t.text = t.base = 'Spoutnik 1'; }
  }

  // plan inertiel (x vertical du site, y est) -> repère de la Terre à l'instant T
  // Décalage transversal au plan de la trajectoire (m) : la rotation de la Terre donne au pas de tir une vitesse vers l'est ; seule sa composante le long du plan est dans la simulation planaire, la composante transversale
  // (nulle pour un tir plein est) est annulée par le guidage en quelques dizaines de secondes (virage « en lacet »). Sans ce décalage la fusée glisserait de côté dès le décollage dans le repère de la Terre (≈ 250 m/s pour Spoutnik).
  zMain(T) { return this.crossV * this.crossTau * (1 - Math.exp(-T / this.crossTau)); }
  // plan inertiel (x vertical du site, y sens du tir) + décalage transversal z (m) -> repère de la Terre à l'instant T ; z : décalage de l'objet (par défaut celui du lanceur)
  toEF(x, y, T, out, z) {
    const R = LCH.RE; return out.copy(this.s).multiplyScalar(x / R).addScaledVector(this.e, y / R).addScaledVector(this.n, (z != null ? z : this.zMain(T)) / R).applyAxisAngle(this.Y, -LCH.WE * T).multiplyScalar(PATCH_R);   // PATCH_R : le sol est la photo aérienne, posée un souffle au-dessus de la sphère
  }
  // direction de la poussée (angle phi au-dessus de l'horizontale locale) dans le repère de la Terre
  dirEF(x, y, phi, T, out) {
    const r = Math.hypot(x, y), ux = x / r, uy = y / r, c = Math.cos(phi), sn = Math.sin(phi);
    // û = ux·s + uy·e ; ê' = −uy·s + ux·e
    out.copy(this.s).multiplyScalar(ux * sn - uy * c).addScaledVector(this.e, uy * sn + ux * c);
    return out.applyAxisAngle(this.Y, -LCH.WE * T).normalize();
  }
  // état du plan à T : échantillon interpolé, ou orbite circulaire après la fin
  stateAt(T) {
    const S = this.sim.samples, sm = LCH.SAMPLE;
    if (T >= this.last.t) {
      if (!this.sim.ok) return Object.assign({}, this.last);
      const k = phKepler(this.sim.state, T - this.tEnd);   // orbite képlérienne (cercle ou ellipse) après l'insertion
      return Object.assign({}, this.last, { x: k.x, y: k.y, vx: k.vx, vy: k.vy, phi: 0, F: 0, eap: false, epc: false, esc: false, fairing: false, eapAttached: false, epcAttached: false, phase: 'en orbite', idx: S.length - 1 });
    }
    let i = Math.min(S.length - 2, Math.max(0, Math.floor(T / sm))); while (i > 0 && S[i].t > T) i--; while (i < S.length - 2 && S[i + 1].t <= T) i++;
    const a = S[i], b = S[i + 1], f = Math.max(0, Math.min(1, (T - a.t) / Math.max(1e-9, b.t - a.t)));
    const lerp = k => a[k] + (b[k] - a[k]) * f;
    return Object.assign({}, a, { x: lerp('x'), y: lerp('y'), phi: lerp('phi'), alt: lerp('alt'), v: lerp('v'), m: lerp('m'), acc: lerp('acc'), q: lerp('q'), idx: i });
  }

  // ---------- modèles (mètres ; axe y = poussée, origine au centre du lanceur) ----------
  buildModels() {
    const R = this.rocketSpec, mo = R.model, core = mo.core, bo = mo.boosters, up = mo.upper, fa = mo.fairing, NZ = mo.noz;
    const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.1 }, o || {}));
    const cyl = (r, h, c, y, o) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), M(c, o)); m.position.y = y + h / 2; return m; };
    const cone = (r0, r1, h, c, y) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, 20), M(c)); m.position.y = y + h / 2; return m; };
    const NOZC = 0x3a3a3e, upBase = core.h, fairBase = core.h + up.h;
    // étage principal : cylindre + jupe + tuyère (l'origine du modèle est la base du lanceur : au décollage elle touche le sol)
    this.mEpc = new THREE.Group(); this.mEpc.add(cyl(core.r, core.h, core.color, 0), cyl(core.r + 0.05, 0.6, 0x555555, 0), cone(core.r * 0.48, core.r * 0.19, NZ.epc, NOZC, -NZ.epc));
    // boosters latéraux répartis autour du corps central
    this.mBoost = []; this.boostPos = [];
    if (bo) for (let k = 0; k < bo.n; k++) {
      const a = (k + 0.5) * 2 * Math.PI / bo.n, g = new THREE.Group();
      g.add(cyl(bo.r, bo.h, bo.color, 0), cone(bo.r * 0.73, bo.r * 0.33, NZ.eap, NOZC, -NZ.eap), cyl(bo.r * 1.01, bo.h * 0.1, bo.band, bo.h * 0.016));
      if (bo.nose) g.add(cone(bo.r, 0.1, bo.nose, bo.color, bo.h));
      g.position.set(bo.R * Math.cos(a), 0, bo.R * Math.sin(a)); this.mBoost.push(g); this.boostPos.push([Math.cos(a), Math.sin(a)]);
    }
    // étage supérieur (+ satellite, caché sous la coiffe tant qu'elle est là)
    this.mEsc = new THREE.Group(); this.mEsc.add(cyl(up.r, up.h, up.color, upBase), cone(up.r * 0.36, up.r * 0.16, NZ.esc, NOZC, upBase - NZ.esc));
    this.payloadY = fairBase + 1.3;
    this.satG = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3, 2.4), M(0xd6b34a, { metalness: 0.5 }));
    const pan = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 2.6), M(0x1d3b9b, { emissive: 0x0b1a4a })); this.satG.add(body, pan); this.satPan = pan; this.satG.scale.setScalar(MU_M * (this.satScale || 1)); this.group.add(this.satG);
    // coiffe
    this.mFair = new THREE.Group(); this.mFair.add(cyl(fa.r, fa.cyl, fa.color, fairBase), cone(fa.r, fa.r * 0.11, fa.cone, fa.color, fairBase + fa.cyl));
    this.parts = [this.mEpc, ...this.mBoost, this.mEsc, this.mFair];
    // flammes : cône dont la BASE est à l'origine (la pointe vers −y) pour que l'étirement de la vacillation parte de la tuyère ; rentrée de 0,3 m dans la tuyère (aucun jour visible)
    const fl = (r, h, x, z, y0) => { const geo = new THREE.ConeGeometry(r, h, 14, 1, true); geo.rotateX(Math.PI); geo.translate(0, -h / 2, 0); const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })); m.position.set(x, y0, z); const g = new THREE.Group(); g.add(m); g.userData.cone = m; return g; };
    this.fEpc = fl(core.r * 0.45, 11 * core.r, 0, 0, -NZ.epc + 0.3);
    this.fBoost = bo ? this.mBoost.map(g => fl(bo.r * 0.7, 16 * bo.r, g.position.x, g.position.z, -NZ.eap + 0.3)) : [];
    this.fEsc = fl(up.r * 0.34, 3.7 * up.r, 0, 0, -NZ.esc + 0.3); this.fEsc.position.y = upBase;
    this.rocket = new THREE.Group(); this.rocket.scale.setScalar(MU_M); this.body = new THREE.Group();
    this.body.add(...this.parts, this.fEpc, ...this.fBoost, this.fEsc); this.rocket.add(this.body); this.group.add(this.rocket);
    this.rocketLen = fairBase + fa.cyl + fa.cone;
    // repères visibles de loin
    const dot = (c) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color: c, size: 8, sizeAttenuation: false })); p.frustumCulled = false; this.group.add(p); return p; };
    this.dotRocket = dot(0xffffff); this.dotSat = dot(0xffd54a); this.mk = dot;
  }
  // Spoutnik 1 : sphère polie de 58 cm et ses 4 antennes (2 de 2,4 m, 2 de 2,9 m) rabattues vers l'arrière
  buildSputnik() {
    const g = this.satG; while (g.children.length) g.remove(g.children[0]);
    const mat = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.18, metalness: 0.95, emissive: 0x1a1d22 });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.29, 32, 24), mat));
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, len = k % 2 ? 2.9 : 2.4, d = new THREE.Vector3(Math.sin(0.61) * Math.cos(a), -Math.cos(0.61), Math.sin(0.61) * Math.sin(a)).normalize();
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 6), mat); ant.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); ant.position.copy(d).multiplyScalar(0.27 + len / 2); g.add(ant); }
    this.satPan = new THREE.Group(); g.add(this.satPan);   // (pas de panneaux : piles chimiques)
  }
  // débris : AUCUN code propre à chaque pièce. On passe au moteur générique (js/physics.js) le MODÈLE de la pièce (masse sèche, propergol restant, forme) et son état à la séparation
  // (position, vitesse + petite poussée de séparation) ; la masse, la surface moyenne qui culbute et donc le coefficient balistique en découlent, et la chute (gravité, traînée, rotation de la Terre) se calcule seule.
  buildPieces() {
    const R = this.rocketSpec, mo = R.model, ph = Object.assign({}, LCH, R.phys), nm = R.names, Yv = new THREE.Vector3(0, 1, 0), wEff = PH.WE * Math.cos(this.site.lat * DEG);
    const sepDv = Object.assign({ eap: -1.5, fairing: 0.3, epcsep: -1, sat: -0.6 }, R.sepDv || {});   // m/s le long de la trajectoire (rétrofusées / ressorts)
    // un débris : model = { name, dry, prop, shape } ; lat = direction d'éloignement dans le plan du lanceur (cosmétique, hors du plan simulé)
    const mkPiece = (key, model, mesh, lat, r0, tumble, tag, burns) => {
      const e = this.ev[key]; if (!e) return;
      const r = Math.hypot(e.x, e.y), dv = sepDv[key] || 0;
      const body = new Body(model, { x: e.x, y: e.y, vx: e.vx - dv * e.y / r, vy: e.vy + dv * e.x / r, t: 0 }, { wEff, mode: 'tumble' });
      const res = body.propagate({ tMax: 9000, sampleDt: 1, burnupAlt: burns ? 70e3 : null }), out = res.samples.map(s => [s.x, s.y]);
      const last = out[out.length - 1], z0 = this.zMain(e.t), zd = this.crossV * Math.exp(-e.t / this.crossTau), impact = this.toEF(last[0], last[1], e.t + out.length, new THREE.Vector3(), z0 + zd * out.length), /* le débris garde la vitesse transversale du lanceur à la séparation */ endText = burns ? 'rentrée atmosphérique (désintégration)' : "impact dans l'océan";
      const g = new THREE.Group(); g.add(mesh); g.visible = false; g.scale.setScalar(MU_M); this.group.add(g);
      const d = this.mk(0xaaaaaa), dir = this.dirAtEvent(e), latWorld = new THREE.Vector3(lat[0], 0, lat[1]).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Yv, dir));
      this.pieces.push({ z0, zd, key, e, path: out, mesh, g, len: Math.max(model.shape.h, model.shape.r * 2), latWorld, r0, tumble, tagKey: tag, impact, endText, dot: d, dir, model, cdA: body.cdA, ballistic: model.dry / body.cdA });
    };
    this.pieces = [];
    // les meshes de débris sont des copies centrées sur leur milieu
    const centered = (src, mid) => { const g = new THREE.Group(), c = src.clone(); c.position.set(0, c.position.y - mid, 0); g.add(c); return g; };
    const bo = mo.boosters, fa = mo.fairing, core = mo.core;
    if (bo) { const h = bo.h + (bo.nose || 0) + mo.noz.eap; this.mBoost.forEach((m, k) => mkPiece('eap', { name: nm.booster, dry: ph.eap.dry, prop: 0, shape: { type: 'cyl', r: bo.r, h } }, centered(m, (bo.h + (bo.nose || 0)) / 2), this.boostPos[k], bo.R, 0, 'eap' + (k + 1), false)); }
    const fairModel = { name: 'Coiffe (moitié)', dry: ph.fairing / 2, prop: 0, shape: { type: 'shell', r: fa.r, h: fa.cyl + fa.cone / 2 } }, fairMid = core.h + mo.upper.h + (fa.cyl + fa.cone) / 2;
    mkPiece('fairing', fairModel, centered(this.mFair, fairMid), [0, 1], fa.r * 0.6, 0.4, 'fairA', false);
    mkPiece('fairing', fairModel, centered(this.mFair, fairMid), [0, -1], fa.r * 0.6, -0.4, 'fairB', false);
    mkPiece('epcsep', { name: nm.stage1, dry: ph.epc.dry, prop: ph.epc.prop * 0.02, shape: { type: 'cyl', r: core.r, h: core.h + mo.noz.epc } }, centered(this.mEpc, core.h / 2), [0, 0], 0, 0.05, 'epc', !!nm.stage1Burns);
    if (ph.direct) mkPiece('sat', { name: nm.stage1, dry: ph.epc.dry, prop: ph.epc.prop * 0.01, shape: { type: 'cyl', r: core.r, h: core.h + mo.noz.epc } }, centered(this.mEpc, core.h / 2), [0, 0], 0, 0.02, 'epc', false);   // le bloc central reste en orbite derrière le satellite (c'est lui qu'on voyait à l'œil nu)
  }
  // Le nez suit la TRACE affichée (vitesse dans le repère de la Terre). Mesuré : la direction de poussée du guidage s'en écarte de 20 à 46° entre T+160 et T+520 s (loi d'altitude de l'étage principal, simplification) ; on ne l'affiche pas, c'est la trajectoire qu'on veut lire. Au sol (vitesse < 30 m/s) on fond vers la verticale du guidage.
  efOf(st, T, out) { return st.ef ? out.copy(st.ef) : this.toEF(st.x, st.y, T, out); }   // position absolue d'un état (plan ou absolue)
  blendPath(T, dir) {
    const h = 0.25, t0 = Math.max(0, T - h), t1 = T + h, a = this.stateAt(t0), b = this.stateAt(t1), pa = this.efOf(a, t0, this._pa || (this._pa = new THREE.Vector3())), pb = this.efOf(b, t1, this._pb || (this._pb = new THREE.Vector3()));
    const v = pb.sub(pa), spd = v.length() / (t1 - t0) * R_KM * 1000;   // m/s
    if (spd > 1) { v.normalize(); const w = Math.min(1, spd / 30); dir.multiplyScalar(1 - w).addScaledVector(v, w).normalize(); }
    return dir;
  }
  dirAtEvent(e) {
    const S = this.sim.samples; let b = S[0]; for (const p of S) { if (p.t > e.t) break; b = p; }
    return this.blendPath(e.t, this.dirEF(b.x, b.y, b.phi, e.t, new THREE.Vector3()));
  }

  // ---------- mise à jour ----------
  // options d'un élément (id d'étiquette) : trajectoire, vitesse, hauteur ; la fusée montre sa hauteur par défaut
  elOpt(id) { const e = this.opt.el; if (!e[id]) e[id] = { traj: false, speed: true, alt: id === 'rocket' }; return e[id]; }
  // trajectoire (trait) et trait de hauteur d'un débris, créés à la demande selon ses options
  pieceExtras(p, pos, flying) {
    const eo = this.elOpt(p.tagKey || p.key), tmp = this._pe || (this._pe = new THREE.Vector3());
    if (eo.traj && !p.traj) { const arr = new Float32Array(p.path.length * 3); p.path.forEach((q, k) => { this.toEF(q[0], q[1], p.e.t + k, tmp, p.z0 + p.zd * k); arr.set([tmp.x, tmp.y, tmp.z], 3 * k); }); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3)); p.traj = new THREE.Line(g, new THREE.LineBasicMaterial({ color: p.key === 'eap' ? 0xffa040 : p.key === 'fairing' ? 0xe0e0e0 : 0xff6a6a })); p.traj.frustumCulled = false; this.group.add(p.traj); }
    if (p.traj) p.traj.visible = !!eo.traj;
    if (eo.alt && !p.hl) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)); p.hl = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffd0a0, transparent: true, opacity: 0.8 })); p.hl.frustumCulled = false; this.group.add(p.hl); }
    if (p.hl) { p.hl.visible = !!eo.alt && flying; if (p.hl.visible) { const a = p.hl.geometry.attributes.position, u = pos.clone().normalize(); a.setXYZ(0, pos.x, pos.y, pos.z); a.setXYZ(1, u.x, u.y, u.z); a.needsUpdate = true; } }
  }
  jump(T) { this.T = Math.max(0, Math.min(this.Tmax, T)); }
  update(dt, camera) {
    // ralenti extrême à chaque étape : autour de chaque événement (1 s avant → 3 s après) la lecture tombe à ×0,3 pour qu'on voie les boosters partir ; la bulle de la frise s'ouvre ; en dehors, la vitesse choisie s'applique (freinage / reprise progressifs)
    let sp = this.speed;
    if (this.stepPause && this.playing && sp > SLOW_FLOOR) {
      let next = Infinity, prev = -Infinity; for (const m of this.markers) { if (m.t >= this.T - 1e-9 && m.t < next) next = m.t; if (m.t <= this.T && m.t > prev) prev = m.t; }
      sp = Math.min(sp, Math.max(SLOW_FLOOR, SLOW_K * Math.min(next - this.T - 1, Math.max(0, this.T - prev - SLOW_HOLD))));
    }
    this.effSpeed = sp;
    if (this.playing) this.T = Math.min(this.Tmax, this.T + dt * sp);
    const T = this.T, st = this.st = this.stateAt(T), tmp = this.tmpv || (this.tmpv = new THREE.Vector3());
    if (st.ef) { this.pos.copy(st.ef); this.dir.copy(this.pos).normalize(); } else { this.toEF(st.x, st.y, T, this.pos); this.dirEF(st.x, st.y, st.F < 1 ? Math.atan2(st.vr, st.vt) : st.phi, T, this.dir); } this.blendPath(T, this.dir);   // nez le long de la trajectoire affichée (voir blendPath)
    this.altM = st.ef ? (this.pos.length() - 1) * LCH.RE : Math.hypot(st.x, st.y) - LCH.RE; this.radial = this.pos.clone().normalize();
    this.center.copy(this.pos).addScaledVector(this.dir, this.rocketLen / 2 * MU_M);
    { const a = this.hLine.geometry.attributes.position, u = this.radial || this.s; a.setXYZ(0, this.pos.x, this.pos.y, this.pos.z); a.setXYZ(1, u.x, u.y, u.z); a.needsUpdate = true; }   // trait vertical sous la fusée
    // orientation de la fusée : y local = poussée
    this.rocket.position.copy(this.pos); this.rocket.quaternion.setFromUnitVectors(this.Y, this.dir);
    const E = this.ev, past = k => E[k] && T >= E[k].t;
    const coreGone = this.direct && past('sat');   // insertion directe : après la séparation, le bloc central est un débris à part
    this.mBoost.forEach(m => m.visible = !past('eap')); this.mFair.visible = !past('fairing'); this.mEpc.visible = !past('epcsep') && !coreGone;
    this.fBoost.forEach(f => f.visible = !!st.eap && !past('eap')); this.fEpc.visible = !!st.epc; this.fEsc.visible = !!st.esc;
    const fk = 0.85 + 0.3 * Math.random(); for (const f of [...this.fBoost, this.fEpc, this.fEsc]) if (f.visible) f.userData.cone.scale.set(1, fk, 1);
    this.plan.visible = this.opt.plan; this.trail.visible = this.opt.trail; this.markPts.visible = this.markDrops.visible = this.opt.markers; this.ring.visible = !!this.sim.ok && this.opt.plan; this.ring.rotation.y = -LCH.WE * T; this.ring.children.forEach(c => { c.material.transparent = true; c.material.opacity = past('esc2end') ? 0.95 : 0.35; });   // orbite visée : pâle d'avance, vive une fois atteinte
    // sillage
    const n = Math.min(this.trailN, st.idx + 1), tp = this.trailPos; tp.set([this.pos.x, this.pos.y, this.pos.z], 3 * n);
    this.trail.geometry.setDrawRange(0, n + 1); this.trail.geometry.attributes.position.needsUpdate = true;
    // satellite largué : s'éloigne doucement vers le haut
    // satellite : sous la coiffe (au sommet de l'étage supérieur) jusqu'au largage, puis il s'éloigne doucement vers le haut
    const tSat = E.sat ? E.sat.t : 1e12, sat = this.satG, dm = MU_M;
    sat.position.copy(this.pos).addScaledVector(this.dir, this.payloadY * dm); sat.quaternion.copy(this.rocket.quaternion);
    if (T >= tSat) sat.position.addScaledVector(this.radial, (0.3 * Math.min(T - tSat, 3000) + 6) * dm);
    sat.visible = past('fairing') && (!!this.sim.ok || T < tSat);   // caché sous la coiffe (ses panneaux dépasseraient de la fusée)
    this.satPan.scale.x = 0.25 + 0.75 * Math.max(0, Math.min(1, (T - tSat) / 20));   // panneaux repliés jusqu'au largage, puis déployés en 20 s
    // débris
    const camP = camera ? camera.position : null;
    const px = (len, p) => camP ? (len / 1000 / Math.max(1e-9, camP.distanceTo(p) * R_KM)) / (2 * Math.tan(25 * DEG)) * innerHeightSafe() : 100;
    const tmpP = new THREE.Vector3(), side = this.n.clone().applyAxisAngle(this.Y, -LCH.WE * T);
    for (const t of this.tagList) if (t.piece) { t.on = false; t.text = t.base; t.speed = null; t.alt = null; }
    for (const p of this.pieces) {
      const tau = T - p.e.t; p.g.visible = tau >= 0 && tau < p.path.length;
      if (!p.g.visible) {
        this.pieceExtras(p, null, false);
        p.dot.visible = false;
        if (tau >= p.path.length && tau < p.path.length + 240 && p.tagKey) { const t = this.tagMap[p.tagKey]; t.on = true; t.pos.copy(p.impact); t.text = t.base + ' — ' + p.endText; p.dot.visible = true; p.dot.geometry.attributes.position.setXYZ(0, p.impact.x, p.impact.y, p.impact.z); p.dot.geometry.attributes.position.needsUpdate = true; }
        continue;
      }
      const ix = Math.min(p.path.length - 1, Math.floor(tau)), A = p.path[ix], B = p.path[Math.min(p.path.length - 1, ix + 1)], f = tau - Math.floor(tau);
      this.toEF(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, T, tmpP, p.z0 + p.zd * (T - p.e.t));
      tmpP.addScaledVector(p.latWorld, (p.r0 + 2.5 * Math.min(tau, 300)) * MU_M);   // les paires s'écartent
      if (p.tagKey) { const t = this.tagMap[p.tagKey]; t.on = true; t.pos.copy(tmpP); t.speed = Math.hypot(B[0] - A[0], B[1] - A[1]); t.alt = (tmpP.length() - 1) * R_KM * 1000; }   // vitesse (inertielle) = déplacement par seconde de la trajectoire calculée
      p.g.position.copy(tmpP); p.g.quaternion.setFromUnitVectors(this.Y, p.dir); if (p.tumble) p.g.rotateOnAxis(new THREE.Vector3(1, 0, 0), p.tumble * tau);
      this.pieceExtras(p, tmpP, true);
      const big = px(p.len, tmpP) >= 6; p.mesh.visible = big;
      p.dot.visible = !big; p.dot.geometry.attributes.position.setXYZ(0, tmpP.x, tmpP.y, tmpP.z); p.dot.geometry.attributes.position.needsUpdate = true;
    }
    { const r = this.tagMap.rocket; r.speed = this.st.v; this.tagMap.sat.speed = this.st.v; r.alt = this.altM; this.tagMap.sat.alt = this.altM; r.on = !coreGone; r.pos.copy(this.center); r.text = this.direct ? this.rocketSpec.name + '' : past('epcsep') ? this.rocketSpec.names.stage2 + (past('sat') ? '' : ' + satellite') : this.rocketSpec.name + ''; const sa = this.tagMap.sat; sa.on = past('sat') && !!this.sim.ok; sa.pos.copy(this.satG.position); }
    const big = px(this.rocketLen, this.pos) >= 6; this.rocket.visible = big && !coreGone;
    this.dotRocket.visible = !big && !coreGone; this.dotRocket.geometry.attributes.position.setXYZ(0, this.pos.x, this.pos.y, this.pos.z); this.dotRocket.geometry.attributes.position.needsUpdate = true;
    this.dotSat.visible = false;
    // élément suivi : la fusée, le satellite largué ou un débris (si celui-ci a fini sa chute, retour à la fusée)
    let fpos = this.center, isRocket = true;
    if (this.follow === 'sat' && this.tagMap.sat.on) { fpos = this.tagMap.sat.pos; isRocket = false; }
    else if (this.follow !== 'rocket' && this.follow !== 'sat') { const t = this.tagMap[this.follow]; if (t && t.on) { fpos = t.pos; isRocket = false; } else this.follow = 'rocket'; }
    if (this.follow === 'sat' && !this.tagMap.sat.on) this.follow = 'rocket';
    this.focusPos.copy(fpos);
    // caméra automatique : sur le côté sud de la trajectoire (l'est est à droite), de plus en plus loin avec l'altitude (plus près pour un débris ou le satellite)
    const h = isRocket ? this.altM : Math.max(0, (fpos.length() - 1) * R_KM * 1000), ramp = Math.min(1, Math.max(0, (h - 100e3) / 200e3));
    this.camDistKm = isRocket ? (200 + 0.35 * h + ramp * 0.5 * h) / 1000 : (60 + 0.3 * h + ramp * 0.5 * h) / 1000;
    const up = isRocket ? this.radial : fpos.clone().normalize(), nrm = side, along = new THREE.Vector3().crossVectors(nrm, up).normalize();   // nrm × û = est (ê') à droite
    this.camDir.copy(nrm).multiplyScalar(-0.9).addScaledVector(up, 0.22 + 0.4 * ramp).addScaledVector(along, -0.15).normalize();
  }

  tel() {
    const s = this.st || this.stateAt(this.T), T = this.T;
    return { eff: this.effSpeed, T, alt: s.alt / 1000, v: s.v / 1000, acc: s.acc, q: s.q / 1000, m: s.m / 1000, F: s.F / 1e6, phase: s.phase };
  }
  dispose() { this.group.parent && this.group.parent.remove(this.group); this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
}
function innerHeightSafe() { return typeof innerHeight === 'number' ? innerHeight : 900; }
const fmtT = t => { const s = Math.floor(Math.abs(t)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return 'T+' + (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0'); };

// ---------- panneau ----------
function buildLaunchPanel(box, hooks) {
  box.innerHTML = '';
  const el = (tag, props, ...kids) => { const e = Object.assign(document.createElement(tag), props || {}); e.append(...kids); return e; };
  const sel = el('select'); LAUNCH_SITES.forEach((s, i) => sel.append(el('option', { value: i, textContent: s.name })));
  const tsel = el('select'); SAT_TYPES.forEach((t, i) => tsel.append(el('option', { value: i, textContent: t.name + ' — ' + (t.apoKm ? t.km + ' × ' + t.apoKm : t.km.toLocaleString('fr-FR')) + ' km' }))); tsel.append(el('option', { value: -1, textContent: 'Orbite personnalisée…' }));
  const custom = el('input', { type: 'number', min: 200, max: 40000, step: 50, value: 600 }), customRow = el('div', { hidden: true }, 'Altitude (km) : ', custom), info = el('div', { className: 'ldesc' });
  const chosen = () => { const i = +tsel.value; if (i >= 0) return SAT_TYPES[i]; const km = Math.max(200, Math.min(40000, +custom.value || 600)); return { name: 'Orbite personnalisée', km, payload: 3, scale: 1, desc: '' }; };
  const refresh = () => {
    customRow.hidden = +tsel.value >= 0; const t = chosen();
    if (t.site) { const k = LAUNCH_SITES.findIndex(x => x.id === t.site); if (k >= 0) sel.value = k; sel.disabled = true; } else sel.disabled = false;   // mission historique : site imposé
    const rk = t.rocket ? ROCKETS[t.rocket] : rocketOf(LAUNCH_SITES[+sel.value] || LAUNCH_SITES[0]), cap = rk.maxPayload * 0.9 / 1000, NL = String.fromCharCode(10);
    info.textContent = 'Fusée : ' + rk.name + ' (charge max ' + cap.toFixed(1).replace('.', ',') + ' t' + (t.payload > cap ? ' : charge réduite' : '') + ')' + NL + (t.desc ? t.desc + NL : '') + 'Orbite ' + (t.apoKm ? t.km + ' × ' + t.apoKm : t.km.toLocaleString('fr-FR')) + ' km · ' + fmtPeriod(t.km, t.apoKm) + ' par tour · charge ' + (t.payload < 1 ? Math.round(t.payload * 1000) + ' kg' : t.payload + ' t');
    emitPreview();
  };
  tsel.onchange = custom.oninput = refresh; sel.onchange = refresh; refresh();
  // aperçu de la trajectoire et des étapes dès le choix (si le panneau est ouvert) ; fonction hissée : appelée aussi par refresh() à la construction
  var pt = null;
  function emitPreview(d) {
    clearTimeout(pt);
    pt = setTimeout(() => { if (box.hidden || !hooks.preview) return; hooks.preview(LAUNCH_SITES[+sel.value] || LAUNCH_SITES[0], chosen()); }, d == null ? 250 : d);
  }
  const go = el('button', { textContent: '🚀 Lancer', className: 'go' });
  const msg = el('div', { className: 'lmsg' }), tel = el('pre', { className: 'ltel' }), evs = el('div', { className: 'levs' });
  const speeds = el('div'), spBtns = [];
  [['⏸', 0], ['×1', 1], ['×5', 5], ['×20', 20], ['×60', 60], ['×200', 200], ['×1000', 1000], ['×5000', 5000]].forEach(([n, v]) => { const b = el('button', { textContent: n, onclick: () => hooks.speed(v) }); spBtns.push([b, v]); speeds.append(b); });
  const slow = el('button', { textContent: '🐢 Ralenti extrême aux étapes', className: 'on', title: 'Ralentit à fond (×0,25) autour de chaque étape pour voir les boosters partir, et ouvre la bulle en bas', onclick: () => { slow.classList.toggle('on'); hooks.slow(slow.classList.contains('on')); } }), cam = el('button', { textContent: '🎥 Caméra auto', onclick: () => hooks.cam() });
  const run = el('div', { hidden: true }, tel, speeds, el('div', {}, slow, cam));
  let running = false;   // un vol est en cours (et non un simple aperçu) : le bouton devient « Arrêter »
  const syncGo = () => { go.textContent = running ? '⏹ Arrêter' : '🚀 Lancer'; go.classList.toggle('stop', running); };
  go.onclick = () => { if (running) hooks.stop(); else hooks.start(LAUNCH_SITES[+sel.value], chosen()); };
  box.append(el('div', {}, el('b', { textContent: '🚀 Lancement' })), el('label', {}, 'Site : ', sel), el('label', {}, 'Satellite : ', tsel), customRow, info, go, msg, run);
  let evBtns = [];
  return {
    show(launch) {
      running = !launch.preview; syncGo();
      run.hidden = false; evBtns = []; evs.innerHTML = '';
      const list = [{ t: 0, label: 'Décollage' }].concat(launch.sim.events.map(e => ({ t: e.t, label: e.label })));
      list.forEach(e => { const b = el('div', { className: 'lev', textContent: fmtT(e.t) + '  ' + e.label, onclick: () => hooks.jump(Math.max(0, e.t - 2)) }); b.dataset.t = e.t; evBtns.push(b); evs.append(b); });
      msg.textContent = launch.sim.ok ? '' : 'La fusée n\'atteint pas l\'orbite (trop basse : < ~150 km) : elle retombe.';
    },
    update(launch) {
      if (running !== !launch.preview) { running = !launch.preview; syncGo(); }
      const t = launch.tel(); tel.textContent = `${t.phase}   (lecture ×${t.eff < 10 ? t.eff.toFixed(1) : Math.round(t.eff)})\nAltitude   ${t.alt.toFixed(1)} km\nVitesse    ${t.v.toFixed(2)} km/s  (${Math.round(t.v * 3600).toLocaleString('fr-FR')} km/h)\nAccél.     ${t.acc.toFixed(1)} g\nPression dyn. ${t.q.toFixed(1)} kPa\nMasse      ${t.m.toFixed(1)} t   Poussée ${t.F.toFixed(1)} MN`;
      evBtns.forEach(b => b.classList.toggle('done', launch.T >= +b.dataset.t));
      spBtns.forEach(([b, v]) => b.classList.toggle('on', launch.playing ? v === launch.speed : v === 0));
    },
    hide() { run.hidden = true; running = false; syncGo(); },
    preview() { emitPreview(0); },
    pick(i) { sel.value = i; },
  };
}

// ---------- frise horizontale du temps (bas de l'écran) ----------
// Les étapes sont réparties à égale distance (échelle « par étapes » : à l'échelle réelle, boosters, coiffe et arrêt moteur se superposeraient) ; le curseur avance dans chaque tronçon proportionnellement au temps.
// Chaque étape a une pastille cliquable (saut à l'étape) et une bulle HTML (heure, altitude, vitesse, et le texte du récit pour une mission historique) qui s'ouvre au passage et au survol.
function buildTimeline(box, hooks) {
  const el = (tag, props, ...kids) => { const e = Object.assign(document.createElement(tag), props || {}); e.append(...kids); return e; };
  let groups = [], ticks = [], fill = null, cursor = null, now = null, story = null;
  const fmtAltV = (km, v) => (km < 10 ? Math.round(km * 1000) + ' m' : km < 1000 ? km.toFixed(1).replace('.', ',') + ' km' : Math.round(km).toLocaleString('fr-FR') + ' km') + (v != null ? ' · ' + (v / 1000).toFixed(2).replace('.', ',') + ' km/s (' + Math.round(v * 3.6).toLocaleString('fr-FR') + ' km/h)' : '');
  const timeOf = x => { const n = groups.length; if (n < 2) return 0; const f = Math.max(0, Math.min(1, x)) * (n - 1), i = Math.min(n - 2, Math.floor(f)); return groups[i].t + (f - i) * (groups[i + 1].t - groups[i].t); };   // inverse de posOf
  const posOf = T => { const n = groups.length; if (n < 2) return 0; if (T <= groups[0].t) return 0; for (let i = 1; i < n; i++) if (T <= groups[i].t) return (i - 1 + (T - groups[i - 1].t) / Math.max(1e-9, groups[i].t - groups[i - 1].t)) / (n - 1); return 1; };
  return {
    get active() { return groups.length > 0; },
    show(launch, storyData) {
      box.innerHTML = ''; groups = []; ticks = []; story = storyData || null;
      for (const m of launch.markers) { const g = groups[groups.length - 1]; if (g && Math.abs(g.t - m.t) < 0.75) { g.labels.push(m.label); g.keys.push(m.key); } else groups.push({ t: m.t, labels: [m.label], keys: [m.key], altKm: m.altKm, v: m.v }); }
      const track = el('div', { className: 'tl-track' }); fill = el('div', { className: 'tl-fill' }); cursor = el('div', { className: 'tl-cursor' }); now = el('div', { className: 'tl-now' }); cursor.append(now); track.append(fill);
      groups.forEach((g, i) => {
        const x = groups.length > 1 ? i / (groups.length - 1) * 100 : 0;
        let note = ''; if (story) for (const k of g.keys) { const n = story.notes.find(q => q.key === k || (k === 't0' && q.t === 0)); if (n) note = n.text; }
        const pop = el('div', { className: 'tl-pop', style: 'left:' + x + '%' }, el('b', { textContent: fmtT(g.t) + '  ' + g.labels.join(' · ') }), el('div', { className: 'tl-pv', textContent: fmtAltV(g.altKm, g.v) }), note ? el('div', { className: 'tl-pn', textContent: note }) : '');
        const tick = el('button', { className: 'tl-tick', style: 'left:' + x + '%', title: g.labels.join(' · '), onclick: () => hooks.jump(Math.max(0, g.t - 2)), onmouseenter: () => pop.classList.add('hover'), onmouseleave: () => pop.classList.remove('hover') });
        const lab = el('div', { className: 'tl-lab', style: 'left:' + x + '%', textContent: fmtT(g.t) });
        track.append(tick); box.append(pop, lab); ticks.push({ g, tick, pop, x });
      });
      // le curseur se déplace à la souris / au doigt (clic ou glisser n'importe où sur la frise) : la lecture se met en pause pendant le glissement puis reprend
      let dragging = false;
      const move = e => { const r = track.getBoundingClientRect(); hooks.jump(timeOf((e.clientX - r.left) / r.width)); };
      track.addEventListener('pointerdown', e => { dragging = true; track.setPointerCapture(e.pointerId); hooks.hold(true); move(e); e.preventDefault(); });
      track.addEventListener('pointermove', e => { if (dragging) move(e); });
      const end = () => { if (dragging) { dragging = false; hooks.hold(false); } };
      track.addEventListener('pointerup', end); track.addEventListener('pointercancel', end);
      track.append(cursor); box.prepend(track); box.hidden = false;
    },
    hide() { box.hidden = true; groups = []; },
    update(launch) {
      if (!groups.length) return; const x = posOf(launch.T) * 100;
      fill.style.width = x + '%'; cursor.style.left = x + '%'; now.textContent = fmtT(launch.T);
      const hold = Math.max(6, 3 * (launch.effSpeed || 1));   // la bulle reste ouverte ~3 s à l'écran, même en lecture rapide
      let lastPassed = -1; ticks.forEach((t, i) => { if (launch.T >= t.g.t) lastPassed = i; });
      ticks.forEach((t, i) => { const passed = launch.T >= t.g.t, stopped = launch.stopT != null && Math.abs(launch.stopT - t.g.t) < 0.8; t.tick.classList.toggle('done', passed); t.pop.classList.toggle('now', !launch.preview && ((i === lastPassed && launch.T < t.g.t + hold) || stopped)); });   // seule la dernière étape franchie garde sa bulle ; à l'arrêt sur une étape elle reste ouverte
    },
  };
}

// ---------- options d'affichage de la mission ----------
// Réglages partagés entre les lancements : affichage général + options par élément (fusée, charge utile, et chaque chose que la mission perd : boosters, coiffe, étage principal) : trajectoire, vitesse, hauteur.
function launchOptDefault() { return { plan: true, markers: true, trail: true, names: true, el: {} }; }
function buildOptionsPanel(box) {
  const el = (tag, props, ...kids) => { const e = Object.assign(document.createElement(tag), props || {}); e.append(...kids); return e; };
  let cur = null, liveCells = [];
  const fmtLive = t => { if (!t.on) return '—'; const p = []; if (t.speed != null) p.push((t.speed / 1000).toFixed(2).replace('.', ',') + ' km/s'); if (t.alt != null) p.push(t.alt < 10000 ? Math.round(t.alt).toLocaleString('fr-FR') + ' m' : (t.alt / 1000 < 1000 ? (t.alt / 1000).toFixed(1).replace('.', ',') : Math.round(t.alt / 1000).toLocaleString('fr-FR')) + ' km'); return p.join(' · ') || '—'; };
  const check = (get, set, title) => { const cb = el('input', { type: 'checkbox', checked: !!get(), title: title || '' }); cb.onchange = () => set(cb.checked); return cb; };
  return {
    clear() { cur = null; liveCells = []; box.innerHTML = ''; box.append(el('b', { textContent: '🎛 Éléments de la mission' }), el('div', { className: 'ldesc', textContent: 'Choisis un satellite dans « 🚀 Lancement » : les éléments de la mission (fusée, boosters, coiffe…) apparaîtront ici.' })); },
    show(launch) {
      cur = launch; liveCells = []; box.innerHTML = '';
      const o = launch.opt, head = el('div', { className: 'ohead' }, el('b', { textContent: '🎛 Éléments de la mission' }), el('button', { textContent: '✖', title: 'Fermer', onclick: () => { box.hidden = true; document.getElementById('bOpts').classList.remove('on'); } }));
      const gen = el('div', { className: 'ogen' }, el('div', { className: 'osub', textContent: 'Affichage général' }),
        el('label', {}, check(() => o.plan, v => { o.plan = v; }), ' trajectoire prévue et orbite visée'), el('label', {}, check(() => o.trail, v => { o.trail = v; }), ' sillage de la fusée'),
        el('label', {}, check(() => o.markers, v => { o.markers = v; }), ' étapes sur la trajectoire (points, noms, hauteurs)'), el('label', {}, check(() => o.names, v => { o.names = v; }), ' noms des éléments'));
      const tbl = el('table', { className: 'otbl' }); tbl.append(el('tr', {}, el('th', { textContent: 'Élément' }), el('th', { textContent: 'Trajet', title: 'trait de la trajectoire' }), el('th', { textContent: 'Vitesse' }), el('th', { textContent: 'Haut.', title: 'hauteur : valeur et trait vertical' }), el('th', { textContent: 'En direct' })));
      const rows = [], addRow = (t, withTraj) => {
        const eo = launch.elOpt(t.id), cbs = {}; const tr = el('tr', {}, el('td', { textContent: t.base }));
        for (const k of ['traj', 'speed', 'alt']) { const td = el('td'); if (k !== 'traj' || withTraj) { cbs[k] = check(() => eo[k], v => { eo[k] = v; }); td.append(cbs[k]); } tr.append(td); }
        const live = el('td', { className: 'olive' }); liveCells.push([t, live]); tr.append(live); tbl.append(tr); rows.push({ t, eo, cbs, withTraj });
      };
      launch.tagList.forEach(t => { if (!t.piece) addRow(t, false); });
      const pieces = launch.tagList.filter(t => t.piece);
      if (pieces.length) {
        tbl.append(el('tr', { className: 'osep' }, el('td', { colSpan: 5, textContent: 'Ce que la mission perd en route' })));
        const all = el('tr', { className: 'oall' }, el('td', { textContent: 'tous' }));
        for (const k of ['traj', 'speed', 'alt']) { const cb = el('input', { type: 'checkbox' }); cb.onchange = () => rows.forEach(r => { if (r.t.piece && r.cbs[k]) { r.eo[k] = cb.checked; r.cbs[k].checked = cb.checked; } }); all.append(el('td', {}, cb)); }
        all.append(el('td')); tbl.append(all);
        pieces.forEach(t => addRow(t, true));
      }
      box.append(head, gen, tbl);
    },
    update(launch) { if (!cur) return; for (const [t, td] of liveCells) { const s = fmtLive(t); if (td.textContent !== s) td.textContent = s; } },
  };
}
