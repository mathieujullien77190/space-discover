import { DEG, R_KM } from './earth.js';

// Contrôles : glisser = tourner autour de la cible, molette / pincement = zoom, clic sans bouger = onClick(x, y).
export function attachControls(canvas, cam, onClick) {
  const ptrs = new Map(); let pinch = 0, moved = 0;
  const tanH = () => Math.tan(cam.fov * DEG / 2);
  const zoom = f => {   // f > 1 = on s'éloigne
    if (cam.mode === 'launch') { cam.zoomFit = false; cam.launchK = Math.max(1e-7, Math.min(1e7, cam.launchK * f)); }   // zoom manuel sur la caméra auto de la fusée
    else if (cam.mode === 'earth') cam.goal.dist = 1 + Math.min(150, Math.max(2 / R_KM, (cam.goal.dist - 1) * f));   // on zoome sur l'altitude (min 2 km)
    else if (cam.mode === 'solar') cam.goal.dist = Math.min(3e5, Math.max(1.5, cam.goal.dist * f));   // vue Soleil / Lune : de 1,5 rayon terrestre à 3·10⁵ (≈ 13 UA)
    else cam.goal.dist = Math.min(41, Math.max(0.1 / R_KM, cam.goal.dist * f));                                    // autour de l'ISS (min 100 m)
    
  };
  const rotate = (dx, dy) => {
    const alt = Math.max(1e-5, cam.mode === 'earth' ? cam.dist - 1 : 0);
    const k = cam.mode === 'earth' ? Math.min(alt, 3) * 2 * tanH() / canvas.clientHeight / DEG : 0.3;   // le sol suit le doigt à tout zoom
    cam.goal.lon -= dx * k; cam.goal.lat = Math.max(-89.5, Math.min(89.5, cam.goal.lat + dy * k));
    cam.lon = cam.goal.lon; cam.lat = cam.goal.lat; cam.fly = 0; if (cam.mode === 'launch') cam.userDir = true;   // l'utilisateur reprend la main
  };
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; canvas.classList.add('drag'); if (ptrs.size === 2) pinch = 0; });
  canvas.addEventListener('pointermove', e => {
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
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoom(Math.exp(Math.max(-200, Math.min(200, e.deltaY)) * (cam.mode === 'iss' ? (cam.goal.dist * R_KM < 30 ? 0.0009 : 0.0025) : 0.0015))); }, { passive: false });
  addEventListener('keydown', e => {
    if (e.key === '+' || e.key === '=') zoom(0.8); else if (e.key === '-') zoom(1.25);
    else if (e.key === 'Escape') cam.onEarth && cam.onEarth();
  });
}
