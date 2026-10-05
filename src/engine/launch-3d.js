import * as THREE from 'three';
import { buildLaikaModule } from './laika-model.js';
import { DEG, PATCH_R, R_KM, ll } from './earth.js';
import { flyObject, objectPeriodS, objectStart, objectToSpec } from './flight-object.js';
import { flyPlan, flyReturn, planToSpec } from './flight-plan.js';
import { LCH, simulateLaunch } from './launch.js';
import { Body, PH, phElements, phKepler, phOrbitPoints } from './physics.js';
import { ROCKETS, rocketOf } from './rockets.js';

export const LAUNCH_SITES = [
  { id: 'kourou', name: 'Kourou (Guyane)', lat: 5.2408, lon: -52.7688 }   /* pas de tir d'Ariane 5 (ELA-3), repéré sur l'image Pléiades */,
  { id: 'canaveral', name: 'Cap Canaveral — LC-39A (États-Unis)', lat: 28.609, lon: -80.6048 },
  { id: 'sriharikota', name: 'Sriharikota (Inde)', lat: 13.7199, lon: 80.2304 },
  { id: 'wenchang', name: 'Wenchang (Chine)', lat: 19.6145, lon: 110.951 },
  { id: 'baikonour', name: 'Baïkonour — Site 1 (Kazakhstan)', lat: 45.92, lon: 63.3422 },
  { id: 'tanegashima', name: 'Tanegashima (Japon)', lat: 30.4009, lon: 130.9689 },
];

