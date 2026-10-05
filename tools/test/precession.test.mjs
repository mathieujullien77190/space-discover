// Précession J2000 → date : les étoiles se décalent comme dans la réalité (Δα = m + n·sinα·tanδ, Δδ = n·cosα avec m = 3,075 s/an et n = 20,04″/an).
import * as THREE from 'three';
import { precessionAngles, precessionQuaternion } from '../../src/engine/precession.js';
import { starVector } from '../../src/engine/stars.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const T = 0.2676;   // 26,76 ans après J2000 (oct. 2026)
const radec = v => ({ ra: ((Math.atan2(-v.z, v.x) * 180 / Math.PI) + 360) % 360, dec: Math.asin(v.y) * 180 / Math.PI });
const move = (ra, dec) => radec(starVector(ra, dec, new THREE.Vector3()).applyQuaternion(precessionQuaternion(T)));
const a = precessionAngles(1);
check(Math.abs(a.zeta * 180 / Math.PI * 3600 - 2306.2) < 1 && Math.abs(a.theta * 180 / Math.PI * 3600 - 2004.3) < 1, 'angles de précession pour un siècle : ζ ≈ 2306″, θ ≈ 2004″');
const p0 = move(0, 0);
check(Math.abs(p0.ra - 0.3438) < 0.01 && Math.abs(p0.dec - 0.149) < 0.01, 'étoile à (α = 0°, δ = 0°) : ascension droite +' + p0.ra.toFixed(3) + '° (3,075 s / an = 0,344° en 26,76 ans), déclinaison +' + p0.dec.toFixed(3) + '° (n·cosα = 20,04″ / an = 0,149°)');
const p90 = move(90, 0);
check(Math.abs(p90.dec) < 0.01 && Math.abs(p90.ra - 90.3438) < 0.01, 'étoile à (α = 90°, δ = 0°) : ascension droite ' + p90.ra.toFixed(3) + '° (+0,344°), déclinaison inchangée (cosα = 0)');
const polaris = move(37.9546, 89.2641);
check(polaris.dec > 89.35 && polaris.dec < 89.40, 'la Polaire se rapproche du pôle : δ(J2000) = 89,264° → δ(2026) = ' + polaris.dec.toFixed(3) + '° (≈ 0,62° du pôle)');
const q0 = precessionQuaternion(0), id = new THREE.Quaternion();
check(Math.abs(Math.abs(q0.dot(id)) - 1) < 1e-12, 'en 2000 : rotation nulle');
const v = starVector(101.29, -16.72, new THREE.Vector3());
check(Math.abs(v.clone().applyQuaternion(precessionQuaternion(T)).length() - 1) < 1e-12, 'rotation pure (norme conservée)');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
