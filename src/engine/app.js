// Point d'entrée du moteur 3D : JavaScript pur, AUCUNE dépendance à React. L'application lui donne un canvas, un conteneur d'étiquettes et deux canaux :
//   publish(patch)  : le moteur y envoie l'état à afficher (texte d'information, vue, temps, échelle…) — l'interface le range dans son store ;
//   les commandes renvoyées par createEngine() : l'interface pilote le moteur (changer de vue, régler le temps, aller à l'ISS…).
// Le rendu est injectable (createRenderer) pour tester sans WebGL.
import * as THREE from 'three';
import { BODY } from './bodies.js';
import { ISS_FEATURES, ISS_EPOCH, ISS_FROM, ISS_MODEL, ISS_MODEL_CFG, ISS_W, issState } from './iss.js';
import { createClouds } from './clouds.js';
import { createCapitals } from './capitals.js';
import { createConstellations } from './constellations.js';
import { createStars } from './stars.js';
import { createSunGlare } from './sun-glare.js';
import { occludedBy } from './occlusion.js';
import { createTerrainLayer } from './terrain-layer.js';
import { TERRAIN_DAY_GAIN, TERRAIN_GLOW } from './terrain-tiles.js';
import { DEG, buildBorders, R_KM, buildEarth, earthGeometry, ll } from './earth.js';
import { loadGlb } from './gltf-mini.js';
import { FLIGHT_OBJECTS, FLIGHT_OBJECT_FILES } from './data/objects.js';
import { AU_U, ECLIPTIC_POLE, astroD, buildMoonMesh, gmstOf, moonQuat, rotationPole, rotationQuat } from './moon.js';
import { EARTH_MAX_DIST, attachControls } from './controls.js';
import { assetUrl, setBaseUrl } from './config.js';
import { KM_AL, KM_UA, fmtBig } from './format.js';
import { createOverlay } from './overlay.js';
import { parseObj } from './obj-mini.js';

export const ISS_MIN_DIST_KM = 0.0001;   // zoom minimal autour de l'ISS : 10 cm (c'était 100 m)
const SUN_INTENSITY = 3.6, NIGHT_AMBIENT = 0.012;   // jour / nuit : éclairage PHYSIQUE de three.js (la BRDF de Lambert divise par π) : un Soleil d'intensité 1 ne donnait que 32 % de la couleur au zénith, donc « la nuit » partout, même sur la face éclairée ; ≈ π × 1,15 au zénith, ambiance 0,012 (≈ 0,4 % la nuit : on ne voit presque rien ; c'était 0,25 puis 0,06)
const VIEW_ISS = { yaw: -28.8, pitch: 24.9, dist: 0.393 };   // accès DIRECT à l'ISS, sans transition : vue réglée par l'utilisateur, un peu de derrière et au-dessus, à 393 m (yaw °, pitch °, distance km)
const Y_AXIS = new THREE.Vector3(0, 1, 0), KMU = 1 / (R_KM * 1000);
const defaultRenderer = canvas => new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
const isHttp = () => typeof location !== 'undefined' && /^https?:/.test(location.protocol);