// Lancement de satellite en 3D sur la Terre : une fusée de type Ariane 5 ECA SIMPLIFIÉE (valeurs de js/launch.js, écrites de mémoire) décolle d'un site de lancement plein est
// et dépose un satellite sur une orbite circulaire. La physique (js/launch.js) est calculée d'un coup dans un plan inertiel vers l'est ; ici on la replace sur la sphère :
// plan défini par la verticale du site (s) et l'est local (e) à l'instant du décollage, puis rotation de −ω·T autour de l'axe des pôles pour passer dans le repère de la Terre (celui de la scène).
// Classe Launch : sans DOM (testable dans Node).
export const TRAIL_COAST_DT = 8, TRAIL_COAST_MAX = 2000;   // sillage après la fin des échantillons : un point toutes les 8 s, au plus 2 000 (≈ 4 h)
export const SLOW_FLOOR = 0.3, SLOW_HOLD = 3, SLOW_K = 2;   // ralenti aux étapes : vitesse plancher, durée après l'événement (s de vol), raideur du freinage
export const MU_M = 1e-3 / R_KM;   // unités de la scène par mètre
export class Launch {
  constructor(site, targetKm, payloadKg, satScale, opts) {
    const L = LCH, o = opts || {}; this.inertial = !!o.inertial; const spec = this.rocketSpec = o.object ? objectToSpec(o.object) : o.plan ? planToSpec(o.plan) : (o.rocketId && ROCKETS[o.rocketId]) || rocketOf(site), az = o.az != null ? o.az : Math.PI / 2;   // az : azimut de tir (π/2 = plein est)
    this.payloadUsed = Math.min(payloadKg || 9e3, spec.maxPayload * 0.9);   // charge limitée par la capacité de la fusée
    const sim = this.sim = o.object ? flyObject(o.object, { date: o.date }) : o.plan ? flyPlan(o.plan) : simulateLaunch(targetKm, { lat: site.lat, payload: this.payloadUsed, az, rocket: spec, apoKm: o.apoKm });   // o.plan : plan de vol JSON (js/flight-plan.js), sans guidage
    this.story = o.story || null; this.direct = !!(spec.phys && spec.phys.direct);   // story : mission historique (js/story.js) ; direct : le dernier étage met la charge en orbite
    this.opt = o.opt || launchOptDefault();   // options d'affichage (partagées entre les lancements)
    this.site = site; this.targetKm = targetKm; this.satScale = satScale || 1; this.vk = 1; this.T = 0; this.speed = 1; this.stepPause = true; this.stopT = null; this.effSpeed = 1; this.playing = true; this.userDir = false;
    this.s = ll(site.lon, site.lat); { const east = new THREE.Vector3(-Math.sin(site.lon * DEG), 0, -Math.cos(site.lon * DEG)), north = new THREE.Vector3(0, 1, 0).addScaledVector(this.s, -this.s.y).normalize(); this.e = east.multiplyScalar(Math.sin(az)).addScaledVector(north, Math.cos(az)).normalize(); } this.n = new THREE.Vector3().crossVectors(this.s, this.e);   // verticale, est, nord (plan : s, e)
    this.crossTau = 80; this.crossV = LCH.WE * LCH.RE * Math.cos(site.lat * DEG) * new THREE.Vector3(-Math.sin(site.lon * DEG), 0, -Math.cos(site.lon * DEG)).dot(this.n);   // vitesse transversale initiale du pas de tir (m/s), annulée en ~80 s
    if (o.object && objectStart(o.object, { date: o.date }).frame === 'inertial') this.crossV = 0;   // objet déjà en orbite : pas de pas de tir qui tourne avec la Terre, donc pas de décalage transversal
    this.Y = new THREE.Vector3(0, 1, 0);
    this.wRot = LCH.WE - (sim.nodeRate || 0); this.padPos = this.s.clone().multiplyScalar(PATCH_R).addScaledVector(this.s, 30 * MU_M); this.satMassKg = (sim.plan && sim.plan.jettison && sim.plan.jettison.payload && sim.plan.jettison.payload.dryKg) || this.payloadUsed || 0;   // vitesse de rotation du plan par rapport au repère de la Terre : la Terre tourne (WE) et le plan d'un satellite dérive (précession J2 du nœud)
    const S = sim.samples; this.last = S[S.length - 1]; this.tEnd = sim.tEnd; this.Tmax = (sim.ok ? sim.tEnd : this.last.t) + 900;
    this.ev = {}; for (const e of sim.events) this.ev[e.key] = e;
    this.pos = new THREE.Vector3(); this.center = new THREE.Vector3();   // pos = base du lanceur ; center = milieu (cible de la caméra)
    this.dir = new THREE.Vector3(0, 1, 0); this.camDir = new THREE.Vector3(); this.camDistKm = 0.3; this.altM = 0;
    this.group = new THREE.Group();
    this.trailN = S.length; this.trailT0 = S.length ? S[S.length - 1].t : 0; this.coastN = 0; this.trailPos = new Float32Array((S.length + TRAIL_COAST_MAX + 1) * 3);   // après la fin des échantillons (vol képlérien) le sillage continue par points ajoutés au fil du temps
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
    if (sim.ok && !sim.hyperbolic) {
      const pts = phOrbitPoints(sim.state, 180).map(p => this.s.clone().multiplyScalar(p[0] / L.RE).addScaledVector(this.e, p[1] / L.RE));   // orbite visée (ellipse képlérienne)
      const rl = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x7fe3ff })); rl.frustumCulled = false; this.ring.add(rl);
    }
    // objet JSON en orbite : trajectoire À L'AVANCE sur un tour (même méthode que la « Trajectoire future » de l'ISS réelle : positions dans le repère de la Terre qui tourne, de maintenant à maintenant + une période), en cyan
    if (o.object && sim.ok && !sim.hyperbolic) { const N = 180, pos = new Float32Array((N + 1) * 3), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x4fe0ff })); line.frustumCulled = false; this.group.add(line); this.fut = { N, pos, g, line, period: objectPeriodS(o.object) || phElements(sim.state.x, sim.state.y, sim.state.vx, sim.state.vy).T, built: -1e12 }; }
    this.models = o.models || {};   // modèles 3D (glTF) des pièces, chargés avant le vol (js/stack-models.js) ; vide = cylindres
    this.buildModels();
    if (spec.tower) this.buildTower();
    if (o.story === 'sputnik') this.buildSputnik();
    this.buildPieces();
    this.buildSmoke();   // fumée au décollage (nuage au pas de tir + traînée basse)
    // noms affichés sur les éléments (étiquettes posées par main.js) ; le « Pas de tir » est en tête de liste (1re ligne du panneau « Composants »), puis la fusée : fusée, satellite, boosters, coiffe, étage principal
    const V = () => new THREE.Vector3();
    { const nm = spec.names, bo = spec.model.boosters, tl = [{ id: 'rocket', text: spec.name + '', pos: V(), on: true }, { id: 'sat', text: (spec.names && spec.names.payload) || 'Satellite', pos: V(), on: false, absent: !this.ev.sat }];
      if (bo) for (let k = 0; k < bo.n; k++) tl.push({ id: 'eap' + (k + 1), text: 'Booster' + (bo.n > 1 ? ' n°' + (k + 1) : ''), pos: V(), on: false, piece: true });
      tl.push({ id: 'fairA', text: 'Coiffe n°1', pos: V(), on: false, piece: true, absent: !this.ev.fairing }, { id: 'fairB', text: 'Coiffe n°2', pos: V(), on: false, piece: true, absent: !this.ev.fairing }, { id: 'epc', text: nm.stage1, pos: V(), on: false, piece: true }); if (S[0].alt < 200) tl.unshift({ id: 'pad', text: 'Pas de tir', pos: V(), on: true }); this.tagList = tl; }
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
    const R = LCH.RE; return out.copy(this.s).multiplyScalar(x / R).addScaledVector(this.e, y / R).addScaledVector(this.n, (z != null ? z : this.zMain(T)) / R).applyAxisAngle(this.Y, this.inertial ? 0 : -this.wRot * T).multiplyScalar(PATCH_R);   // inertial : repère inertiel (missions lunaires : c'est la Terre qui tourne, pas la scène)   // PATCH_R : le sol est la photo aérienne, posée un souffle au-dessus de la sphère
  }
  // direction de la poussée (angle phi au-dessus de l'horizontale locale) dans le repère de la Terre
  dirEF(x, y, phi, T, out) {
    const r = Math.hypot(x, y), ux = x / r, uy = y / r, c = Math.cos(phi), sn = Math.sin(phi);
    // û = ux·s + uy·e ; ê' = −uy·s + ux·e
    out.copy(this.s).multiplyScalar(ux * sn - uy * c).addScaledVector(this.e, uy * sn + ux * c);
    return out.applyAxisAngle(this.Y, this.inertial ? 0 : -this.wRot * T).normalize();
  }
  // état du plan à T : échantillon interpolé, ou orbite circulaire après la fin
  stateAt(T) {
    const S = this.sim.samples, sm = LCH.SAMPLE;
    if (T >= this.last.t) {
      if (!this.sim.ok || this.sim.hyperbolic) return Object.assign({}, this.last);   // trajectoire de libération : le vol simulé va jusqu'au bout, pas de prolongement képlérien
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
    const R = this.rocketSpec, mo = R.model, core = mo.core, bo = mo.boosters, up = mo.upper, fa = mo.fairing, NZ = mo.noz, MD = this.models || {};
    const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.1 }, o || {}));
    const cyl = (r, h, c, y, o) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), M(c, o)); m.position.y = y + h / 2; return m; };
    const cone = (r0, r1, h, c, y, o) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, 20), M(c, o)); m.position.y = y + h / 2; return m; };
    const NOZC = 0x3a3a3e, upBase = core.h, fairBase = mo.fairingBaseM != null ? mo.fairingBaseM : core.h + up.h;   // base de la coiffe : au-dessus de l'étage supérieur, ou à la hauteur donnée par le JSON si elle l'enveloppe (Centaur sous sa coiffe)
    // étage principal : cylindre + jupe + tuyère (l'origine du modèle est la base du lanceur : au décollage elle touche le sol)
    this.mEpc = new THREE.Group(); if (MD.core) this.mEpc.add(MD.core.clone()); else this.mEpc.add(cyl(core.r, core.h, core.color, 0), cyl(core.r + 0.05, 0.6, 0x555555, 0), cone(core.r * 0.48, core.r * 0.19, NZ.epc, NOZC, -NZ.epc));
    // boosters latéraux répartis autour du corps central
    this.mBoost = []; this.boostPos = [];
    if (bo) for (let k = 0; k < bo.n; k++) {
      const a = (k + 0.5) * 2 * Math.PI / bo.n, g = new THREE.Group();
      if (MD.booster) g.add(MD.booster.clone()); else {
        g.add(cyl(bo.r, bo.h, bo.color, 0), cone(bo.r * 0.73, bo.r * 0.33, NZ.eap, NOZC, -NZ.eap), cyl(bo.r * 1.01, bo.h * 0.1, bo.band, bo.h * 0.016));
        if (bo.nose) g.add(cone(bo.r, 0.1, bo.nose, bo.color, bo.h)); }
      g.position.set(bo.R * Math.cos(a), 0, bo.R * Math.sin(a)); this.mBoost.push(g); this.boostPos.push([Math.cos(a), Math.sin(a)]);
    }
    // étage supérieur (+ satellite, caché sous la coiffe tant qu'elle est là)
    this.mEsc = new THREE.Group(); if (up.kind === 'laika') { const lm = buildLaikaModule(up.h, up.r); lm.position.y = upBase; this.mEsc.add(lm); } else if (MD.upper) this.mEsc.add(MD.upper.clone()); else this.mEsc.add(cyl(up.r, up.h, up.color, upBase), cone(up.r * 0.36, up.r * 0.16, NZ.esc, NOZC, upBase - NZ.esc));
    this.payloadY = fairBase + 1.3;
    this.satG = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3, 2.4), M(0xd6b34a, { metalness: 0.5 }));
    const pan = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 2.6), M(0x1d3b9b, { emissive: 0x0b1a4a })); this.satG.add(body, pan); this.satPan = pan; this.satG.scale.setScalar(MU_M * (this.satScale || 1)); this.group.add(this.satG);
    // coiffe
    this.mFair = new THREE.Group(); { const fo = fa.opacity != null ? { transparent: true, opacity: fa.opacity, depthWrite: false } : undefined; this.mFair.add(cyl(fa.r, fa.cyl, fa.color, fairBase, fo), cone(fa.r, fa.r * 0.11, fa.cone, fa.color, fairBase + fa.cyl, fo)); }   // coiffe éventuellement translucide (vue en coupe : on voit le module dessous)
    this.parts = [this.mEpc, ...this.mBoost, this.mEsc, this.mFair];
    // flammes : cône dont la BASE est à l'origine (la pointe vers −y) pour que l'étirement de la vacillation parte de la tuyère ; rentrée de 0,3 m dans la tuyère (aucun jour visible)
    const fl = (r, h, x, z, y0) => { const geo = new THREE.ConeGeometry(r, h, 14, 1, true); geo.rotateX(Math.PI); geo.translate(0, -h / 2, 0); const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })); m.position.set(x, y0, z); const g = new THREE.Group(); g.add(m); g.userData.cone = m; return g; };
    const FC = mo.flames && mo.flames.core, FU = mo.flames && mo.flames.upper;   // position des flammes décrite par le JSON (navette : les moteurs sont sur l'orbiteur, pas au pied du réservoir)
    this.fEpc = FC ? fl(FC.radiusM, FC.lengthM, FC.xM || 0, FC.zM || 0, (FC.yM || 0) + 0.3) : fl(core.r * 0.45, 11 * core.r, 0, 0, -NZ.epc + 0.3);
    this.fBoost = bo ? this.mBoost.map(g => fl(bo.r * 0.7, 16 * bo.r, g.position.x, g.position.z, -NZ.eap + 0.3)) : [];
    if (FU) this.fEsc = fl(FU.radiusM, FU.lengthM, FU.xM || 0, FU.zM || 0, (FU.yM || 0) + 0.3); else { this.fEsc = fl(up.r * 0.34, 3.7 * up.r, 0, 0, -NZ.esc + 0.3); this.fEsc.position.y = upBase; }
    this.rocket = new THREE.Group(); this.rocket.scale.setScalar(MU_M); this.body = new THREE.Group();
    this.body.add(...this.parts, this.fEpc, ...this.fBoost, this.fEsc); this.rocket.add(this.body); this.group.add(this.rocket);
    this.rocketLen = mo.heightM || (fairBase + fa.cyl + fa.cone);   // hauteur de la fusée (la caméra se place à 1,6 fois cette longueur) ; navette : celle du réservoir
    // repères visibles de loin
    const dot = (c) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color: c, size: 8, sizeAttenuation: false })); p.frustumCulled = false; this.group.add(p); return p; };
    this.dotRocket = dot(0xffffff); this.dotSat = dot(0xffd54a); this.mk = dot;
  }
  // tour de lancement à bras de capture (Starship) : treillis en acier à ~25 m du pas de tir, deux bras à la hauteur de capture ; posée sur la photo du sol
  buildTower() {
    const g = new THREE.Group(), M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0.4 });
    const tw = new THREE.Mesh(new THREE.BoxGeometry(14, 146, 14), M(0x7b8088)); tw.position.set(0, 73, 0);
    const mount = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 8, 24), M(0x4a4d52)); mount.position.set(28, 4, 0);
    for (const sgn of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(24, 3, 4), M(0x9aa0a8)); arm.position.set(17, 70, sgn * 6); g.add(arm); }
    g.add(tw, mount);
    // repère local : +x = vers le pas de tir (à 28 m), y = vertical, z = normale au plan de la trajectoire
    const up = this.s.clone(), side = this.n.clone(), toward = this.e.clone();   // x local → −e ; z local → n
    const q = new THREE.Matrix4().makeBasis(toward.clone().negate(), up, side); g.quaternion.setFromRotationMatrix(q);
    g.position.copy(up).multiplyScalar(PATCH_R).addScaledVector(toward, 28 * MU_M);   // la tour est du côté « avant » du pas de tir
    g.scale.setScalar(MU_M); this.tower = g; this.group.add(g);
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
    const J = (this.sim.plan && this.sim.plan.jettison) || null;   // plan de vol JSON : section « jettison » (masse, forme, vitesse de séparation, désintégration de chaque objet largué) ; sinon valeurs par défaut de la fusée
    const sepDv = Object.assign({ eap: -1.5, fairing: 0.3, epcsep: -1, sat: -0.6 }, R.sepDv || {});   // m/s le long de la trajectoire (rétrofusées / ressorts)
    if (J) { if (J.boosters) sepDv.eap = J.boosters.separationSpeedMs; if (J.fairing) sepDv.fairing = J.fairing.separationSpeedMs; if (J.stage1) sepDv.epcsep = J.stage1.separationSpeedMs; if (J.payload) sepDv.sat = J.payload.separationSpeedMs; }
    const JK = { eap: 'boosters', fairing: 'fairing', epcsep: 'stage1', sat: 'payload' };
    const jm = (k, m) => { const j = J && J[JK[k]]; if (!j) return m; return Object.assign({}, m, { dry: j.dryKgEach != null ? j.dryKgEach : j.dryKg != null ? j.dryKg : m.dry, prop: j.residualPropKg != null ? j.residualPropKg : m.prop, cd: j.dragCoefficient != null ? j.dragCoefficient : m.cd, shape: Object.assign({}, m.shape, j.radiusM != null ? { r: j.radiusM } : {}, j.lengthM != null ? { h: j.lengthM } : {}) }); };
    // un débris : model = { name, dry, prop, shape } ; lat = direction d'éloignement dans le plan du lanceur (cosmétique, hors du plan simulé)
    const mkPiece = (key, model, mesh, lat, r0, tumble, tag, burns) => {
      const e = this.ev[key]; if (!e) return;
      const jt = J && J[JK[key]]; if (jt) { burns = !!jt.disintegrates; model = jm(key, model); }   // le plan décide : masse, forme, désintégration
      const r = Math.hypot(e.x, e.y), dv = sepDv[key] || 0;
      const RET = key === 'epcsep' && this.sim.plan && this.sim.plan.returns && this.sim.plan.returns.stage1;   // booster qui revient se poser (plan de retour du JSON)
      let rr = null; if (RET) { const wE = PH.WE * Math.cos(this.site.lat * DEG) * Math.sin(((this.sim.plan.site.azimuthDeg != null ? this.sim.plan.site.azimuthDeg : 90)) * DEG); rr = flyReturn(RET, { t: e.t, x: e.x, y: e.y, vx: e.vx - dv * e.y / r, vy: e.vy + dv * e.x / r, wEff: wE }); this.retResult = rr; this.extraEvents = (this.extraEvents || []).concat(rr.events.filter(q => q.key !== 'epcsep').map(q => ({ t: q.t, key: q.key, label: q.label }))); }
      const body = new Body(model, { x: e.x, y: e.y, vx: e.vx - dv * e.y / r, vy: e.vy + dv * e.x / r, t: 0 }, { wEff, mode: 'tumble' });
      const res = rr ? { samples: rr.samples, end: { reason: rr.touchdown ? 'catch' : 'time' } } : body.propagate({ tMax: 9000, sampleDt: 1, burnupAlt: burns ? (jt && jt.disintegrationAltitudeKm != null ? jt.disintegrationAltitudeKm * 1000 : key === 'epcsep' ? (e.alt > 150e3 ? 120e3 : 70e3) : 30e3) : null }), out = res.samples.map(s => [s.x, s.y]);
      const last = out[out.length - 1], z0 = this.zMain(e.t), zd = this.crossV * Math.exp(-e.t / this.crossTau), impact = this.toEF(last[0], last[1], e.t + out.length, new THREE.Vector3(), z0 + zd * out.length), /* le débris garde la vitesse transversale du lanceur à la séparation */ endText = rr ? (rr.touchdown ? (rr.touchdown.ok ? 'rattrapé par les bras de la tour' : 'se pose à côté de la tour (' + Math.round(rr.touchdown.missM) + ' m)') : 'ne se pose pas') : burns ? 'rentrée atmosphérique (désintégration)' : "impact dans l'océan";
      const g = new THREE.Group(); g.add(mesh); g.visible = false; g.scale.setScalar(MU_M); this.group.add(g);
      const d = this.mk(0xaaaaaa), dir = this.dirAtEvent(e), latWorld = new THREE.Vector3(lat[0], 0, lat[1]).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Yv, dir));
      const ret = rr ? { thr: rr.samples.map(q => q.thr), phi: rr.samples.map(q => q.phi || 0) } : null; if (ret) { const fl = new THREE.Mesh((() => { const gg = new THREE.ConeGeometry(1, 1, 14, 1, true); gg.rotateX(Math.PI); gg.translate(0, -0.5, 0); return gg; })(), new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })); fl.position.y = -(model.shape.h / 2 + 0.5); fl.visible = false; mesh.add(fl); ret.flame = fl; ret.r = model.shape.r; }
      this.pieces.push({ ret, z0, zd, key, e, path: out, mesh, g, len: Math.max(model.shape.h, model.shape.r * 2), latWorld, r0, tumble, tagKey: tag, impact, endText, dot: d, dir, model, cdA: body.cdA, ballistic: model.dry / body.cdA });
    };
    this.pieces = [];
    // les meshes de débris sont des copies centrées sur leur milieu
    const centered = (src, mid) => { const g = new THREE.Group(), c = src.clone(); c.position.set(0, c.position.y - mid, 0); g.add(c); return g; };
    const bo = mo.boosters, fa = mo.fairing, core = mo.core;
    if (bo) { const h = bo.h + (bo.nose || 0) + mo.noz.eap; this.mBoost.forEach((m, k) => mkPiece('eap', { name: nm.booster, dry: ph.eap.dry, prop: 0, shape: { type: 'cyl', r: bo.r, h } }, centered(m, (bo.h + (bo.nose || 0)) / 2), this.boostPos[k], bo.R, 0, 'eap' + (k + 1), false)); }
    const fairModel = { name: 'Coiffe (moitié)', dry: ph.fairing / 2, prop: 0, shape: { type: 'shell', r: fa.r, h: fa.cyl + fa.cone / 2 } }, fairMid = core.h + mo.upper.h + (fa.cyl + fa.cone) / 2;
    mkPiece('fairing', fairModel, centered(this.mFair, fairMid), [0, 1], fa.r * 0.6, 0.4, 'fairA', false);
    mkPiece('fairing', fairModel, centered(this.mFair, fairMid), [0, -1], fa.r * 0.6, -0.4, 'fairB', false);
    mkPiece('epcsep', { name: nm.stage1, dry: ph.epc.dry, prop: ph.epc.prop * 0.02, shape: { type: 'cyl', r: core.r, h: core.h + mo.noz.epc } }, centered(this.mEpc, core.h / 2), [0, 0], 0, 0.05, 'epc', true);
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

  // ---------- FUMÉE AU DÉCOLLAGE (demande de l'utilisateur : « une masse de fumée au décollage ») ----------
  // AU DÉCOLLAGE : le NUAGE du pas de tir + une TRAÎNÉE qui suit la fusée sur ses 1 000 premiers mètres (demande de l'utilisateur) ; le nuage, calculé en fonction du temps de vol T (on peut rejouer ou sauter dans le vol) : 130 volutes crachées pendant les 10 premières secondes, qui roulent vers l'extérieur (freinées), montent et grossissent jusqu'à ~250 m avant de s'estomper (~40 s) ;
  // Des sprites (disques flous blancs-gris, orangés au début), posés dans le repère de la Terre et dessinés APRÈS la photo du sol (renderOrder 20) : la fumée ne suit pas la fusée. Seulement pour un départ du sol (altitude < 200 m, poussée dès le début).
  buildSmoke() {
    this.smoke = null;
    const S = this.sim.samples; if (!S.length || S[0].alt > 200 || !S.some(s => s.t < 5 && s.F > 0)) return;
    let tex = null; try { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); tex = new THREE.CanvasTexture(cv); } catch (e) { tex = null; }
    const DENS = 5;   // DENSITÉ de la fumée (demande de l'utilisateur : « 5 fois plus dense ») : 1 = 130 volutes au pas de tir + 4 par seconde de traînée ; à baisser si le rendu rame (téléphone)
    let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };   // aléa fixe : la même fumée à chaque lecture
    const puffs = [], base = this.s.clone().multiplyScalar(PATCH_R), mk = (o) => { const mat = new THREE.SpriteMaterial({ map: tex, color: 0xffffff, transparent: true, depthWrite: false, opacity: 0 }), sp = new THREE.Sprite(mat); sp.visible = false; sp.frustumCulled = false; sp.renderOrder = 20; this.group.add(sp); puffs.push(Object.assign(o, { sp, mat, ph: rnd() * 2 * Math.PI })); };
    const hdir = th => this.e.clone().multiplyScalar(Math.cos(th)).addScaledVector(this.n, Math.sin(th));   // direction horizontale au sol
    for (let i = 0; i < 130 * DENS; i++) { const th = rnd() * 2 * Math.PI; mk({ kind: 'pad', b: Math.pow(rnd(), 1.4) * 10, org: base.clone().addScaledVector(hdir(th), rnd() * 30 * MU_M), dir: hdir(th), spd: 8 + rnd() * 30, up: 2 + rnd() * 9, s0: 45 + rnd() * 45, life: 32 + rnd() * 10, a0: 0.55 + rnd() * 0.25 }); }
    // traînée : 4 volutes par seconde (× DENS) à la base de la fusée tant qu'elle est sous 1 000 m d'altitude ; elle reste dans l'air (repère de la Terre) et s'estompe en ~30 s
    const low = S.filter(s => s.alt < 1000).map(s => s.t), tTrail = low.length ? low[low.length - 1] : 0, tmp = new THREE.Vector3();
    for (let t = 0.25 / DENS; t < tTrail; t += 0.25 / DENS) { const st = this.stateAt(t), th = rnd() * 2 * Math.PI; this.toEF(st.x, st.y, t, tmp); mk({ kind: 'trail', b: t, org: tmp.clone(), dir: hdir(th), spd: 3 + rnd() * 15, up: 0.5 + rnd() * 2, s0: 66 + rnd() * 42, life: 26 + rnd() * 10, a0: 0.45 + rnd() * 0.2 }); }
    this.smoke = { puffs, tex, tEnd: Math.max(...puffs.map(p => p.b + p.life)) + 1, off: false, tmp: new THREE.Vector3() };
  }
  updateSmoke(T) {
    const K = this.smoke; if (T > K.tEnd) { if (!K.off) { K.off = true; for (const p of K.puffs) p.sp.visible = false; } return; } K.off = false;
    for (const p of K.puffs) {
      const age = T - p.b; if (age < 0 || age > p.life) { p.sp.visible = false; continue; }
      const pad = p.kind === 'pad', tau = pad ? 6 : 8, d = p.spd * tau * (1 - Math.exp(-age / tau)), h = (pad ? 6 : 2) + p.up * (pad ? 14 : 10) * (1 - Math.exp(-age / (pad ? 14 : 10))), size0 = p.s0 + (pad ? 6 : 10.5) * age;   // roule vers l'extérieur (freinée) en dérivant au vent, monte, grossit
      const fout = Math.max(0, Math.min(1, (p.life - age) / (p.life * 0.55))), dis = 1 - fout;   // dis : 0 → 1 pendant la désintégration (derniers 55 % de la vie)
      // DÉSINTÉGRATION : la volute se disperse en vacillant (déplacements de plus en plus grands), rétrécit et s'éteint par à-coups
      const wob = dis * dis * 70 * MU_M, size = size0 * (1 - 0.4 * dis);
      p.sp.position.copy(p.org).addScaledVector(p.dir, d * MU_M + Math.sin(age * 1.7 + p.ph) * wob).addScaledVector(this.s, h * MU_M + Math.cos(age * 1.3 + p.ph) * wob * 0.6); p.sp.scale.setScalar(size * MU_M);
      const fin = Math.min(1, age / 0.6), warm = Math.max(0, 1 - age / 5), flick = 1 - dis * 0.45 * (1 + Math.sin(age * 11 + p.ph * 3)) / 2;   // apparition rapide ; orangée juste après l'allumage ; scintillement croissant en fin de vie
      p.mat.opacity = p.a0 * fin * fout * fout * flick; p.mat.color.setRGB(0.86 + 0.14 * warm, 0.84 + 0.02 * warm, 0.82 - 0.22 * warm); p.sp.visible = true;
    }
  }
  // ---------- mise à jour ----------
  // options d'un composant (id d'étiquette : fusée, satellite, boosters, coiffe, étage) : trajectoire, vitesse, poids, hauteur
  elOpt(id) { const e = this.opt.el; if (!e[id]) e[id] = { traj: true, speed: false, mass: false, alt: id === 'rocket' }; return e[id]; }   // options de chaque composant (panneau « Composants », un seul bouton ℹ pour les trois) : trajectoire (allumée par défaut), vitesse, poids (éteints par défaut) ; la fusée montre aussi sa hauteur
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
    this.center.copy(this.pos).addScaledVector(this.dir, this.rocketLen / 2 * MU_M * this.vk);
    { const a = this.hLine.geometry.attributes.position, u = this.radial || this.s; a.setXYZ(0, this.pos.x, this.pos.y, this.pos.z); a.setXYZ(1, u.x, u.y, u.z); a.needsUpdate = true; }   // trait vertical sous la fusée
    // orientation de la fusée : y local = poussée
    this.rocket.scale.setScalar(MU_M * this.vk); this.rocket.position.copy(this.pos); this.rocket.quaternion.setFromUnitVectors(this.Y, this.dir);
    const E = this.ev, past = k => E[k] && T >= E[k].t;
    const coreGone = this.direct && past('sat');   // insertion directe : après la séparation, le bloc central est un débris à part
    this.mBoost.forEach(m => m.visible = !past('eap')); this.mFair.visible = !past('fairing'); this.mEpc.visible = !past('epcsep') && !coreGone;
    this.fBoost.forEach(f => f.visible = !!st.eap && !past('eap')); this.fEpc.visible = !!st.epc; this.fEsc.visible = !!st.esc;
    const fk = 0.85 + 0.3 * Math.random(); for (const f of [...this.fBoost, this.fEpc, this.fEsc]) if (f.visible) f.userData.cone.scale.set(1, fk, 1);
    const rt = this.elOpt('rocket').traj; this.plan.visible = this.opt.plan && rt; this.trail.visible = this.opt.trail && rt; this.markPts.visible = this.markDrops.visible = this.opt.markers && rt; this.ring.visible = !!this.sim.ok && this.opt.plan && this.elOpt('sat').traj; this.ring.rotation.y = this.inertial ? 0 : -this.wRot * T; this.ring.children.forEach(c => { c.material.transparent = true; c.material.opacity = past('esc2end') ? 0.95 : 0.35; });   // orbite visée : pâle d'avance, vive une fois atteinte
    // sillage
    const tp = this.trailPos; let n = Math.min(this.trailN, st.idx + 1);
    if (T > this.trailT0 && st.idx >= this.trailN - 1) {   // sillage du vol képlérien : un point tous les TRAIL_COAST_DT s (sinon un trait droit relie la fin des échantillons à la position actuelle)
      const want = Math.min(TRAIL_COAST_MAX, Math.floor((T - this.trailT0) / TRAIL_COAST_DT)); if (this.coastN > want) this.coastN = want;
      for (; this.coastN < want; this.coastN++) { const tt = this.trailT0 + (this.coastN + 1) * TRAIL_COAST_DT, q = this.stateAt(tt), v = q.ef || this.toEF(q.x, q.y, tt, new THREE.Vector3()); tp.set([v.x, v.y, v.z], 3 * (this.trailN + this.coastN)); }
      n = this.trailN + this.coastN;
    } else this.coastN = 0;
    tp.set([this.pos.x, this.pos.y, this.pos.z], 3 * n);
    this.trail.geometry.setDrawRange(0, n + 1); this.trail.geometry.attributes.position.needsUpdate = true;
    if (this.fut) {   // trajectoire à l'avance : recalculée chaque seconde de vol, le départ colle à l'objet à chaque image
      const f = this.fut, tp = this._ft || (this._ft = new THREE.Vector3());
      if (T < f.built || T - f.built >= 1) { f.built = T; for (let k = 1; k <= f.N; k++) { const t2 = T + f.period * k / f.N, q = this.stateAt(t2); this.toEF(q.x, q.y, t2, tp); f.pos.set([tp.x, tp.y, tp.z], 3 * k); } }
      f.pos.set([this.pos.x, this.pos.y, this.pos.z], 0); f.g.attributes.position.needsUpdate = true; f.line.visible = !!this.opt.plan && this.elOpt('rocket').traj;
    }
    if (this.smoke) this.updateSmoke(T);
    // satellite largué : s'éloigne doucement vers le haut
    // satellite : sous la coiffe (au sommet de l'étage supérieur) jusqu'au largage, puis il s'éloigne doucement vers le haut
    const tSat = E.sat ? E.sat.t : 1e12, sat = this.satG, dm = MU_M * this.vk; sat.scale.setScalar(dm * (this.satScale || 1));
    sat.position.copy(this.pos).addScaledVector(this.dir, this.payloadY * dm); sat.quaternion.copy(this.rocket.quaternion);
    if (T >= tSat) sat.position.addScaledVector(this.radial, (0.3 * Math.min(T - tSat, 3000) + 6) * dm);
    sat.visible = past('fairing') && (!!this.sim.ok || T < tSat);   // caché sous la coiffe (ses panneaux dépasseraient de la fusée)
    this.satPan.scale.x = 0.25 + 0.75 * Math.max(0, Math.min(1, (T - tSat) / 20));   // panneaux repliés jusqu'au largage, puis déployés en 20 s
    // débris
    const camP = camera ? camera.position : null;
    const px = (len, p) => camP ? (len / 1000 / Math.max(1e-9, camP.distanceTo(p) * R_KM)) / (2 * Math.tan(25 * DEG)) * innerHeightSafe() : 100;
    const tmpP = new THREE.Vector3(), side = this.n.clone().applyAxisAngle(this.Y, this.inertial ? 0 : -this.wRot * T);
    for (const t of this.tagList) if (t.piece) { t.on = false; t.text = t.base; t.speed = null; t.alt = null; t.mass = null; }
    for (const p of this.pieces) {
      const tau = T - p.e.t; p.g.visible = tau >= 0 && tau < p.path.length;
      if (!p.g.visible) {
        this.pieceExtras(p, null, false);
        p.dot.visible = false;
        if (tau >= p.path.length && tau < p.path.length + 240 && p.tagKey) { const t = this.tagMap[p.tagKey]; t.on = true; t.mass = (p.model.dry || 0) + (p.model.prop || 0); t.pos.copy(p.impact); t.text = t.base + ' — ' + p.endText; p.dot.visible = true; p.dot.geometry.attributes.position.setXYZ(0, p.impact.x, p.impact.y, p.impact.z); p.dot.geometry.attributes.position.needsUpdate = true; }
        continue;
      }
      const ix = Math.min(p.path.length - 1, Math.floor(tau)), A = p.path[ix], B = p.path[Math.min(p.path.length - 1, ix + 1)], f = tau - Math.floor(tau);
      this.toEF(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, T, tmpP, p.z0 + p.zd * (T - p.e.t));
      tmpP.addScaledVector(p.latWorld, (p.r0 + 2.5 * Math.min(tau, 300)) * MU_M * this.vk); p.g.scale.setScalar(MU_M * this.vk);   // les paires s'écartent
      if (p.tagKey) { const t = this.tagMap[p.tagKey]; t.on = true; t.mass = (p.model.dry || 0) + (p.model.prop || 0); t.pos.copy(tmpP); t.speed = Math.hypot(B[0] - A[0], B[1] - A[1]); t.alt = (tmpP.length() - 1) * R_KM * 1000; }   // vitesse (inertielle) = déplacement par seconde de la trajectoire calculée
      p.g.position.copy(tmpP);
      if (p.ret) {   // booster qui revient : nez dans le sens de la poussée quand les moteurs tournent, sinon moteurs vers l'avant (nez à l'opposé de la vitesse) ; flamme proportionnelle à la poussée
        const R_ = p.ret, ii = Math.min(R_.thr.length - 1, ix), th = R_.thr[ii], dirv = this._rdir || (this._rdir = new THREE.Vector3()), qt = this._rq || (this._rq = new THREE.Quaternion());
        if (th > 0.001) this.dirEF(A[0], A[1], R_.phi[ii], T, dirv); else { this.dirEF(A[0], A[1], Math.atan2((B[0] - A[0]) * A[0] / Math.hypot(A[0], A[1]) + (B[1] - A[1]) * A[1] / Math.hypot(A[0], A[1]), (B[1] - A[1]) * A[0] / Math.hypot(A[0], A[1]) - (B[0] - A[0]) * A[1] / Math.hypot(A[0], A[1])), T, dirv); dirv.negate(); }
        qt.setFromUnitVectors(this.Y, dirv); if (!p.qInit) { p.g.quaternion.copy(qt); p.qInit = true; } else p.g.quaternion.slerp(qt, 0.12);
        R_.flame.visible = th > 0.001; if (R_.flame.visible) { const k = Math.sqrt(th / 0.4); R_.flame.scale.set(R_.r * (0.5 + 0.7 * k), 6 + 40 * k * (0.9 + 0.2 * Math.random()), R_.r * (0.5 + 0.7 * k)); }
      } else { p.g.quaternion.setFromUnitVectors(this.Y, p.dir); if (p.tumble) p.g.rotateOnAxis(new THREE.Vector3(1, 0, 0), p.tumble * tau); }
      this.pieceExtras(p, tmpP, true);
      const big = px(p.len * this.vk, tmpP) >= 6; p.mesh.visible = big;
      p.dot.visible = !big; p.dot.geometry.attributes.position.setXYZ(0, tmpP.x, tmpP.y, tmpP.z); p.dot.geometry.attributes.position.needsUpdate = true;
    }
    { const r = this.tagMap.rocket; r.speed = this.st.v; r.mass = this.st.m; this.tagMap.sat.mass = this.satMassKg; this.tagMap.sat.speed = this.st.v; r.alt = this.altM; this.tagMap.sat.alt = this.altM; r.on = !coreGone; r.pos.copy(this.center); r.text = this.direct ? this.rocketSpec.name + '' : past('epcsep') ? this.rocketSpec.names.stage2 + (past('sat') || !this.ev.sat ? '' : ' + satellite') : this.rocketSpec.name + ''; const sa = this.tagMap.sat; sa.on = past('sat') && !!this.sim.ok; sa.pos.copy(this.satG.position); }
    const big = px(this.rocketLen * this.vk, this.pos) >= 6; this.rocket.visible = big && !coreGone;
    this.dotRocket.visible = !big && !coreGone; this.dotRocket.geometry.attributes.position.setXYZ(0, this.pos.x, this.pos.y, this.pos.z); this.dotRocket.geometry.attributes.position.needsUpdate = true;
    this.dotSat.visible = false;
    if (this.tagMap.pad) this.tagMap.pad.pos.copy(this.padPos);   // le pas de tir : point fixe au sol (30 m au-dessus : vue sur le pied de la fusée)
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
    // vue de dessus (bouton) : caméra au-dessus du PLAN de la trajectoire (côté d'où l'on voit tourner la fusée dans le sens direct), la direction du vol en haut de l'écran
    this.topUp = this.e.clone().applyAxisAngle(this.Y, this.inertial ? 0 : -this.wRot * T);
    if (this.topView) { this.camDir.copy(nrm).normalize(); this.camDistKm = Math.max(1200, 1500 + 1.6 * Math.max(0, this.altM / 1000)); }
  }

  tel() {
    const s = this.st || this.stateAt(this.T), T = this.T;
    return { eff: this.effSpeed, T, alt: s.alt / 1000, v: s.v / 1000, acc: s.acc, q: s.q / 1000, m: s.m / 1000, F: s.F / 1e6, phase: s.phase };
  }
  dispose() { this.group.parent && this.group.parent.remove(this.group); this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
}
export function innerHeightSafe() { return typeof innerHeight === 'number' ? innerHeight : 900; }
export const fmtT = t => { const s = Math.floor(Math.abs(t)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return 'T+' + (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0'); };

// ---------- panneau ----------
export function launchOptDefault() { return { plan: true, markers: true, trail: true, names: true, el: {} }; }
