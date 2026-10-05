// Observatoires lunaires (sites Apollo) : données, repère local sur la sphère, sol procédural (courbure, cratères, normales vers le haut), drapeau, module lunaire, rover (dimensions réelles).
import * as THREE from 'three';
import { MOON_EYE_M, MOON_RADIUS_M, MOON_SITES, SITE_LAYOUT, buildFlag, buildLander, buildMoonSite, buildRover, flagPixels, groundGeometry, makeTerrain, moonSiteById, moonSiteFrame, regolithPixels } from '../../src/engine/moon-sites.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
check(MOON_SITES.length === 3 && new Set(MOON_SITES.map(s => s.id)).size === 3, 'trois sites Apollo : ' + MOON_SITES.map(s => s.short).join(', '));
check(MOON_SITES.every(s => s.body === 'moon' && Math.abs(s.lat) < 90 && Math.abs(s.lon) <= 180 && s.facts.length >= 4 && /vérifier/.test(s.note) && s.image.endsWith(s.id + '.png')), 'coordonnées valides, fiches complètes « à vérifier »');
check(!moonSiteById('apollo-11').rover && moonSiteById('apollo-15').rover && moonSiteById('apollo-17').rover, 'rover lunaire à Apollo 15 et 17 seulement (pas à Apollo 11)');
// repère local : la Lune représentée par une sphère de rayon 0,272 unité (rayon terrestre = 1), centre à (60, 0, 0)
const unit = MOON_RADIUS_M / 6378137, m = new THREE.Matrix4().compose(new THREE.Vector3(60, 0, 0), new THREE.Quaternion(), new THREE.Vector3(unit, unit, unit));
for (const s of MOON_SITES) {
  const f = moonSiteFrame(s, m), lat = s.lat * Math.PI / 180, lon = s.lon * Math.PI / 180;
  const ok = [f.up, f.east, f.north].every(v => Math.abs(v.length() - 1) < 1e-9) && Math.abs(f.up.dot(f.east)) < 1e-9 && Math.abs(f.up.dot(f.north)) < 1e-9 && Math.abs(f.east.dot(f.north)) < 1e-9;
  const dist = f.ground.clone().sub(new THREE.Vector3(60, 0, 0)).length(), eyeH = f.eye.distanceTo(f.ground) * 6378137;
  check(ok && Math.abs(dist - unit) < 1e-9 && Math.abs(eyeH - MOON_EYE_M) < 1e-3 && Math.abs(f.up.y - Math.sin(lat)) < 1e-9 && f.north.y > 0, s.short + ' : repère orthonormé, sol à ' + (dist * 6378.137).toFixed(1) + ' km du centre de la Lune, œil à ' + eyeH.toFixed(2) + ' m, nord vers le pôle (y > 0)');
  void lon;
}
// sol
const { height, craters } = makeTerrain(15);
check(Math.abs(height(0, 0)) < 0.2 && height(2600, 0) < -1.5 && height(2600, 0) > -3.5, 'courbure de la Lune : sol à ' + height(0, 0).toFixed(2) + ' m sous l’œil au pied, ' + height(2600, 0).toFixed(1) + ' m à 2,6 km (l’horizon d’un œil à 1,8 m)');
check(craters.every(c => Math.hypot(c.x, c.z) > 59 && c.r >= 8 && c.depth > 0), craters.length + ' cratères, aucun à moins de 60 m de l’observateur');
const c0 = craters.find(c => c.r > 30); check(height(c0.x, c0.z) < height(c0.x + c0.r * 2, c0.z) - c0.depth * 0.5, 'un cratère est une cuvette (centre plus bas que ses abords de ' + (height(c0.x + c0.r * 2, c0.z) - height(c0.x, c0.z)).toFixed(1) + ' m)');
const { geometry, rMax } = groundGeometry(height), pos = geometry.attributes.position, nor = geometry.attributes.normal;
check(rMax > 6000 && rMax < 12000 && pos.count > 20000, 'maillage polaire : ' + pos.count + ' sommets, jusqu’à ' + (rMax / 1000).toFixed(1) + ' km (au-delà de l’horizon)');
let up = 0, inv = 0; for (let i = 0; i < nor.count; i += 7) { if (nor.getY(i) > 0.3) up++; else inv++; }
check(inv === 0 || inv / (up + inv) < 0.01, 'normales tournées vers le haut (' + up + ' sur ' + (up + inv) + ')');
let minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9; for (let i = 0; i < pos.count; i++) { minY = Math.min(minY, pos.getY(i)); maxY = Math.max(maxY, pos.getY(i)); minX = Math.min(minX, pos.getX(i)); maxX = Math.max(maxX, pos.getX(i)); }
check(maxY < 20 && minY > -80 && minX < -6000 && maxX > 6000, 'altitudes de ' + minY.toFixed(0) + ' à ' + maxY.toFixed(0) + ' m sur 12 km de large');
const rp = regolithPixels(64, 3), vals = []; for (let i = 0; i < rp.length; i += 4) vals.push(rp[i]);
check(Math.min(...vals) > 40 && Math.max(...vals) < 200 && Math.max(...vals) - Math.min(...vals) > 25, 'régolithe : gris mouchetés entre ' + Math.min(...vals).toFixed(0) + ' et ' + Math.max(...vals).toFixed(0));
// drapeau : stries et étoiles
const fp = flagPixels(260, 136), px = (x, y) => [fp[(y * 260 + x) * 4], fp[(y * 260 + x) * 4 + 1], fp[(y * 260 + x) * 4 + 2]];
check(px(200, 3)[0] > 150 && px(200, 3)[1] < 60 && px(200, 14)[0] > 240 && px(200, 14)[1] > 240, 'drapeau : première strie rouge, deuxième blanche');
let blue = 0, white = 0; for (let y = 0; y < 70; y++) for (let x = 0; x < 100; x++) { const c = px(x, y); if (c[2] > 100 && c[0] < 80) blue++; else if (c[0] > 240 && c[1] > 240) white++; }
check(blue > 4000 && white > 100, 'carré bleu avec des étoiles blanches (' + blue + ' pixels bleus, ' + white + ' blancs)');
// modèles aux dimensions réelles
const flag = buildFlag(), fb = new THREE.Box3().setFromObject(flag).getSize(new THREE.Vector3());
check(fb.y > 2.3 && fb.y < 2.5 && fb.x > 1.2 && fb.x < 1.7, 'drapeau : mât de ' + fb.y.toFixed(2) + ' m, toile de 1,2 m (largeur totale ' + fb.x.toFixed(2) + ' m)');
const rv = buildRover(), rb = new THREE.Box3().setFromObject(rv).getSize(new THREE.Vector3()), wheels = rv.children.filter(c => c.material && c.material.wireframe);
check(wheels.length === 4 && rb.x > 3 && rb.x < 3.9 && rb.z > 2 && rb.z < 3 && rb.y > 1.3 && rb.y < 2.4, 'rover : 4 roues en treillis, ' + rb.x.toFixed(1) + ' m de long (3,1 m), ' + rb.z.toFixed(1) + ' m de large, ' + rb.y.toFixed(1) + ' m de haut avec l’antenne');
const ld = buildLander(), lb = new THREE.Box3().setFromObject(ld).getSize(new THREE.Vector3());
check(lb.y > 3.2 && lb.y < 5 && lb.x > 5 && lb.x < 10, 'module lunaire (étage de descente) : ' + lb.x.toFixed(1) + ' m d’empattement, ' + lb.y.toFixed(1) + ' m de haut');
// site complet
const s11 = buildMoonSite(moonSiteById('apollo-11')), s15 = buildMoonSite(moonSiteById('apollo-15'));
check(s11.userData.flag && s11.userData.lander && !s11.userData.rover && s15.userData.rover, 'site complet : drapeau + module lunaire (+ rover à Apollo 15)');
check(Math.abs(s15.userData.flag.position.y - s15.userData.height(SITE_LAYOUT.flag.x, SITE_LAYOUT.flag.z)) < 1e-9 && s15.userData.ground.geometry.attributes.position.count > 20000, 'objets posés sur le sol (altitude du relief à leur place)');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