export function createEngine({ canvas, overlay: overlayHost, publish, baseUrl = '', createRenderer = defaultRenderer }) {
  setBaseUrl(baseUrl);
  let renderer;
  try { renderer = createRenderer(canvas); } catch (e) { publish({ status: 'error', error: 'WebGL indisponible dans ce navigateur.' }); return null; }
  const maxRatio = Math.min((typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1, 2); let ratio = maxRatio;
  renderer.setPixelRatio(ratio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const overlay = createOverlay(overlayHost), disposers = [];

  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1, 0.001, 1e7);
  const world = new THREE.Group(); scene.add(world);
  const inertial = new THREE.Group(); scene.add(inertial);
  const earth = buildEarth(renderer); world.add(earth);

  const terrain = createTerrainLayer(earth, renderer); let terrainShown = false;   // Terre en RELIEF avec imagerie satellite sous 800 km d'altitude (automatique, hors ligne : la carte dessinée reste)
  const borders = buildBorders(); earth.add(borders); let bordersOn = false;   // option « Limites de pays »
  const clouds = createClouds(earth, renderer); let cloudsOn = false;   // couverture nuageuse quasi temps réel (option)
  // NIVEAUX DE DÉTAIL selon la taille à l'écran (en pixels de rayon) : la Terre (1 048 576 triangles !) et les ~35 sphères d'astres (9 000 triangles chacune) n'étaient pas allégées quand elles ne font que quelques pixels.
  // Les géométries sont partagées (un cache par nombre de segments) ; une hystérésis (±15 %) évite de changer de niveau à chaque image.
  const LOCAL_N = 256, lodCache = {}, sphereLod = nx => lodCache[nx] || (lodCache[nx] = earthGeometry(nx, nx / 2));
  const lodLevel = (px, cur, T) => { for (let i = 0; i < T.length; i++) if (px > T[i] * (cur <= i ? 0.85 : 1.15)) return i; return T.length; };
  const EARTH_LOD = { T: [400, 100, 20, 5], seg: [0, 512, 128, 48, 24] }, BODY_LOD = { T: [150, 40, 8], seg: [0, 48, 24, 12] };   // seg 0 = géométrie d'origine (la plus fine)
  const earthAxis = (() => { const g = new THREE.Group(); g.visible = false; return g; })();   // rempli après la création de axisMarker (voir plus bas)
  const earthGlobe = earth.children[0], earthGeoHi = earthGlobe.geometry; let earthLevel = 0, pxScale = 400;

  // ASTRES (objects/<astre>/<astre>.json, bodies.js) : chacun est dessiné d'après son JSON (aspect, trace d'orbite, point lointain, étiquette). La Terre est l'origine de la scène (son maillage est `earth`).
  // Le groupe `solar` est tourné de −GMST dans les vues « Terre fixe » et pas tourné dans les vues d'astre. Créé peu après le démarrage (texture de la Lune ~0,3 s).
  const solar = new THREE.Group(); scene.add(solar);
  let metric = false, solarTarget = 'earth', solarBuilt = false;
  const STAR = (BODY.list().find(b => b.bodyType === 'star') || { id: 'sun' }).id;
  const bodyObjs = {}, bpos = {}, babs = {};   // bodyObjs[id] : objets 3D de l'astre ; bpos / babs : position géocentrique (inertielle / dans le repère tourné de `solar`), recalculées à chaque image
  for (const b of BODY.list()) { bpos[b.id] = new THREE.Vector3(); babs[b.id] = new THREE.Vector3(); }
  // points lointains sans test de profondeur : sinon le point de la Terre, posé au centre de sa sphère (même minuscule), disparaissait derrière elle par intermittence
  const dotOf = color => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 7, sizeAttenuation: false, depthWrite: false, depthTest: false })); p.frustumCulled = false; solar.add(p); return p; };
  const PAINTERS = { moon: r => buildMoonMesh(r) };   // sphères peintes (appearance.kind = "painted", appearance.painter)
  const mkTrail = (n, op) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: op })); l.frustumCulled = false; return l; };
  // anneaux : disque plat percé, texture radiale 1D (bandes d'opacité : lacunes, anneaux denses) ; rg = { innerKm, outerKm, color, opacity, bands: [[de, à, opacité] (0 = bord intérieur, 1 = bord extérieur)] }
  const ringMesh = (rg, radiusKm) => {
    const inner = rg.innerKm / radiusKm, outer = rg.outerKm / radiusKm, geo = new THREE.RingGeometry(inner, outer, 160, 1), uv = geo.attributes.uv, pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (Math.hypot(pos.getX(i), pos.getY(i)) - inner) / (outer - inner), 0.5);
    const c = document.createElement('canvas'); c.width = 512; c.height = 4; const g = c.getContext('2d'); g.clearRect(0, 0, 512, 4);
    for (const [f, t, al] of rg.bands || [[0, 1, 1]]) { g.fillStyle = `rgba(255,255,255,${al})`; g.fillRect(f * 512, 0, Math.max(1, (t - f) * 512), 4); }
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color: new THREE.Color(rg.color || '#d8c9a0'), transparent: true, opacity: rg.opacity != null ? rg.opacity : 0.85, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; return m;   // RingGeometry est dans le plan XY (normale +Z) : on la couche dans le plan équatorial (normale +y, le pôle du maillage)
  };
  // TRACE LOCALE : l'orbite complète est stockée en flottants 32 bits (≈ 7 chiffres) : à 3 UA du Soleil (70 000 unités de scène) un sommet est faux de plusieurs centièmes d'unité, soit plus que le noyau d'une comète (0,0003 unité),
  // et Pluton (940 000 unités) manquait sa trace de la moitié de son rayon. Près de l'astre, la trace est donc recalculée à chaque image en DOUBLE précision AUTOUR de lui : sommets = déplacement relatif à son corps central depuis sa position actuelle
  // (petits nombres, exacts), ligne posée sur l'astre → elle passe pile par son centre. Étendue : de part et d'autre, 6 fois la distance de la caméra (au moins 40 rayons), au plus une demi-période.
  const updateLocalOrbit = (o, id, b, Dd, dCam, ru, v) => {
    const r0 = BODY.rel(id, Dd), h = 0.01, r1 = BODY.rel(id, Dd + h), speed = Math.hypot(r1[0] - r0[0], r1[1] - r0[1], r1[2] - r0[2]) * KMU / h;   // unités par jour
    const half = (b.motion.periodDays || 365.25) / 2, T = Math.min(half, Math.max(40 * ru, 6 * dCam) / Math.max(speed, 1e-12)), at = o.localLine.geometry.attributes.position;
    for (let k = -LOCAL_N; k <= LOCAL_N; k++) { const r = k === 0 ? r0 : BODY.rel(id, Dd + T * k / LOCAL_N), i = k + LOCAL_N; at.setXYZ(i, (r[0] - r0[0]) * KMU, (r[1] - r0[1]) * KMU, (r[2] - r0[2]) * KMU); }
    at.needsUpdate = true; o.localLine.position.copy(v);
  };
  // pôle nord d'un astre en axes inertiels de la scène : sa rotation (IAU), sinon (lune en rotation synchrone) celui de sa planète, sinon l'axe de la Lune (pôle de l'écliptique) ; null si inconnu
  const poleOf = b => { if (b.sceneOrigin) return new THREE.Vector3(0, 1, 0); if (b.rotation) return rotationPole(b.rotation); if (b.orientation === 'tidal-lock') { const pb = b.around && BODY.get(b.around); return pb && pb.rotation ? rotationPole(pb.rotation) : ECLIPTIC_POLE.clone(); } return null; };
  let nTex = null;
  const axisMarker = () => {   // dans le repère du maillage (rayon 1, y = nord) : équateur en pointillé, tige rouge et lettre « N » au-dessus du pôle nord
    const g = new THREE.Group(), pts = []; for (let i = 0; i < 160; i++) { const t = i / 160 * 2 * Math.PI; pts.push(new THREE.Vector3(1.003 * Math.cos(t), 0, 1.003 * Math.sin(t))); }
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.05, gapSize: 0.04, transparent: true, opacity: 0.75 })); ring.computeLineDistances(); ring.frustumCulled = false; g.add(ring);
    const spike = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1.55, 0)]), new THREE.LineBasicMaterial({ color: 0xff5a3c })); spike.frustumCulled = false; g.add(spike);
    if (!nTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#ff5a3c'; x.font = 'bold 52px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('N', 32, 36); nTex = new THREE.CanvasTexture(c); }
    const n = new THREE.Sprite(new THREE.SpriteMaterial({ map: nTex, depthTest: false, transparent: true })); n.position.set(0, 1.78, 0); n.scale.setScalar(0.4); g.add(n);
    g.visible = false; return g;
  };
  { const m = axisMarker(); earthAxis.add(...m.children); earth.add(earthAxis); }
  const buildSolar = () => {
    const D0 = astroD(new Date());
    for (const b of BODY.list()) {
      const ap = b.appearance || {}, ru = BODY.radiusUnits(b.id), o = bodyObjs[b.id] = { b, id: b.id, screen: null, loopD: -1e9 };
      if (ap.kind === 'painted') o.mesh = PAINTERS[ap.painter](renderer);   // (le maillage de la Lune est déjà à son rayon)
      else if (ap.kind === 'star') {
        o.mesh = new THREE.Mesh(new THREE.SphereGeometry(ru, 64, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(ap.color || '#ffffff') }));
        const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,230,160,0.9)'); gr.addColorStop(0.25, 'rgba(255,190,90,0.35)'); gr.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.scale.setScalar(ru * (ap.glowRadii || 7)); o.mesh.add(sp);
      } else if (ap.kind === 'textured') {   // sphère habillée d'une carte équirectangulaire (longitudes −180…180 de gauche à droite) rangée dans le dossier de l'objet ; couleur unie tant qu'on est loin : la carte n'est téléchargée qu'à l'approche (voir la boucle)
        o.mesh = new THREE.Mesh(earthGeometry(96, 48), new THREE.MeshStandardMaterial({ color: new THREE.Color(ap.color || '#cccccc'), roughness: 1, metalness: 0 })); o.mesh.scale.setScalar(ru);
        o.texUrl = assetUrl((FLIGHT_OBJECT_FILES[b.id] || '').replace(/[^/]*$/, '') + ap.texture);
      } else if (ap.kind === 'mesh') {   // noyau décrit par un modèle 3D (OBJ) rangé dans le dossier de l'objet : sphère de même rayon tant qu'on est loin, modèle téléchargé à l'approche (voir la boucle)
        o.mesh = new THREE.Mesh(new THREE.SphereGeometry(ru, 24, 12), new THREE.MeshStandardMaterial({ color: new THREE.Color(ap.color || '#8a8178'), roughness: 1, metalness: 0 }));
        o.meshUrl = assetUrl((FLIGHT_OBJECT_FILES[b.id] || '').replace(/[^/]*$/, '') + ap.model);
      } else if (ap.kind === 'sphere' || ap.kind === 'comet') o.mesh = new THREE.Mesh(new THREE.SphereGeometry(ru, 48, 24), new THREE.MeshStandardMaterial({ color: new THREE.Color(ap.color || '#cccccc'), roughness: 1, metalness: 0 }));
      if (o.mesh && (ap.kind === 'textured' || ap.kind === 'painted')) { o.lodHi = o.mesh.geometry; o.lod = 0; }   // sphères à niveaux de détail
      if (o.mesh && poleOf(b)) { o.axisG = axisMarker(); solar.add(o.axisG); }   // repère nord / équateur (visible près de l'astre)
      if (o.mesh && ap.rings) o.mesh.add(ringMesh(ap.rings, b.radiusKm));   // anneaux : dans le plan équatorial de la planète (enfant du maillage : suit son orientation)
      if (o.mesh) solar.add(o.mesh);
      if (ap.tail) { const tg = new THREE.ConeGeometry(1, 1, 24, 1, true); tg.translate(0, 0.5, 0); o.tail = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: new THREE.Color(ap.tail.color || '#bfe3ff'), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); o.tail.frustumCulled = false; solar.add(o.tail); }
      if (b.dot) o.dot = dotOf(new THREE.Color(b.dot.color || '#ffffff'));
      if (b.label) o.label = overlay.label(b.label.text);
      const tr = b.trace;
      if (tr && tr.fullOrbit && b.around) {   // orbite complète autour du corps central (la Terre autour du Soleil : l'ellipse réelle sur un an) ; le groupe est posé sur le corps central à chaque image
        o.orbitG = new THREE.Group(); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(BODY.orbitPoints(b.id, D0, BODY.orbitSamples(b.id)).map(p => new THREE.Vector3(p[0] * KMU, p[1] * KMU, p[2] * KMU))), new THREE.LineBasicMaterial({ color: new THREE.Color(tr.color || '#4a90e2'), transparent: true, opacity: 0.9 })); l.frustumCulled = false; o.orbitG.add(l); solar.add(o.orbitG);
        o.localLine = new THREE.Line(new THREE.BufferGeometry(), l.material.clone()); o.localLine.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((2 * LOCAL_N + 1) * 3), 3)); o.localLine.frustumCulled = false; o.localLine.visible = false; solar.add(o.localLine);   // trace LOCALE : voir updateLocalOrbit
      }
      if (tr && tr.pastDays) { o.loop = new THREE.Group(); solar.add(o.loop); o.past = mkTrail(121, 1); o.fut = mkTrail(61, 0.45); o.loop.add(o.past, o.fut); }   // trace : le passé (un tour complet, s'estompe vers le début) et l'avenir (pâle)
    }
    solarBuilt = true;
  };
  const solarTimer = setTimeout(buildSolar, 400);

  // VRAI ciel étoilé (≈ 5 000 étoiles, vraies positions / couleurs / éclats : stars.js), sphère de rayon 1 replacée sur la caméra et grossie à chaque image, tournée avec le temps sidéral
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3(), tmp4 = new THREE.Vector3(), fpM = new THREE.Matrix4();
  const stars = createStars(scene);
  const sunGlare = createSunGlare(scene);   // l'éclat du Soleil (cœur, halo bleuté, aigrettes) quand il est dans le champ et pas caché par la Terre
  const constellations = createConstellations(stars, overlay); let constellationsOn = false;   // option « Constellations » : traits entre les étoiles + noms
  const amb = new THREE.AmbientLight(0xffffff, 0.55), sun = new THREE.DirectionalLight(0xffffff, 1.0);
  const sunPoint = new THREE.PointLight(0xffffff, SUN_INTENSITY, 0, 0); sunPoint.visible = false; scene.add(amb, sun, sun.target, sunPoint);   // sunPoint : le VRAI Soleil (option jour / nuit)
  let dayNight = false;

  // ISS : modèle (taille réelle) + repère ; modèle détaillé NASA (~14 Mo) chargé quand on s'approche, remplace le repère jaune
  const issModel = new THREE.Group(); world.add(issModel);
  const issHi = new THREE.Group(); issModel.add(issHi);
  let hiState = 'idle';
  const loadHi = () => {
    hiState = 'loading';
    loadGlb(ISS_MODEL).then(root => {
      const c = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3()); root.position.sub(c);
      // le modèle se décrit dans iss.json : `scale` (mètres par unité du fichier : 0,0254 = pouces) et `transform` (matrice 3 × 3 par lignes : repère du fichier → scène, x = vol, y = haut, z = poutre) ; défaut : mètres, (X, Y, Z) → (−Z, Y, X)
      const mo = ISS_MODEL_CFG, k = mo.scale || 1, m3 = mo.transform || [0, 0, -1, 0, 1, 0, 1, 0, 0];
      const w = new THREE.Group(); w.matrixAutoUpdate = false; w.matrix.set(m3[0] * k, m3[1] * k, m3[2] * k, 0, m3[3] * k, m3[4] * k, m3[5] * k, 0, m3[6] * k, m3[7] * k, m3[8] * k, 0, 0, 0, 0, 1);
      w.add(root); issHi.add(w); hiState = 'ready';
    }).catch(e => { hiState = 'error'; console.warn('Modèle ISS détaillé indisponible :', e.message); });
  };
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
  const dot = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffd54a, size: 10, sizeAttenuation: false })); dot.frustumCulled = false; world.add(dot);
  const issLabel = overlay.label('ISS', 'iss');
  const capitals = createCapitals(overlay, earth); let capitalsOn = false, lastOcc = [];   // option « Capitales »

  const cam = { fov: 50, mode: 'earth', tgt: new THREE.Vector3(), lon: 0, lat: 50, dist: 3.4, fly: 0, tfly: 0, userDir: false, fp: null, fpUp: new THREE.Vector3(), upKind: 'north', goal: { lon: 0, lat: 50, dist: 3.4 } };   // départ : la Terre vue du nord (nord en haut), le méridien de Greenwich (0°) en face de la caméra
  const moonsShown = {};   // planète → distance de la caméra, pour les planètes dont les lunes sont affichées
  let poseStale = false;   // juste après un changement de vue la caméra garde l'ancienne position jusqu'à la prochaine image : on n'en déduit pas « trop loin de l'ISS »
  let iss = null, frameF = 0, curGm = 0, curD = 0;

  const syncView = m => publish({ view: { mode: m, selected: m === 'iss' ? null : m === 'solar' ? solarTarget : 'earth', align: cam.upKind } });   // en vue ISS (satellite) aucun astre n'est choisi
  const snapCam = () => { cam.lon = cam.goal.lon; cam.lat = cam.goal.lat; cam.dist = cam.goal.dist; cam.fly = cam.tfly = 0; };   // la caméra prend la pose voulue d'un coup
  const setMode = m => {
    if (issView && m !== 'iss') { issView = false; cam.fp = null; publish({ issView: false }); }   // changer de vue coupe la vue depuis l'ISS
  
    if ((m === 'solar') !== (cam.mode === 'solar')) {   // changement de repère (Terre fixe ↔ inertiel) : on tourne la pose de la caméra de l'angle sidéral pour que l'image ne saute pas
      const ang = m === 'solar' ? curGm : -curGm; cam.tgt.applyAxisAngle(Y_AXIS, ang); camera.position.applyAxisAngle(Y_AXIS, ang); cam.lon += ang / DEG; cam.goal.lon += ang / DEG; frameF = m === 'solar' ? 1 : 0;
    }
    cam.mode = m; cam.fly = cam.tfly = 0; cam.userUp = null; cam.upKind = null; poseStale = true;   // changement de vue DIRECT : plus aucune transition
    syncView(m);
    if (m === 'iss' && iss) applyLocal(VIEW_ISS.yaw, VIEW_ISS.pitch, VIEW_ISS.dist, true);
    else if (m === 'earth') { if (iss) { cam.goal.lat = iss.lat * 0.7; cam.goal.lon = iss.lon; } cam.goal.dist = 3.4; snapCam(); }
  };
  const goEarth = () => { setMode('earth'); alignNorth('earth'); };   // la Terre aussi : nord en haut
  const selectView = id => { const b = BODY.get(id); if (b && b.menu.mode === 'earth') goEarth(); else goSolar(id); };   // menu et clics sur la scène : la Terre ramène à la vue Terre, les autres astres à leur vue
  const goSolar = target => {   // vues Soleil / Lune : repère inertiel, cible = astre ; distance de la vue : son JSON
    solarTarget = target; setMode('solar'); cam.goal.dist = BODY.get(target).menu.view.distanceUnits; cam.minDist = Math.max(1e-4, 1.3 * BODY.radiusUnits(target));   // zoom minimal : 1,3 rayon de l'astre regardé (une petite lune se regarde de près)
    const d = ECLIPTIC_POLE.clone().add(tmp.set(0.35, 0, 0.1)).normalize(); cam.goal.lat = Math.asin(d.y) / DEG; cam.goal.lon = Math.atan2(-d.z, d.x) / DEG; snapCam();
    alignNorth(target);   // choisir un astre : sa vue est « nord en haut » d'office (bouton « Nord en haut » de sa fiche activé)
  };
  cam.onEarth = () => goEarth();
  syncView('earth');

  // repère local de l'ISS : f = sens du vol (à l'horizontale), u = zénith, s = côté ; yaw 0 = derrière elle, pitch = hauteur de la caméra au-dessus de l'horizontale
  const frameIss = () => { const u = iss.up, f = iss.vel.clone().addScaledVector(u, -iss.vel.dot(u)).normalize(); return { f, u, s: new THREE.Vector3().crossVectors(u, f) }; };
  const applyLocal = (yaw, pitch, distKm, now) => {   // place la caméra autour de l'ISS (yaw, pitch en °, distance en km) ; now = sans transition
    const F = frameIss(), y = yaw * DEG, p = Math.max(-89.5, Math.min(89.5, pitch)) * DEG;
    const d = F.f.clone().multiplyScalar(-Math.cos(y) * Math.cos(p)).addScaledVector(F.s, Math.sin(y) * Math.cos(p)).addScaledVector(F.u, Math.sin(p));
    cam.goal.lat = Math.asin(d.y) / DEG; cam.goal.lon = Math.atan2(-d.z, d.x) / DEG; cam.goal.dist = Math.max(ISS_MIN_DIST_KM, distKm) / R_KM;
    if (now) snapCam();
  };
  const viewIss = () => { if (iss) { setMode('iss'); applyLocal(VIEW_ISS.yaw, VIEW_ISS.pitch, VIEW_ISS.dist, true); } };   // accès DIRECT à l'ISS, sans transition
  const goIss = () => { viewIss(); for (const f of ISS_FEATURES) setFeature(f.id, true); };   // choisir l'ISS (menu ou clic) : vue directe + options allumées d'office (dimensions, hauteur, trajectoire)
  const currentView = () => {
    const rd = x => Math.round(x * 10) / 10, altCam = (camera.position.length() - 1) * R_KM;
    if (cam.mode === 'iss' && iss) { const F = frameIss(), d = camera.position.clone().sub(cam.tgt).normalize(); return { mode: 'iss', yaw: rd(Math.atan2(d.dot(F.s), -d.dot(F.f)) / DEG), pitch: rd(Math.asin(Math.max(-1, Math.min(1, d.dot(F.u)))) / DEG), distKm: Math.round(cam.dist * R_KM * 1e6) / 1e6, fov: camera.fov }; }
    if (cam.mode === 'solar') return { mode: 'solar', cible: solarTarget, lon: rd(cam.lon), lat: rd(cam.lat), distRayonsTerrestres: Math.round(cam.dist * 100) / 100, fov: camera.fov };   // Lune ou Soleil
    return { mode: 'earth', lon: rd(cam.lon), lat: rd(cam.lat), altKm: rd(altCam), fov: camera.fov };
  };
  // « NORD EN HAUT » et « ORBITE À PLAT » (boutons de la fiche d'un astre) : la caméra garde son côté mais se met en place avec un « haut » d'écran choisi.
  // Les vecteurs inertiels sont ramenés dans le repère de la caméra (le groupe `solar` est tourné de rotS en vue Terre fixe).
  const toCam = v => v.clone().applyAxisAngle(Y_AXIS, solar.rotation.y);
  const aimFrom = (d, up, kind) => { cam.goal.lat = Math.asin(Math.max(-1, Math.min(1, d.y))) / DEG; cam.goal.lon = Math.atan2(-d.z, d.x) / DEG; cam.userUp = up.clone(); cam.upKind = kind; publish({ view: { align: kind } }); snapCam(); };
  const alignNorth = id => {   // le pôle nord de l'astre en haut de l'écran, caméra un peu au-dessus de son équateur
    const b = BODY.get(id), pole = b && poleOf(b); if (!pole) return;
    const up = toCam(pole).normalize(), d = ll(cam.lon, cam.lat, new THREE.Vector3());
    let side = d.clone().addScaledVector(up, -d.dot(up)); if (side.length() < 1e-3) side = new THREE.Vector3(1, 0, 0).cross(up); side.normalize();
    aimFrom(side.addScaledVector(up, 0.3).normalize(), up, 'north');
  };
  const resetUp = () => { cam.userUp = null; cam.upKind = null; publish({ view: { align: null } }); };   // « haut » = celui du monde (axe y)
  const alignOrbit = id => {   // la trajectoire de l'astre autour de son corps central vue de côté : plan de l'orbite à l'horizontale, le corps central derrière l'astre
    const b = BODY.get(id); if (!b || !b.around) return;
    const r0 = BODY.rel(id, curD), r1 = BODY.rel(id, curD + 0.01), n = new THREE.Vector3(r0[1] * r1[2] - r0[2] * r1[1], r0[2] * r1[0] - r0[0] * r1[2], r0[0] * r1[1] - r0[1] * r1[0]);
    if (n.length() < 1e-9) return;
    const up = toCam(n.normalize()), radial = toCam(new THREE.Vector3(r0[0], r0[1], r0[2]).normalize()), el = 12 * DEG;   // radial : du corps central vers l'astre
    aimFrom(radial.multiplyScalar(Math.cos(el)).addScaledVector(up, Math.sin(el)).normalize(), up, 'orbit');
  };
  // réglage fin de la vue : kind = 'y±' (cap), 'p±' (pitch), 'd±' (distance) ; stepDeg = pas
  const nudge = (kind, st) => {
    const f = Math.exp(st * 0.02), sgn = kind.endsWith('+') ? 1 : -1;
    if (cam.mode === 'iss' && iss) {
      const v = currentView(); let yaw = v.yaw, pitch = v.pitch, dist = cam.dist * R_KM;   // distance exacte (l'affichage est arrondi)
      if (kind[0] === 'y') yaw += sgn * st; else if (kind[0] === 'p') pitch += sgn * st; else dist *= sgn > 0 ? f : 1 / f;   // d+ = on s'éloigne
      applyLocal(((yaw + 540) % 360) - 180, pitch, dist, true);
    } else if (cam.mode === 'earth') {
      if (kind[0] === 'y') cam.goal.lon += sgn * st; else if (kind[0] === 'p') cam.goal.lat = Math.max(-89.5, Math.min(89.5, cam.goal.lat + sgn * st));
      else cam.goal.dist = 1 + Math.min(EARTH_MAX_DIST, Math.max(2 / R_KM, (cam.goal.dist - 1) * (sgn > 0 ? f : 1 / f)));
      cam.lon = cam.goal.lon; cam.lat = cam.goal.lat; cam.fly = 0;
    }
  };

  // caractéristiques 3D de l'ISS (Dimensions, Trajectoire : ISS_FEATURES, iss.js) ; leurs étiquettes sont projetées à l'écran à chaque image
  const l3d = [], featOn = {}, featInst = {};
  const fctx = { scene: world, model: issModel, label(text) { const l = { el: overlay.label(text), world: new THREE.Vector3(), needModel: false }; l3d.push(l); return l; } };
  const setFeature = (id, on) => {
    const f = ISS_FEATURES.find(x => x.id === id); if (!f) return;
    featOn[id] = on; publish({ features: { ...featOn } }); if (id === 'size' && on && cam.mode !== 'iss') viewIss();   // « Dimensions » ne se voit que sur le satellite : on s'en approche
    if (on && !featInst[id]) featInst[id] = f.build(fctx);
    const inst = featInst[id]; if (inst) { inst.objects.forEach(o => { o.visible = on; }); inst.labels.forEach(l => { if (!on) l.el.style.display = 'none'; }); }
  };

  // ---------- fusées : plan de vol ou objet JSON, avec liste d'étapes, composants et lecture ----------
  const placeAlong = (el, A, B) => {   // texte posé sur un segment (de A à B, absolus), incliné comme lui, à un endroit visible ; false si rien n'est visible
    const at = (t, clip) => { const q = A.clone().lerp(B, t).project(camera); return q.z < 1 && (!clip || (Math.abs(q.x) < 0.95 && Math.abs(q.y) < 0.95)) ? [(q.x + 1) / 2 * innerWidth, (1 - q.y) / 2 * innerHeight] : null; };
    let hit = null;
    for (const t of [0.5, 0.4, 0.3, 0.2, 0.12, 0.06, 0.6, 0.7, 0.8, 0.9, 0.03, 0.015, 0.008, 0.004]) { const p0 = at(t, true), p1 = at(t * 1.1 + 1e-5); if (p0 && p1) { hit = [p0, p1]; break; } }
    if (!hit) { el.style.display = 'none'; return false; }
    let ang = Math.atan2(hit[1][1] - hit[0][1], hit[1][0] - hit[0][0]) * 180 / Math.PI; if (ang > 90) ang -= 180; else if (ang < -90) ang += 180;
    el.style.display = 'block'; el.style.transform = `translate(${hit[0][0]}px,${hit[0][1]}px) translate(-50%,-130%) rotate(${ang}deg)`; return true;
  };
  const placeFirstPerson = src => {   // caméra SUR l'engin (src = { pos, dir, radial } : fusée ou ISS) : avant = sens du vol, haut = verticale du lieu ; yaw / pitch = la tête de celui qui regarde
    const f = src.dir, rad = src.radial, u = tmp2.copy(rad).addScaledVector(f, -rad.dot(f));
    if (u.lengthSq() > 0.0025) cam.fpUp.copy(u).normalize(); else if (cam.fpUp.lengthSq() < 0.5) cam.fpUp.copy(rad).cross(tmp3.set(0, 1, 0).cross(rad)).multiplyScalar(-1).normalize(); else cam.fpUp.addScaledVector(f, -cam.fpUp.dot(f)).normalize();   // près de la verticale : on garde le « haut » précédent
    const up0 = cam.fpUp, right0 = tmp3.crossVectors(f, up0).normalize();
    const yaw = -cam.fp.yaw * DEG, pit = cam.fp.pitch * DEG, d = tmp4.copy(f).applyAxisAngle(up0, yaw), r2 = right0.clone().applyAxisAngle(up0, yaw), u2 = up0.clone().applyAxisAngle(up0, yaw);
    d.applyAxisAngle(r2, pit); u2.applyAxisAngle(r2, pit);
    camera.position.copy(src.pos); camera.quaternion.setFromRotationMatrix(fpM.makeBasis(r2, u2, d.clone().negate())); camera.fov = cam.fp.fov || 70;
  };
  const issSrc = { pos: null, dir: new THREE.Vector3(), radial: new THREE.Vector3() };   // l'ISS vue de l'intérieur : sens de la marche = vitesse, haut = à l'opposé de la Terre
  let issView = false;
  const setIssView = on => {   // « vue depuis l'ISS » : la caméra est sur la station, on regarde autour en glissant ; couper = retour à la vue d'accès de l'ISS
    if (on && iss) { setMode('iss'); cam.fp = { yaw: 0, pitch: -35, fov: 70 }; cam.fpUp.set(0, 0, 0); issView = true; }
    else { const was = issView; issView = false; if (was) { cam.fp = null; if (iss) viewIss(); } }
    publish({ issView });
  };
  // ---------- clics sur la scène : l'ISS et les astres sont cliquables ----------
  let issScreen = null;   // position écran de l'ISS si visible ; celles des astres sont dans bodyObjs[id].screen
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches, HIT = touch ? 42 : 26, near = (p, r, x, y) => !!p && Math.hypot(x - p[0], y - p[1]) < r;
  const bodyAt = (x, y) => { for (const id in bodyObjs) { const o = bodyObjs[id]; if (o.screen && o.b.menu && (o.b.menu.view || o.b.menu.mode === 'earth') && near(o.screen, HIT + (o.b.hitExtraPx || 0), x, y)) return id; } return null; };
  disposers.push(attachControls(canvas, cam, (x, y) => { if (near(issScreen, HIT, x, y)) goIss(); else { const id = bodyAt(x, y); if (id) selectView(id); } }));
  const onMove = e => canvas.classList.toggle('hand', near(issScreen, HIT, e.clientX, e.clientY) || !!bodyAt(e.clientX, e.clientY));
  canvas.addEventListener('pointermove', onMove); disposers.push(() => canvas.removeEventListener('pointermove', onMove));

  const resize = () => { const vv = window.visualViewport, w = Math.round(vv ? vv.width : innerWidth), h = Math.round(vv ? vv.height : innerHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const onOrient = () => setTimeout(resize, 200);
  addEventListener('resize', resize); addEventListener('orientationchange', onOrient); if (window.visualViewport) visualViewport.addEventListener('resize', resize);
  disposers.push(() => { removeEventListener('resize', resize); removeEventListener('orientationchange', onOrient); if (window.visualViewport) visualViewport.removeEventListener('resize', resize); });
  resize();

  const staleDays = Math.abs(Date.now() - ISS_EPOCH) / 86400000;
  /* temps : horloge simulée (simMs) qui avance de simSpeed secondes par seconde réelle ; sert à la Terre, à l'ISS, à la Lune et au Soleil */
  let simMs = Date.now(), lastReal = Date.now(), simSpeed = 1;
  const setSimSpeed = v => { simSpeed = v; publish({ time: { speed: v } }); };
  const resetTime = () => { simMs = Date.now(); setSimSpeed(1); };
  const setDate = ms => { simMs = ms; lastReal = Date.now(); publish({ time: { simMs } }); };   // saut de date : tout (astres, Terre, ISS, Lune, missions) se replace à cette date
  let last = performance.now(), infoT = 0, raf = 0, stopped = false, lastScale = '', ready = false;
  const dirv = new THREE.Vector3(), basis = new THREE.Matrix4(), fw = new THREE.Vector3(), zz = new THREE.Vector3();

  // la Terre cache-t-elle le point P vu de la caméra ?
  const hiddenByEarth = P => { const d = P.clone().sub(camera.position), L = d.length(); d.divideScalar(L); const b = camera.position.dot(d), disc = b * b - (camera.position.lengthSq() - 1); return disc > 0 && -b - Math.sqrt(disc) > 0 && -b - Math.sqrt(disc) < L; };

  // résolution ADAPTATIVE : si les images prennent plus de 30 ms en moyenne, la résolution du rendu baisse (jusqu'à 0,75) ; elle remonte quand la machine suit (images < 15 ms) ; délai entre deux changements
  const perf = { avg: 16, cool: 0 };
  const adaptRatio = (raw, now) => {
    if (raw > 0 && raw < 250) perf.avg = perf.avg * 0.93 + raw * 0.07;   // (images trop longues = onglet en arrière-plan : ignorées)
    if (now < perf.cool) return;
    if (perf.avg > 30 && ratio > 0.75) { ratio = Math.max(0.75, ratio * 0.8); perf.cool = now + 3000; renderer.setPixelRatio(ratio); resize(); }
    else if (perf.avg < 15 && ratio < maxRatio) { ratio = Math.min(maxRatio, ratio * 1.15); perf.cool = now + 8000; renderer.setPixelRatio(ratio); resize(); }
  };
  const frame = now => {
    adaptRatio(now - last, now);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const realNow = Date.now(); simMs += (realNow - lastReal) * simSpeed; lastReal = realNow; const date = new Date(simMs);   // horloge simulée : temps réel par défaut, accélérable
    iss = issState(date);
    frameF = cam.mode === 'solar' ? 1 : 0;
    const Dd = astroD(date), gm = curGm = gmstOf(Dd), _d = curD = Dd, solarMode = cam.mode === 'solar', rotS = -gm * (1 - frameF);
    for (const id in bpos) { const g = BODY.geo(id, Dd); bpos[id].set(g[0] * KMU, g[1] * KMU, g[2] * KMU); babs[id].copy(bpos[id]).applyAxisAngle(Y_AXIS, rotS); }   // position géocentrique de chaque astre (inertielle, puis dans le repère tourné de `solar`)

    // trop loin pour voir l'ISS (cachée) : on passe en vue « Terre » sans bouger la caméra
    if (poseStale) poseStale = false;
    else if (cam.mode === 'iss' && (camera.position.length() - 1) * R_KM > 20000) {
      const p = camera.position, L = p.length(); cam.mode = 'earth'; cam.tgt.set(0, 0, 0); cam.dist = cam.goal.dist = L; cam.lat = cam.goal.lat = Math.asin(p.y / L) / DEG; cam.lon = cam.goal.lon = Math.atan2(-p.z, p.x) / DEG; cam.fly = cam.tfly = 0;
      syncView('earth');
    }
    const goalTgt = solarMode ? (babs[solarTarget] || tmp.set(0, 0, 0)) : cam.mode === 'iss' && iss ? iss.pos : tmp.set(0, 0, 0);
    cam.tgt.copy(goalTgt);   // la cible est posée directement (plus de glissement entre les vues)
    // zoom (molette) : amorti pour ne pas sauter, en altitude pour la Terre (sinon l'amortissement ne bouge plus près du sol)
    const kz = 1 - Math.exp(-dt * 14), base = cam.mode === 'earth' ? 1 : 0;
    const cur = Math.max(1e-10, cam.dist - base), want = Math.max(1e-10, cam.goal.dist - base);
    cam.dist = base + Math.exp(Math.log(cur) + (Math.log(want) - Math.log(cur)) * kz);
    if (Math.abs(Math.log(cam.dist - base) - Math.log(want)) < 1e-3) cam.dist = cam.goal.dist;
    cam.lon = cam.goal.lon; cam.lat = cam.goal.lat;
    cam.goal.lon = ((cam.goal.lon + 540) % 360) - 180;
    ll(cam.lon, cam.lat, dirv);
    camera.position.copy(cam.tgt).addScaledVector(dirv, cam.dist);
    camera.up.copy(cam.userUp || Y_AXIS);   // « haut » de l'écran : l'axe du monde, ou celui demandé (nord de l'astre, normale de son orbite) ; la souris tourne autour de lui ; un changement de vue le remet à zéro
    if (cam.fp && cam.mode === 'iss' && iss && issView) { issSrc.pos = iss.pos; issSrc.dir.copy(iss.vel).normalize(); issSrc.radial.copy(iss.pos).normalize(); placeFirstPerson(issSrc); }
    else { if (camera.fov !== cam.fov) camera.fov = cam.fov; camera.lookAt(cam.tgt); }
    camera.updateMatrixWorld();
    const closest = Math.max(1e-10, Math.min(cam.dist, camera.position.length() - 1) * 0.05);   // plan proche jusqu'à 6 mm (zoom de l'ISS à 10 cm)
    pxScale = innerHeight / 2 / Math.tan(camera.fov * DEG / 2);   // pixels par unité de rayon vu à 1 unité de distance
    { const lv = lodLevel(pxScale / Math.max(1e-6, camera.position.length()), earthLevel, EARTH_LOD.T); if (lv !== earthLevel) { earthLevel = lv; earthGlobe.geometry = EARTH_LOD.seg[lv] ? sphereLod(EARTH_LOD.seg[lv]) : earthGeoHi; } }
    earthAxis.visible = ((cam.mode === 'earth' && cam.dist > 1.6) || solarMode) && camera.position.length() < 40;   // équateur et pôle nord de la Terre quand on la regarde d'assez loin
    camera.near = Math.min(0.05, closest); camera.far = Math.max(1e7, 8 * (camera.position.length() + cam.dist)); camera.updateProjectionMatrix();   // plan lointain proportionnel à l'éloignement : pas de limite de zoom arrière

    // astres : chacun d'après son JSON (position, orientation, queue de comète, orbite, trace, point lointain, étiquette)
    solar.visible = true; solar.rotation.y = rotS;
    if (solarBuilt) {
      const fr = n => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }), proj = (el, P, on) => { const pp = P.clone().project(camera); if (on && pp.z < 1 && Math.abs(pp.x) < 1 && Math.abs(pp.y) < 1) { el.style.display = 'block'; el.style.transform = `translate(${(pp.x + 1) / 2 * innerWidth + 10}px,${(1 - pp.y) / 2 * innerHeight - 8}px)`; return [(pp.x + 1) / 2 * innerWidth, (1 - pp.y) / 2 * innerHeight]; } el.style.display = 'none'; return null; };
      // priorité d'affichage (`displayPriority` du JSON : la Terre avant la Lune) : un astre dont le point tombe à moins de 18 px de son CORPS CENTRAL (plus prioritaire, visible) n'affiche ni son point ni son nom (de loin, la Lune se superposait à la Terre et la cachait)
      const dotShown = id => { const o = bodyObjs[id]; if (!o.dot) return false; const d = o.b.dot; return (!d.onlyInSolarView || solarMode) && cam.dist > (d.minDistanceUnits || 0) && !(solarMode && solarTarget === id && cam.dist < (d.hideBelowUnits || 0)); };
      const scr = {}; for (const id in bodyObjs) { const pp = babs[id].clone().project(camera); scr[id] = pp.z < 1 ? [(pp.x + 1) / 2 * innerWidth, (1 - pp.y) / 2 * innerHeight] : null; }
      // seul le corps central masque : la Lune derrière la Terre, une lune derrière sa planète (Mars ne doit pas disparaître près de la Terre)
      // lunes affichées : la planète dont les lunes sont dessinées perd son nom (celui des lunes suffit) et sa fiche s'affiche (voir plus bas)
      for (const k in moonsShown) delete moonsShown[k];
      for (const id in bodyObjs) { const b = bodyObjs[id].b; if (b.showWithinUnits && b.around && camera.position.distanceTo(babs[b.around]) <= b.showWithinUnits) moonsShown[b.around] = camera.position.distanceTo(babs[b.around]); }
      // OCCULTATION (demande de l'utilisateur) : un astre qui passe derrière un autre astre n'est pas affiché (maillage, point, nom, orbite) ; géométrique : plus loin qu'un occulteur ET entièrement dans son DISQUE réel ; seul un occulteur dont le disque fait au moins 1,5 px compte (un astre réduit à un point n'en cache pas un autre : à ces échelles tout se confond)
      const pxAng = 2 * Math.tan(camera.fov * DEG / 2) / innerHeight, occ = [], camA = camera.position.toArray(); lastOcc = occ;   // occulteurs de l'image (aussi pour les capitales)
      for (const j in bodyObjs) { const rj = BODY.radiusUnits(j); const oj = bodyObjs[j], seen = !!oj && (oj.b.sceneOrigin || (oj.dot && oj.dot.visible) || (oj.mesh && oj.mesh.visible));   // l'occulteur doit être AFFICHÉ (image précédente) : une lune masquée loin de sa planète n'occulte rien
        if (rj > 0 && seen && rj / Math.max(1e-9, camera.position.distanceTo(babs[j])) > 1.5 * pxAng) occ.push({ id: j, p: babs[j].toArray(), r: rj }); }
      const maskedNear = id => { const pr = bodyObjs[id].b.displayPriority || 0, s = scr[id]; if (!s) return false; for (const j in bodyObjs) { if (j !== bodyObjs[id].b.around || (bodyObjs[j].b.displayPriority || 0) <= pr || !scr[j] || !dotShown(j)) continue; if (Math.hypot(s[0] - scr[j][0], s[1] - scr[j][1]) < 18) return true; } return false; };   // ancienne règle d'encombrement : une lune collée à son corps central (moins de 18 px) est masquée
      const masked = id => maskedNear(id) || occludedBy(camA, babs[id].toArray(), occ.filter(o => o.id !== id), 0, BODY.radiusUnits(id)) !== null;
      for (const id in bodyObjs) {
        const o = bodyObjs[id], b = o.b, v = bpos[id], ab = babs[id], ru = BODY.radiusUnits(id), hid = masked(id) || (!!b.showWithinUnits && !!b.around && camera.position.distanceTo(babs[b.around]) > b.showWithinUnits), parent = b.around && bpos[b.around] ? bpos[b.around] : null, tr = b.trace || {};
        o.px = o.mesh ? pxScale * ru * (b.appearance.rings ? 2.4 : 1) / Math.max(1e-9, camera.position.distanceTo(ab)) : 0;   // rayon apparent du maillage (pixels)
        if (o.mesh && o.lodHi) {   // niveau de détail de la sphère d'après sa taille à l'écran ; invisible sous 1 px (son point lointain la remplace)
          const px = o.px, lv = lodLevel(px, o.lod || 0, BODY_LOD.T);
          if (lv !== o.lod) { o.lod = lv; o.mesh.geometry = BODY_LOD.seg[lv] ? sphereLod(BODY_LOD.seg[lv]) : o.lodHi; }
          o.mesh.visible = px > 1;
        }
        if (o.axisG) { const nearA = !hid && solarMode && camera.position.distanceTo(ab) < 40 * ru; o.axisG.visible = nearA; if (nearA) { o.axisG.position.copy(v); o.axisG.quaternion.copy(o.mesh.quaternion); o.axisG.scale.setScalar(ru); } }
        if (o.mesh) { o.mesh.position.copy(v); if (b.orientation === 'tidal-lock' && parent) moonQuat(v.clone().sub(parent).normalize(), (BODY.get(b.around).rotation ? rotationPole(BODY.get(b.around).rotation) : ECLIPTIC_POLE), o.mesh.quaternion); else if (b.rotation) rotationQuat(b.rotation, Dd, o.mesh.quaternion); }   // rotation synchrone : toujours la même face vers le corps central
        if (o.texUrl && !o.texReq && camera.position.distanceTo(ab) < 60 * ru) {   // carte de la surface : téléchargée à l'approche (moins de 60 rayons)
          o.texReq = true;
          new THREE.TextureLoader().load(o.texUrl, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); o.mesh.material.map = t; o.mesh.material.color.set(0xffffff); o.mesh.material.needsUpdate = true; o.texLoaded = true; }, undefined, e => console.warn('Texture de ' + b.name + ' indisponible :', e && e.message));
        }
        if (o.meshUrl && !o.meshReq && camera.position.distanceTo(ab) < 60 * ru) {   // modèle 3D : téléchargé à l'approche (moins de 60 rayons)
          o.meshReq = true;
          fetch(o.meshUrl).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); }).then(txt => { const old = o.mesh.geometry; o.mesh.geometry = parseObj(txt, b.appearance.kmPerUnit || 1, R_KM); old.dispose(); }).catch(e => console.warn('Modèle de ' + b.name + ' indisponible :', e && e.message));
        }
        if (o.texLoaded && camera.position.distanceTo(ab) > 250 * ru) {   // loin : la carte quitte la mémoire graphique (rechargée depuis le cache du navigateur au retour)
          o.mesh.material.map.dispose(); o.mesh.material.map = null; o.mesh.material.color.set(b.appearance.color || '#cccccc'); o.mesh.material.needsUpdate = true; o.texLoaded = false; o.texReq = false;
        }
        if (o.tail) {   // queue de comète : à l'opposé de l'étoile, de plus en plus longue près d'elle, invisible au-delà de ≈ 3,5 UA
          const sv = bpos[STAR], rAU = Math.hypot(v.x - sv.x, v.y - sv.y, v.z - sv.z) / AU_U, tl = b.appearance.tail, k = Math.max(0, 1 - rAU / 3.5) / Math.pow(Math.max(0.3, rAU), 1.5), len = tl.lengthKmAt1AU / R_KM * k;
          o.tail.visible = len > ru * 4 && !hid; if (o.tail.visible) { const dir = v.clone().sub(sv).normalize(); o.tail.position.copy(v); o.tail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); const w = tl.widthKm / 2 / R_KM * Math.sqrt(Math.min(1, k)); o.tail.scale.set(Math.max(w, ru), len, Math.max(w, ru)); }
        }
        if (o.orbitG) { o.orbitG.position.copy(parent || bpos[BODY.origin()]); const orbitOn = (solarMode || cam.mode === 'earth' || camera.position.length() > 300) && !hid, dCam = camera.position.distanceTo(ab), nearL = orbitOn && !!o.localLine && dCam < 3000 * ru; o.orbitG.visible = orbitOn && !nearL; if (o.localLine) { o.localLine.visible = nearL; if (nearL) updateLocalOrbit(o, id, b, Dd, dCam, ru, v); } }   // l'orbite de la Terre reste affichée en vue Terre (de près comme de loin), comme celle de Mars en vue Mars ; masquée seulement en vue ISS / fusée

        // le point lointain (carré de 7 px) disparaît dès que le maillage de l'astre est visible (> 5 px) : il clignotait sur le noyau (position 32 bits imprécise) et faisait doublon
        if (o.dot) { const d = b.dot, shown = (!d.onlyInSolarView || solarMode) && cam.dist > (d.minDistanceUnits || 0) && !(solarMode && solarTarget === id && cam.dist < (d.hideBelowUnits || 0)); o.dot.visible = shown && !hid && !(o.px > 5); const at = o.dot.geometry.attributes.position; at.setXYZ(0, v.x, v.y, v.z); at.needsUpdate = true; }
        if (o.loop) {   // trace de la trajectoire autour du corps central : passé et avenir, recalculée tous les 0,05 jour, collée à l'astre à chaque image
          const N = 120, NF = 60;
          if (Math.abs(Dd - o.loopD) > 0.05) {
            o.loopD = Dd; const P = o.past.geometry.attributes, F = o.fut.geometry.attributes, pd = tr.pastDays, fd = tr.futureDays;
            const q0 = BODY.geo(id, Dd - pd), qN = BODY.geo(id, Dd), gap = tr.closeLoop ? [qN[0] - q0[0], qN[1] - q0[1], qN[2] - q0[2]] : [0, 0, 0];   // closeLoop : l'orbite réelle n'est pas fermée (perturbée) ; l'écart de fermeture est réparti en rampe (nul à l'astre, plein au début de la trace) pour que la boucle revienne pile à sa position actuelle
            for (let k = 0; k <= N; k++) { const q = BODY.geo(id, Dd - pd + k * pd / N), f = 0.12 + 0.88 * k / N, w = 1 - k / N; P.position.setXYZ(k, (q[0] + gap[0] * w) * KMU, (q[1] + gap[1] * w) * KMU, (q[2] + gap[2] * w) * KMU); P.color.setXYZ(k, 0.62 * f, 0.78 * f, 1 * f); }
            for (let k = 0; k <= NF; k++) { const q = BODY.geo(id, Dd + k * fd / NF); F.position.setXYZ(k, q[0] * KMU, q[1] * KMU, q[2] * KMU); F.color.setXYZ(k, 0.45, 0.5, 0.6); }
            P.color.needsUpdate = true; F.color.needsUpdate = true; P.position.needsUpdate = true; F.position.needsUpdate = true;
          }
          { const P = o.past.geometry.attributes.position; P.setXYZ(N, v.x, v.y, v.z); P.needsUpdate = true; const F = o.fut.geometry.attributes.position; F.setXYZ(0, v.x, v.y, v.z); F.needsUpdate = true; }
          o.loop.visible = (solarMode || camera.position.length() > 8) && !hid;
        }
        if (o.label) {   // étiquette : nom (mesures : diamètre) ; la Terre n'est écrite que de loin ou en mode mesures
          const lb = b.label, dKm = fr(2 * b.radiusKm), txt = metric && lb.metricText ? lb.metricText.replace('{diameterKm}', dKm).replace('{earths}', fr(2 * b.radiusKm / (2 * R_KM))) : lb.text; if (o.label.textContent !== txt) o.label.textContent = txt;
          const on = b.sceneOrigin ? ((solarMode || cam.mode === 'earth') && camera.position.length() > 300) || (metric && cam.mode === 'earth' && cam.dist > 6) : camera.position.distanceTo(ab) > (lb.minDistanceRadii != null ? lb.minDistanceRadii * ru : lb.minDistanceUnits || 0);
          o.screen = proj(o.label, ab, on && !hid && !moonsShown[id]);   // la Terre se comporte comme Mars : cliquable quand son nom est affiché (caméra à plus de 300 rayons d'elle), dans toutes les vues d'astre et en vue Terre dézoomée 
        }
      }
    } else { for (const id in bodyObjs) { const o = bodyObjs[id]; if (o.label) o.label.style.display = 'none'; o.screen = null; } }
    // lumière : toujours « jour » (la Terre et la Lune sont éclairées de face)
    if (dayNight) { sun.visible = false; sunPoint.visible = true; amb.intensity = NIGHT_AMBIENT; }   // JOUR / NUIT : éclairage par le vrai Soleil (un point à sa position), la face cachée est sombre
    else { sun.visible = true; sunPoint.visible = false; }
    if (!dayNight) sun.position.copy(cam.mode === 'solar' ? camera.position.clone().sub(cam.tgt).normalize() : camera.position.clone().normalize()).add(tmp.set(0.4, 0.5, 0.2)).multiplyScalar(10);
    if (!dayNight) amb.intensity = 0.55;

    // ISS
    issScreen = null; issLabel.style.display = 'none';
    if (iss) {
      const dKm = camera.position.distanceTo(iss.pos) * R_KM;
      fw.copy(iss.vel).addScaledVector(iss.up, -iss.vel.dot(iss.up)).normalize(); zz.crossVectors(fw, iss.up);
      issModel.quaternion.setFromRotationMatrix(basis.makeBasis(fw, iss.up, zz));
      issModel.position.copy(iss.pos);
      issModel.scale.setScalar(1e-3 / R_KM); issModel.updateMatrix();   // ISS à sa taille réelle (109 m), à toutes les distances
      const px = (ISS_W / 1000 / dKm) / (2 * Math.tan(camera.fov * DEG / 2)) * innerHeight;   // largeur apparente de la station (pixels)
      issModel.visible = hiState === 'ready' && px >= 6;   // sinon : repère jaune (station < 6 px, ou modèle pas encore chargé)
      if (hiState === 'idle' && dKm < 2000) loadHi();
      dot.visible = !issModel.visible;   // le repère jaune disparaît dès qu'on voit le modèle
      dg.attributes.position.setXYZ(0, iss.pos.x, iss.pos.y, iss.pos.z); dg.attributes.position.needsUpdate = true;
      const p = iss.pos.clone().project(camera);
      if (!hiddenByEarth(iss.pos) && p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1) {
        issScreen = [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight];
        issLabel.style.display = 'block'; issLabel.style.transform = `translate(${issScreen[0] + 10}px,${issScreen[1] - 8}px)`;   // le nom reste affiché à tout zoom
      }
    }
    const issHidden = solarMode || (camera.position.length() - 1) * R_KM > 20000;   // l'ISS cachée cache aussi tout ce qui lui appartient : cotes, hauteur, trajectoire
    if (issView && cam.fp) { issModel.visible = false; dot.visible = false; issScreen = null; issLabel.style.display = 'none'; }   // vue DEPUIS l'ISS : ni modèle, ni repère, ni le texte « ISS » (il buguait), ni la hauteur / les cotes   // vue depuis l'ISS : on est dedans (ni le modèle ni le repère jaune)
    if (issHidden) { issScreen = null; issLabel.style.display = 'none'; dot.visible = false; issModel.visible = false; }   // dézoomé : l'ISS est cachée (point, nom et modèle)
    // caractéristiques 3D : mise à jour puis étiquettes projetées à l'écran
    for (const f of ISS_FEATURES) {   // une caractéristique « onlyIss » (taille, hauteur) n'apparaît que sur la vue de l'ISS
      const inst = featInst[f.id]; if (!inst) continue;
      const act = !!featOn[f.id] && !!iss && !issHidden && !(issView && cam.fp) && (!f.onlyIss || cam.mode === 'iss');
      inst.objects.forEach(o => { o.visible = act; }); inst.labels.forEach(l => { l.active = act; });
      if (act && iss) inst.update(iss, camera, date);
    }
    for (const l of l3d) {
      const on = iss && l.active && !(l.needModel && !issModel.visible);
      if (!on) { l.el.style.display = 'none'; continue; }
      if (l.alongLine && l.line) { placeAlong(l.el, l.line[0], l.line[1]); continue; }   // texte posé sur le trait, incliné comme lui
      const p = l.world.clone().project(camera);
      if (p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1) { l.el.style.display = 'block'; l.el.style.transform = `translate(${(p.x + 1) / 2 * innerWidth - l.el.offsetWidth / 2}px,${(1 - p.y) / 2 * innerHeight - 10}px)`; }
      else l.el.style.display = 'none';
    }

    // couverture nuageuse ; trait de côte masqué quand on est très loin (la texture suffit)
    {
      const camAlt = (camera.position.length() - 1) * R_KM;
      clouds.update({ on: cloudsOn, camAlt, http: isHttp() });
      { const wasShown = terrainShown, L = camera.position.length(); let cl = Math.asin(camera.position.y / L) / DEG, co = Math.atan2(-camera.position.z, camera.position.x) / DEG;
        terrainShown = terrain.update({ on: true, camAlt, cl, co, fov: camera.fov, aspect: camera.aspect, http: isHttp() });
        if (terrainShown !== wasShown) publish({ terrainDetail: terrainShown }); }   // l'interface affiche les crédits seulement quand le relief est visible
      borders.visible = bordersOn && camAlt < 20000; borders.scale.setScalar(terrainShown ? 1.0016 : 1);   // sur le relief satellite, les limites flottent au-dessus des montagnes (1,0014 au plus)
      for (let k = 1; k < earth.children.length; k++) if (earth.children[k].isLineSegments) earth.children[k].visible = camAlt < 20000 && !terrainShown;   // dézoomé : plus de trait de côte ; sur le relief satellite il flotterait au-dessus
    }
    // échelle : longueur « ronde » (1, 2, 5 × 10^n) qui fait 70 à 170 px au point regardé
    {
      const dKm = cam.mode === 'earth' ? (camera.position.length() - 1) * R_KM : cam.dist * R_KM;
      if (dKm > 1e-6) {
        const pxPerKm = innerHeight / (2 * dKm * Math.tan(camera.fov * DEG / 2)), raw = 140 / pxPerKm, e10 = Math.pow(10, Math.floor(Math.log10(raw)));
        let n = [5, 2, 1].map(k => k * e10).find(v => v <= raw) || e10, lbl = n < 1 ? Math.round(n * 1000).toLocaleString('fr-FR') + ' m' : n.toLocaleString('fr-FR') + ' km';
        if (raw >= 1e7) { const u = raw >= 0.1 * KM_AL ? KM_AL : KM_UA, ru = raw / u, e = Math.pow(10, Math.floor(Math.log10(ru))), nu = [5, 2, 1].map(k => k * e).find(v => v <= ru) || e; n = nu * u; lbl = nu.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + (u === KM_AL ? ' al' : ' UA'); }   // échelle en UA ou années-lumière quand on est très loin
        const w = Math.round(n * pxPerKm), key = w + '|' + lbl; if (key !== lastScale) { lastScale = key; publish({ scale: { widthPx: w, label: lbl } }); }
      }
    }

    infoT -= dt;
    if (infoT <= 0) {   // texte d'information, temps, paramètres de la vue, fusée : 5 fois par seconde
      infoT = 0.2;
      const altCam = (camera.position.length() - 1) * R_KM, f = v => v >= 1000 ? Math.round(v).toLocaleString('fr-FR') : v.toFixed(v < 10 ? 1 : 0);
      let t = `Caméra : ${fmtBig(altCam) || f(altCam) + ' km'} d'altitude` + (cam.mode === 'iss' ? ` · ${fmtBig(cam.dist * R_KM) || f(cam.dist * R_KM) + ' km'} de l'ISS` : '');
      if (iss) t += `\nISS : ${f(iss.alt)} km · ${iss.speed.toFixed(2)} km/s (${Math.round(iss.speed * 3600).toLocaleString('fr-FR')} km/h) · ${Math.abs(iss.lat).toFixed(1)}°${iss.lat < 0 ? 'S' : 'N'} ${Math.abs(iss.lon).toFixed(1)}°${iss.lon < 0 ? 'O' : 'E'}`;
      else t += '\nISS : pas encore lancée à cette date (premier module : ' + new Date(ISS_FROM).getUTCFullYear() + ')';
      if (iss && iss.approx) t += '\n(hors de la période du TLE : position de l\'ISS indicative)';
      else if (staleDays > 60) t += '\n(TLE ancien : position de l\'ISS imprécise)';
      if (hiState === 'loading') t += '\nChargement du modèle détaillé de l\'ISS…';
      if (cam.mode === 'iss') t += "\nÉchelle réelle : l'ISS (109 m) n'est visible qu'à moins de ~17 km.";
      t += '\n' + BODY.list().filter(b => b.info).sort((a, b) => (a.menu ? a.menu.order : 99) - (b.menu ? b.menu.order : 99)).map(b => { const d = bpos[b.id].length() * R_KM; return `${b.name} à ${fmtBig(d) || Math.round(d).toLocaleString('fr-FR') + ' km'}`; }).join(' · ');   // distances des astres marqués "info" (Lune, Soleil)
      if (solarMode && BODY.get(solarTarget) && BODY.get(solarTarget).menu.view) t += '\n' + BODY.get(solarTarget).menu.view.text;
      const fid = cam.mode === 'iss' ? 'iss' : cam.mode === 'earth' ? 'earth' : solarMode ? solarTarget : null, fb = fid && (BODY.get(fid) || FLIGHT_OBJECTS[fid]);   // astre regardé ; « proche » = à moins de 30 de ses rayons (ou card.nearUnits) : sa fiche s'affiche
      const near = !!fb && !!fb.card;   // la fiche de l'astre choisi s'affiche toujours, de près comme de loin (demande de l'utilisateur)
      let cardId = near ? fid : null;
      if (!cardId && cam.mode !== 'iss') { let best = Infinity; for (const k in moonsShown) if (moonsShown[k] < best && BODY.get(k) && BODY.get(k).card) { best = moonsShown[k]; cardId = k; } }   // lunes affichées : fiche de la planète la plus proche
      publish({ info: t, viewJson: JSON.stringify(currentView()), focus: { id: cardId }, time: { simMs, speed: simSpeed, visible: true } });
    }
    // origine flottante : près de l'ISS, on recentre le monde sur elle pour rendre sans perte de précision
    const shift = iss && camera.position.distanceTo(iss.pos) * R_KM < 3000 ? iss.pos : null, saved = camera.position.clone();
    world.rotation.y = gm * frameF;
    if (shift) { world.position.copy(shift).negate(); camera.position.sub(shift); camera.updateMatrixWorld(); } else world.position.set(0, 0, 0);
    inertial.position.copy(world.position); solar.position.copy(world.position);
    stars.position.copy(camera.position); stars.scale.setScalar(camera.far * 0.45); stars.rotation.y = solar.rotation.y;   // les étoiles suivent le repère « solaire » : fixes en vue inertielle, elles tournent avec le temps sidéral quand la Terre est fixe
    sunPoint.position.copy(babs[STAR]); if (shift) sunPoint.position.sub(shift);   // le Soleil suit le décalage d'origine flottante
    sunGlare.update({ camera, sunPos: sunPoint.position, earthCenter: new THREE.Vector3().setFromMatrixPosition(earth.matrixWorld), height: innerHeight });
    constellations.update({ on: constellationsOn, camera, width: innerWidth, height: innerHeight, earthCenter: new THREE.Vector3().setFromMatrixPosition(earth.matrixWorld) });
    capitals.update({ on: capitalsOn, camera, width: innerWidth, height: innerHeight, hidden: p => occludedBy(camera.position.toArray(), [p.x, p.y, p.z], lastOcc.filter(o => o.id !== 'earth'), 0, 0) !== null });   // juste avant le rendu : pose de la Terre et de la caméra à jour (rotation du temps sidéral comprise) ; cachée par la Lune / une planète = pas de nom
    renderer.render(scene, camera);
    camera.position.copy(saved); camera.updateMatrixWorld();
    if (!ready) { ready = true; publish({ status: 'ready' }); }
  };
  const loop = now => {
    if (stopped) return;
    try { frame(now); } catch (e) { console.error(e); publish({ status: 'error', error: 'Erreur : ' + (e && e.message || e) }); return; }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return {
    // pour les tests et l'interface : exécute une image sans requestAnimationFrame
    alignNorth, alignOrbit, resetUp,
    _dotVisible: () => Object.fromEntries(Object.entries(bodyObjs).filter(([, o]) => o.dot).map(([id, o]) => [id, o.dot.visible])),
    _axisVisible: () => Object.assign({ earth: earthAxis.visible }, Object.fromEntries(Object.entries(bodyObjs).filter(([, o]) => o.axisG).map(([id, o]) => [id, o.axisG.visible]))),
    _view: () => ({ up: camera.up.toArray(), dir: camera.position.clone().sub(cam.tgt).normalize().toArray(), custom: !!cam.userUp, align: cam.upKind }),
    _frame: frame,
    _lod: () => ({ earth: earthLevel, bodies: Object.fromEntries(Object.entries(bodyObjs).filter(([, o]) => o.lodHi).map(([id, o]) => [id, o.mesh.visible ? o.lod : -1])), ratio }),
    _orbitsVisible: () => Object.fromEntries(Object.entries(bodyObjs).filter(([, o]) => o.orbitG).map(([id, o]) => [id, o.orbitG.visible || (!!o.localLine && o.localLine.visible)])),
    _localOrbit: id => { const o = bodyObjs[id]; if (!o || !o.localLine) return null; const at = o.localLine.geometry.attributes.position; return { visible: o.localLine.visible, coarse: o.orbitG.visible, n: at.count, mid: [at.getX(LOCAL_N), at.getY(LOCAL_N), at.getZ(LOCAL_N)], pos: o.localLine.position.toArray(), end: [at.getX(0), at.getY(0), at.getZ(0)] }; },
    _featuresVisible: () => Object.fromEntries(Object.entries(featInst).map(([id, inst]) => [id, inst.objects.some(o => o.visible)])),
    selectView,
    goIss, nudge, setSimSpeed, resetTime, setDate, setFeature, setMetric: v => { metric = !!v; },
    setClouds: on => { cloudsOn = !!on; },
    _terrain: () => Object.assign({ shown: terrainShown }, terrain.stats()),
    setBorders: on => { bordersOn = !!on; },
    setCapitals: on => { capitalsOn = !!on; },
    setConstellations: on => { constellationsOn = !!on; },
    setDayNight: on => { dayNight = !!on; terrain.setLook(dayNight ? 0 : TERRAIN_GLOW, dayNight ? TERRAIN_DAY_GAIN : 1); },
    _glare: () => ({ visible: sunGlare.sprite.visible, opacity: sunGlare.sprite.material.opacity, scale: sunGlare.sprite.scale.x }),
    _sun: () => { const v = babs[STAR].clone().normalize(); return { lon: Math.atan2(-v.z, v.x) / DEG, lat: Math.asin(v.y) / DEG }; },   // point subsolaire dans le repère de la scène (vue Terre fixe)
    _mapOptions: () => ({ borders: bordersOn && borders.visible, capitals: capitals.count(), constellations: constellations.lines.visible, constellationNames: constellations.count(), dayNight, ambient: amb.intensity, sunPoint: sunPoint.visible }),
    _clouds: () => Object.assign({ on: cloudsOn }, clouds.stats()),
    setIssView,
    _fp: () => cam.fp ? { yaw: cam.fp.yaw, pitch: cam.fp.pitch, fov: camera.fov, posErr: iss && issView ? camera.position.distanceTo(iss.pos) * R_KM * 1000 : null, dir: new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).toArray(), up: new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).toArray(), radial: issView ? issSrc.radial.toArray() : null, flight: issView ? issSrc.dir.toArray() : null } : null,

    dispose() {
      stopped = true; cancelAnimationFrame(raf); clearTimeout(solarTimer); disposers.forEach(d => d()); overlay.dispose();
      terrain.dispose(); clouds.dispose(); capitals.dispose(); constellations.dispose(); sunGlare.dispose();
      if (renderer.dispose) renderer.dispose();
    },
  };
}
