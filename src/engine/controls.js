import * as THREE from 'three';
import { DEG, R_KM, ll } from './earth.js';

// Contrôles : glisser = tourner autour de la cible, molette / pincement = zoom, clic sans bouger = onClick(x, y).
export const EARTH_MAX_DIST = 1e10;   // zoom arrière maximal de la vue Terre (rayons terrestres) : pratiquement illimité (≈ 7 années-lumière ; 1 UA = 23 455 rayons)
export function attachControls(canvas, cam, onClick) {
  const ptrs = new Map(); let pinch = 0, moved = 0; const offs = [], on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); };
  const tanH = () => Math.tan(cam.fov * DEG / 2);
  const zoom = f => {   // f > 1 = on s'éloigne
    if (cam.fp) { cam.fp.fov = Math.max(20, Math.min(100, (cam.fp.fov || 60) * (f > 1 ? 1.08 : 1 / 1.08))); return; }   // première personne : la molette règle l'ouverture du champ
    if (cam.mode === 'launch') { cam.zoomFit = false; cam.launchK = Math.max(1e-7, Math.min(1e7, cam.launchK * f)); }   // zoom manuel sur la caméra auto de la fusée
    else if (cam.mode === 'earth') cam.goal.dist = 1 + Math.min(EARTH_MAX_DIST, Math.max(2 / R_KM, (cam.goal.dist - 1) * f));   // on zoome sur l'altitude (min 2 km)
    else if (cam.mode === 'solar') cam.goal.dist = Math.min(EARTH_MAX_DIST, Math.max(cam.minDist || 1.5, cam.goal.dist * f));   // vue Soleil / Lune : de 1,5 rayon terrestre à 3·10⁵ (≈ 13 UA)
    else cam.goal.dist = Math.min(41 * (cam.vk || 1), Math.max(0.1 * (cam.vk || 1) / R_KM, cam.goal.dist * f));                                    // autour de l'ISS (min 100 m)
    
  };
  const rotate = (dx, dy) => {
    if (cam.fp) { cam.fp.yaw -= dx * 0.3; cam.fp.pitch = Math.max(-89, Math.min(89, cam.fp.pitch + dy * 0.3)); return; }   // vue à la première personne : on tourne la tête (le décor suit le doigt)
    const alt = Math.max(1e-5, cam.mode === 'earth' ? cam.dist - 1 : 0);
    const k = cam.mode === 'earth' ? Math.min(alt, 3) * 2 * tanH() / canvas.clientHeight / DEG : 0.3;   // le sol suit le doigt à tout zoom
    if (cam.userUp) {   // « haut » personnalisé (Nord en haut, Orbite à plat) : on tourne AUTOUR de cet axe (gauche-droite) et au-dessus / au-dessous de son plan (haut-bas), sans jamais remettre l'écran à la verticale du monde (ce qui faisait « sauter » la vue)
      const u = cam.userUp, d = ll(cam.lon, cam.lat, new THREE.Vector3()).applyAxisAngle(u, -dx * k * DEG), right = new THREE.Vector3().crossVectors(u, d).normalize(), dn = d.clone().applyAxisAngle(right, -dy * k * DEG);
      const e = Math.abs(dn.dot(u)) < Math.sin(89.5 * DEG) ? dn : d;   // pas au-delà des pôles de l'axe
      cam.goal.lat = Math.asin(Math.max(-1, Math.min(1, e.y))) / DEG; cam.goal.lon = Math.atan2(-e.z, e.x) / DEG; cam.lon = cam.goal.lon; cam.lat = cam.goal.lat; cam.fly = 0;
      return;
    }
    cam.goal.lon -= dx * k; cam.goal.lat = Math.max(-89.5, Math.min(89.5, cam.goal.lat + dy * k));
    cam.lon = cam.goal.lon; cam.lat = cam.goal.lat; cam.fly = 0; if (cam.mode === 'launch') cam.userDir = true;   // l'utilisateur reprend la main
  };
  on(canvas, 'pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; canvas.classList.add('drag'); if (ptrs.size === 2) pinch = 0; });
  on(canvas, 'pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p[0], dy = e.clientY - p[1]; moved += Math.abs(dx) + Math.abs(dy);
    if (ptrs.size === 1) rotate(dx, dy);
    p[0] = e.clientX; p[1] = e.clientY;
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch) zoom(pinch / d); pinch = d;
    }
  });
  const up = e => {
    if (ptrs.has(e.pointerId) && ptrs.size === 1 && moved < 6 && e.type === 'pointerup') onClick(e.clientX, e.clientY);
    ptrs.delete(e.pointerId); pinch = 0; if (!ptrs.size) canvas.classList.remove('drag');
  };
  on(canvas, 'pointerup', up); on(canvas, 'pointercancel', up);
  on(canvas, 'wheel', e => { e.preventDefault(); zoom(Math.exp(Math.max(-200, Math.min(200, e.deltaY)) * (cam.mode === 'iss' ? (cam.goal.dist * R_KM < 30 ? 0.0009 : 0.0025) : 0.0015))); }, { passive: false });
  on(window, 'keydown', e => {
    if (e.key === '+' || e.key === '=') zoom(0.8); else if (e.key === '-') zoom(1.25);
    else if (e.key === 'Escape') cam.onEarth && cam.onEarth();
  });
  return () => offs.forEach(f => f());
}
