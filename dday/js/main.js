// D-Day : projet 3D à part (three.js r160, scripts classiques, aucun build). Pour l'instant un bac à sable : une plage, la mer, des falaises et des barges de débarquement, pour tester des idées.
(function () {
  const canvas = document.getElementById('gl');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch (e) { document.getElementById('info').textContent = 'WebGL indisponible dans ce navigateur.'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(55, 1, 0.5, 6000);
  const SKY = 0x9fb6c8; scene.background = new THREE.Color(SKY); scene.fog = new THREE.Fog(SKY, 400, 2600);
  const sun = new THREE.DirectionalLight(0xfff1d8, 1.1); sun.position.set(-300, 400, 200); scene.add(sun, new THREE.HemisphereLight(0xcfe3f5, 0x5a5648, 0.65));
  const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9, metalness: 0 }, o || {}));
  // mer (x ≥ 0 : large) et plage (x < 0 : sable en pente douce) ; l'axe z longe la côte
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 80, 80), M(0x2d5d7b, { roughness: 0.35, metalness: 0.1 })); sea.rotation.x = -Math.PI / 2; sea.position.set(2900, 0, 0); scene.add(sea);
  const seaPos = sea.geometry.attributes.position, seaBase = seaPos.array.slice();
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(220, 6000, 1, 1), M(0xcdbb8f)); beach.rotation.x = -Math.PI / 2; beach.position.set(-110, 0.4, 0); scene.add(beach);
  const land = new THREE.Mesh(new THREE.PlaneGeometry(4000, 6000), M(0x5a6b3e)); land.rotation.x = -Math.PI / 2; land.position.set(-2220, 6, 0); scene.add(land);
  // falaises : blocs irréguliers le long de la côte
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 90; i++) { const w = 18 + rnd() * 30, h = 20 + rnd() * 45, b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 20 + rnd() * 30), M(0x8d8a80)); b.position.set(-225 - rnd() * 18, h / 2, -1400 + i * 31 + rnd() * 10); b.rotation.y = (rnd() - 0.5) * 0.4; scene.add(b); }
  // barges de débarquement : coque (boîte) + rampe, elles avancent vers la plage par vagues
  const boats = [];
  for (let i = 0; i < 24; i++) {
    const g = new THREE.Group(), hull = new THREE.Mesh(new THREE.BoxGeometry(22, 4, 7), M(0x4a5a48)), ramp = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 6), M(0x3a4538)), cab = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 5), M(0x5a6a58));
    ramp.position.set(-12, 1.4, 0); cab.position.set(7, 3.5, 0); hull.position.y = 1.2; g.add(hull, ramp, cab);
    g.userData = { z: -420 + i * 36 + (rnd() - 0.5) * 12, x0: 420 + (i % 4) * 140, speed: 7 + rnd() * 3, ph: rnd() * 6 }; g.position.set(g.userData.x0, 0, g.userData.z); scene.add(g); boats.push(g);
  }
  // caméra orbitale (glisser = tourner, molette / pincement = zoom)
  const cam = { yaw: 0.9, pitch: 0.35, dist: 520, tgt: new THREE.Vector3(120, 10, 0) }, ptrs = new Map(); let pinch = 0;
  const place = () => { const cp = Math.cos(cam.pitch); camera.position.set(cam.tgt.x + cam.dist * cp * Math.cos(cam.yaw), cam.tgt.y + cam.dist * Math.sin(cam.pitch), cam.tgt.z + cam.dist * cp * Math.sin(cam.yaw)); camera.lookAt(cam.tgt); };
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); pinch = 0; });
  canvas.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p[0], dy = e.clientY - p[1]; p[0] = e.clientX; p[1] = e.clientY;
    if (ptrs.size === 1) { cam.yaw -= dx * 0.005; cam.pitch = Math.max(0.03, Math.min(1.45, cam.pitch + dy * 0.005)); }
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) cam.dist = Math.max(15, Math.min(3000, cam.dist * pinch / d)); pinch = d; }
  });
  const up = e => { ptrs.delete(e.pointerId); pinch = 0; }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.max(15, Math.min(3000, cam.dist * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
  function resize() { const vv = window.visualViewport, w = Math.round(vv ? vv.width : innerWidth), h = Math.round(vv ? vv.height : innerHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); if (window.visualViewport) visualViewport.addEventListener('resize', resize); resize();
  let last = performance.now(), t = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt;
    for (let i = 0; i < seaPos.count; i++) { const x = seaBase[3 * i], y = seaBase[3 * i + 1]; seaPos.setZ(i, Math.sin(x * 0.02 + t * 1.2) * 0.8 + Math.sin(y * 0.03 + t * 0.9) * 0.6); } seaPos.needsUpdate = true;
    for (const b of boats) { const u = b.userData; u.x -= u.speed * dt; if (u.x < -20) u.x = 900; b.position.set(u.x - 0 + 0, 0.6 + Math.sin(t * 1.5 + u.ph) * 0.5, u.z); b.rotation.z = Math.sin(t * 1.3 + u.ph) * 0.04; }
    place(); renderer.render(scene, camera); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
