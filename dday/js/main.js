// D-Day : projet 3D à part (three.js r160, scripts classiques, aucun build).
// Zone de 1 km × 1 km : une PLAGE et de l'EAU (vagues, écume au rivage, transparence selon la profondeur) avec une BARGE DE DÉBARQUEMENT (type Higgins, 11 m) qui arrive sur la plage, baisse sa rampe, débarque ses soldats puis repart.
// Repère (mètres) : x = vers la mer (la plage est à x ≈ 0, la terre à x < 0, la mer à x > 0), y = haut, z = le long de la côte. Zone : x de −300 à 700, z de −500 à 500.
(function () {
  const canvas = document.getElementById('gl'), info = document.getElementById('info');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch (e) { info.textContent = 'WebGL indisponible dans ce navigateur.'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(55, 1, 0.3, 9000);
  const SUN = new THREE.Vector3(-0.55, 0.42, 0.35).normalize(), HORIZON = new THREE.Color(0xcfdde8), ZENITH = new THREE.Color(0x4f86c6);
  scene.fog = new THREE.Fog(HORIZON, 1200, 6000); scene.background = HORIZON;
  const sun = new THREE.DirectionalLight(0xfff0d6, 1.25); sun.position.copy(SUN).multiplyScalar(1000); scene.add(sun, new THREE.HemisphereLight(0xcfe3f5, 0x8a7a58, 0.7));
  // ---------- bruit déterministe (sable, dunes) ----------
  const hash = (x, y) => { let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
  const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return (hash(xi, yi) * (1 - u) + hash(xi + 1, yi) * u) * (1 - v) + (hash(xi, yi + 1) * (1 - u) + hash(xi + 1, yi + 1) * u) * v; };
  const SLOPE = 0.035;   // pente de la plage sous l'eau : 3,5 %
  // hauteur du terrain (plage, fond marin, dunes) en un point
  const terrainH = (x, z) => {
    if (x >= 0) return -SLOPE * x + (vnoise(z * 0.02, x * 0.015) - 0.5) * 1.2 * Math.min(1, x / 60);   // fond marin avec quelques bancs de sable
    const rise = Math.min(-x * 0.03, 4.5);   // la plage monte doucement, puis les dunes
    return rise + (x < -150 ? (vnoise(x * 0.02, z * 0.02) * 4 + (-x - 150) * 0.02) : 0) + (vnoise(x * 0.3, z * 0.3) - 0.5) * 0.12;
  };
  // ---------- terrain : plage et dunes (couleurs de sommets : sable humide près de l'eau, sable sec, herbe sur les dunes) ----------
  const terr = new THREE.PlaneGeometry(1000, 1000, 250, 250); terr.rotateX(-Math.PI / 2);
  { const p = terr.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), wet = new THREE.Color(0x8c7c58), dry = new THREE.Color(0xd9c698), grass = new THREE.Color(0x6e7b44), sea = new THREE.Color(0xb7a57a);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + 200, z = p.getZ(i), h = terrainH(x, z); p.setXYZ(i, x, h, z);
      if (x > 8) c.copy(sea); else { c.copy(dry); const w = Math.max(0, Math.min(1, (x + 14) / 22)); c.lerp(wet, w); }
      if (x < -140) c.lerp(grass, Math.min(1, ((-x - 140) / 60) * (0.4 + vnoise(x * 0.05, z * 0.05))));
      const g = 0.92 + 0.16 * vnoise(x * 0.5, z * 0.5); c.multiplyScalar(g); col.set([c.r, c.g, c.b], 3 * i);
    }
    terr.setAttribute('color', new THREE.BufferAttribute(col, 3)); terr.computeVertexNormals(); }
  const grain = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); if (!g) return null; const im = g.createImageData(128, 128); for (let i = 0; i < 128 * 128; i++) { const v = 100 + Math.random() * 120; im.data.set([v, v, v, 255], 4 * i); } g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(220, 220); return t; })();
  const ground = new THREE.Mesh(terr, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, bumpMap: grain, bumpScale: 0.8 })); scene.add(ground);
  // au-delà de la zone : mer et terre lointaines (plates), fondues dans le brouillard
  const far = (x0, x1, z0, z1, y, color) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshBasicMaterial({ color })); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); scene.add(m); return m; };
  far(690, 9000, -9000, 9000, -0.6, 0x3a6f86); far(-300, 700, 500, 9000, -0.6, 0x3a6f86); far(-300, 700, -9000, -500, -0.6, 0x3a6f86); far(-9000, -290, -9000, 9000, 10, 0x6e7b44);
  // ---------- eau ----------
  const WAVES = [[1, 0.12, 0.34, 62, 1.0], [0.8, -0.5, 0.2, 29, 1.25], [0.9, 0.4, 0.11, 14, 1.5], [0.5, 0.9, 0.06, 7, 1.8]].map(([dx, dz, A, L, sp]) => { const n = Math.hypot(dx, dz), k = 2 * Math.PI / L; return { dx: dx / n, dz: dz / n, A, k, w: Math.sqrt(9.81 * k) * sp }; });
  const damp = x => 0.3 + 0.7 * Math.max(0, Math.min(1, (SLOPE * x) / 8));   // les vagues s'amortissent près du rivage
  const waveH = (x, z, t) => { let h = 0; for (const w of WAVES) h += w.A * Math.sin(w.k * (w.dx * x + w.dz * z) + w.w * t); return h * damp(x); };
  const wavesGLSL = WAVES.map((w, i) => `{ float ph = ${w.k.toFixed(5)} * (${w.dx.toFixed(5)} * p.x + ${w.dz.toFixed(5)} * p.y) + ${w.w.toFixed(5)} * uTime; h += ${w.A} * sin(ph) * d; gx += ${(w.A * w.k * w.dx).toFixed(6)} * cos(ph) * d; gz += ${(w.A * w.k * w.dz).toFixed(6)} * cos(ph) * d; }`).join('\n');
  const waterMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uSun: { value: SUN }, uHorizon: { value: HORIZON }, uZenith: { value: ZENITH }, uSlope: { value: SLOPE } },
    vertexShader: `
      uniform float uTime; varying vec3 vWorld; varying float vH;
      void waves(vec2 p, out float h, out float gx, out float gz) { h = 0.0; gx = 0.0; gz = 0.0; float d = 0.3 + 0.7 * clamp(${SLOPE} * p.x / 8.0, 0.0, 1.0);
        ${wavesGLSL} }
      void main() { vec3 pos = position; float h, gx, gz; waves(pos.xz, h, gx, gz); pos.y += h; vH = h; vec4 w = modelMatrix * vec4(pos, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uSun; uniform vec3 uHorizon; uniform vec3 uZenith; uniform float uSlope; varying vec3 vWorld; varying float vH;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      void waves(vec2 p, out float h, out float gx, out float gz) { h = 0.0; gx = 0.0; gz = 0.0; float d = 0.3 + 0.7 * clamp(uSlope * p.x / 8.0, 0.0, 1.0);
        ${wavesGLSL} }
      vec3 sky(vec3 dir) { float t = clamp(dir.y, 0.0, 1.0); vec3 c = mix(uHorizon, uZenith, pow(t, 0.6)); c += vec3(1.0, 0.85, 0.6) * pow(max(dot(dir, uSun), 0.0), 400.0) * 3.0; return c; }
      void main() {
        float depth = uSlope * vWorld.x + vH; if (depth < -0.15) discard;
        float h, gx, gz; waves(vWorld.xz, h, gx, gz);
        vec2 q = vWorld.xz * 0.35 + vec2(uTime * 0.6, uTime * 0.2); float rip = noise(q) + 0.5 * noise(q * 2.3 - uTime * 0.4) - 0.75;
        vec3 n = normalize(vec3(-gx - rip * 0.12, 1.0, -gz - rip * 0.07));
        vec3 V = normalize(cameraPosition - vWorld); float fres = pow(1.0 - max(dot(n, V), 0.0), 4.0) * 0.9 + 0.04;
        vec3 R = reflect(-V, n); R.y = abs(R.y);
        float dd = max(depth, 0.0);
        vec3 shallow = vec3(0.30, 0.62, 0.62), deep = vec3(0.04, 0.2, 0.32);
        vec3 body = mix(deep, shallow, exp(-dd * 0.07));
        vec3 col = mix(body, sky(R), fres);
        vec3 H2 = normalize(uSun + V); col += vec3(1.0, 0.9, 0.7) * pow(max(dot(n, H2), 0.0), 220.0) * 1.4;
        float foamN = noise(vWorld.xz * 0.7 + uTime * 0.3) * 0.6 + noise(vWorld.xz * 2.1 - uTime * 0.5) * 0.4;
        float shoreFoam = smoothstep(2.2, 0.0, depth + (foamN - 0.5) * 1.2) * (0.5 + 0.5 * sin(uTime * 1.6 + vWorld.z * 0.05));
        float crest = smoothstep(0.34, 0.6, h + foamN * 0.15) * 0.35;
        float foam = clamp(shoreFoam + crest, 0.0, 1.0); col = mix(col, vec3(0.96, 0.98, 1.0), foam * 0.85);
        float alpha = mix(0.4, 0.97, 1.0 - exp(-dd * 0.35)); alpha = max(alpha, foam); alpha *= smoothstep(-0.15, 0.25, depth);
        float fogF = clamp((distance(cameraPosition, vWorld) - 1200.0) / 4800.0, 0.0, 1.0); col = mix(col, uHorizon, fogF);
        gl_FragColor = vec4(col, alpha);
      }`,
  });
  const wgeo = new THREE.PlaneGeometry(740, 1000, 190, 250); wgeo.rotateX(-Math.PI / 2);
  { const p = wgeo.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + 330); }   // x de −40 à 700
  const water = new THREE.Mesh(wgeo, waterMat); water.frustumCulled = false; water.renderOrder = 2; scene.add(water);
  // ciel : dégradé et soleil
  const dome = new THREE.Mesh(new THREE.SphereGeometry(8000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSun: { value: SUN }, uHorizon: { value: HORIZON }, uZenith: { value: ZENITH } },
    vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uSun; uniform vec3 uHorizon; uniform vec3 uZenith; varying vec3 vDir; void main() { float t = clamp(vDir.y, 0.0, 1.0); vec3 c = mix(uHorizon, uZenith, pow(t, 0.6)); float s = max(dot(normalize(vDir), uSun), 0.0); c += vec3(1.0, 0.9, 0.65) * (pow(s, 600.0) * 4.0 + pow(s, 8.0) * 0.18); gl_FragColor = vec4(c, 1.0); }' })); dome.renderOrder = -1; scene.add(dome);
  // ---------- barge de débarquement (type Higgins, 11 m × 3,3 m) : proue vers +x local ----------
  const Mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.75, metalness: 0.15 }, o || {}));
  const barge = new THREE.Group(), BL = 11, BW = 3.3, BH = 1.7, FLOOR = BH - 0.62, WALL = 2.35, RAMP_UP = Math.PI / 2 - 0.04, RAMP_DN = -0.22;
  const ramp = new THREE.Group(), prop = new THREE.Group();
  {
    const rnd = Math.random;
    // textures peintes (neutres, multipliées par la couleur du matériau) : tôle rivetée et rouillée, pont en planches, numéro de coque
    const mkTex = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); if (!g) return null; draw(g, w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) t.repeat.set(rep, rep); return t; };
    const steelT = mkTex(256, 256, (g, w, h) => {
      g.fillStyle = '#d4d4d4'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 3000; i++) { g.fillStyle = (rnd() < 0.5 ? 'rgba(0,0,0,' : 'rgba(255,255,255,') + rnd() * 0.07 + ')'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
      for (let i = 0; i < 16; i++) { g.fillStyle = 'rgba(95,55,28,' + (0.05 + rnd() * 0.1) + ')'; g.fillRect(rnd() * w, rnd() * h * 0.6, 1 + rnd() * 3, 30 + rnd() * 110); }
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2);
      for (let k = 0; k < 10; k++) for (const [rx, ry] of [[10 + k * 25.5, 9], [10 + k * 25.5, h - 9], [9, 10 + k * 25.5], [w - 9, 10 + k * 25.5]]) { g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(rx, ry, 2.3, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(rx - 0.7, ry - 0.7, 1.1, 0, 7); g.fill(); }
    }, 0.8);
    const woodT = mkTex(256, 256, (g, w, h) => {
      g.fillStyle = '#dcdcdc'; g.fillRect(0, 0, w, h);
      for (let p = 0; p < 8; p++) {
        const y = p * 32; g.fillStyle = 'rgba(0,0,0,' + rnd() * 0.12 + ')'; g.fillRect(0, y, w, 32);
        for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(0,0,0,' + rnd() * 0.14 + ')'; g.fillRect(rnd() * w, y + 2 + rnd() * 28, 12 + rnd() * 60, 1); }
        g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, y, w, 2); g.fillRect((p * 97) % w, y, 2, 32);
        g.fillStyle = 'rgba(0,0,0,0.5)'; for (const nx of [6, w - 6]) { g.beginPath(); g.arc(nx, y + 16, 1.6, 0, 7); g.fill(); }
      }
    }, 0.5);
    const numT = mkTex(256, 96, (g, w, h) => { g.clearRect(0, 0, w, h); g.font = 'bold 66px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(240,240,225,0.88)'; g.fillText('LCVP 18', w / 2, h / 2 + 3); for (let i = 0; i < 400; i++) g.clearRect(rnd() * w, rnd() * h, 2 + rnd() * 3, 1 + rnd() * 2); });
    if (numT) numT.wrapS = numT.wrapT = THREE.ClampToEdgeWrapping;
    const steelM = (c, o) => Mat(c, Object.assign({ map: steelT, roughness: 0.65 }, o || {}));
    const redM = steelM(0x7a3a2e), hullM = steelM(0x667662), wallM = steelM(0x5b6b56), capM = steelM(0x3d4a3a), armM = steelM(0x4f5c4a), darkM = Mat(0x1d2a33, { roughness: 0.3 }), blackM = Mat(0x1a1a1a, { roughness: 0.5, metalness: 0.5 });
    const deckM = Mat(0x8a7456, { map: woodT, roughness: 0.85, metalness: 0 });
    const box = (w, h, d, x, y, z, m, parent) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); (parent || barge).add(o); return o; };
    const cyl = (r, l, x, y, z, m, ax, parent, seg) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, seg || 10), m); o.position.set(x, y, z); if (ax === 'x') o.rotation.z = Math.PI / 2; else if (ax === 'z') o.rotation.x = Math.PI / 2; (parent || barge).add(o); return o; };
    // plan de la coque : bord droit sur 2/3 puis resserré vers la proue (ouverte : 2,6 m de large pour la rampe)
    const HALF = x => { const s = Math.min(1, Math.max(0, (x - 1.2) / 4.3)); return 1.3 + 0.35 * (1 - s * s * (3 - 2 * s)); };
    const edge = [[-BL / 2, 1.45]]; for (let i = 0; i <= 26; i++) { const x = -BL / 2 + 0.2 + (BL - 0.2) * i / 26; edge.push([x, HALF(x)]); }
    const outline = d => { const s = new THREE.Shape(); edge.forEach(([x, z], i) => i ? s.lineTo(x, z - d) : s.moveTo(x, z - d)); for (let i = edge.length - 1; i >= 0; i--) s.lineTo(edge[i][0], -(edge[i][1] - d)); s.closePath(); return s; };
    const strip = (sign, dOut, dIn) => { const s = new THREE.Shape(); edge.forEach(([x, z], i) => i ? s.lineTo(x, -sign * (z + dOut)) : s.moveTo(x, -sign * (z + dOut))); for (let i = edge.length - 1; i >= 0; i--) s.lineTo(edge[i][0], -sign * (edge[i][1] - dIn)); s.closePath(); return s; };   // le plan est dans XY, extrudé en hauteur : y du plan = −z du monde
    const extr = (shape, y0, y1, m, b) => { b = b || 0; const o = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: y1 - y0 - 2 * b, bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 2, curveSegments: 1 }), m); o.rotation.x = -Math.PI / 2; o.position.y = y0 + b; barge.add(o); return o; };
    // coque : œuvres vives rouges (anti-salissures), flancs, pont en planches, bordés
    extr(outline(0), -0.55, 0.18, redM, 0.03);
    extr(outline(0), 0.18, FLOOR - 0.04, hullM, 0.03);
    extr(outline(0.16), FLOOR - 0.04, FLOOR, deckM);
    for (const sg of [1, -1]) { extr(strip(sg, 0, 0.16), FLOOR - 0.04, WALL, wallM, 0.025); extr(strip(sg, 0.03, 0.19), WALL, WALL + 0.06, capM); }
    box(0.3, WALL - FLOOR, 2.9, -BL / 2 + 0.15, (FLOOR + WALL) / 2, 0, wallM);   // cloison arrière
    // membrures et lisses à l'intérieur de la cale
    for (const sg of [1, -1]) {
      box(6.1, 0.1, 0.07, -1.6, FLOOR + 0.62, sg * (1.65 - 0.2), capM);
      for (let x = -4.4; x <= 1.3; x += 1.2) box(0.1, WALL - FLOOR - 0.06, 0.1, x, (FLOOR + WALL) / 2, sg * (HALF(x) - 0.2), capM);
    }
    // bollards sur les bordés
    for (const x of [3.4, -1.0, -3.0]) for (const sg of [1, -1]) { const z = sg * (HALF(x) - 0.08); box(0.34, 0.05, 0.12, x, WALL + 0.085, z, blackM); cyl(0.04, 0.13, x - 0.1, WALL + 0.15, z, blackM); cyl(0.04, 0.13, x + 0.1, WALL + 0.15, z, blackM); }
    // numéro de coque sur les flancs
    if (numT) for (const sg of [1, -1]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.64), new THREE.MeshBasicMaterial({ map: numT, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); d.position.set(0.1, 1.7, sg * (1.65 + 0.04)); if (sg < 0) d.rotation.y = Math.PI; barge.add(d); }
    // poste du timonier : socle blindé à l'arrière, baquet ouvert, pare-brise incliné, siège, barre, antenne
    box(1.3, WALL - FLOOR, 1.5, -4.55, (FLOOR + WALL) / 2, 0, armM);
    box(0.06, 0.95, 1.5, -5.18, WALL + 0.47, 0, armM);
    for (const sg of [1, -1]) box(1.3, 0.95, 0.06, -4.55, WALL + 0.47, sg * 0.72, armM);
    const fp = box(0.06, 0.95, 1.5, -3.92, WALL + 0.47, 0, armM); fp.rotation.z = 0.12;
    const sl = box(0.02, 0.16, 1.2, -3.9, WALL + 0.68, 0, darkM); sl.rotation.z = 0.12;
    box(0.4, 0.3, 0.5, -4.7, WALL + 0.15, 0, Mat(0x2f372d));
    cyl(0.025, 0.4, -4.2, WALL + 0.25, 0, blackM); { const w = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 6, 16), blackM); w.position.set(-4.18, WALL + 0.5, 0); w.rotation.y = Math.PI / 2 - 0.5; barge.add(w); }
    cyl(0.012, 2.2, -5.12, WALL + 1.1, 0.6, blackM, null, null, 5);
    // deux mitrailleuses sur pivot (côtés), bouclier, caisse de munitions
    for (const sg of [1, -1]) {
      const gun = new THREE.Group(); gun.position.set(-2.9, WALL + 0.06, sg * 1.57);
      cyl(0.045, 0.5, 0, 0.25, 0, blackM, null, gun, 8);
      box(0.5, 0.1, 0.09, 0.12, 0.52, 0, blackM, gun);
      cyl(0.035, 0.4, 0.5, 0.52, 0, blackM, 'x', gun, 8); cyl(0.018, 0.4, 0.88, 0.52, 0, blackM, 'x', gun, 6);
      box(0.2, 0.14, 0.1, 0.0, 0.38, -sg * 0.13, capM, gun); box(0.12, 0.06, 0.05, -0.18, 0.45, 0, blackM, gun);
      box(0.02, 0.34, 0.5, 0.32, 0.6, 0, armM, gun);
      barge.add(gun);
    }
    // rampe articulée de proue : tôle, rails latéraux, nervures antidérapantes, charnière
    box(2.6, 0.1, 2.2, 1.3, 0, 0, steelM(0x4a5a46), ramp);
    for (const sg of [1, -1]) box(2.6, 0.16, 0.08, 1.3, 0.1, sg * 1.06, capM, ramp);
    for (let x = 0.3; x < 2.6; x += 0.3) box(0.06, 0.04, 1.96, x, 0.07, 0, blackM, ramp);
    cyl(0.07, 2.3, 0, 0, 0, blackM, 'z', ramp);
    ramp.position.set(BL / 2 - 0.05, FLOOR, 0); ramp.rotation.z = RAMP_UP; barge.add(ramp);   // rampe relevée = verticale
    // hélice (3 pales), safrans et aileron de quille à l'arrière (visibles à travers l'eau peu profonde)
    box(0.9, 0.12, 0.3, -4.6, -0.6, 0, redM); for (const sg of [1, -1]) box(0.3, 0.55, 0.05, -5.75, -0.28, sg * 0.55, redM);
    cyl(0.05, 0.3, 0, 0, 0, blackM, 'x', prop, 8);
    for (let i = 0; i < 3; i++) { const arm = new THREE.Group(); box(0.05, 0.4, 0.14, 0.02, 0.2, 0, blackM, arm); arm.rotation.x = i * Math.PI * 2 / 3; prop.add(arm); }
    prop.position.set(-5.75, -0.45, 0); barge.add(prop);
  }
  const wake = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'); let tex = null; if (g) { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(32, 0); g.lineTo(0, 256); g.lineTo(64, 256); g.closePath(); g.fill(); tex = new THREE.CanvasTexture(c); }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(10, 45), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 })); m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.PI / 2; m.renderOrder = 3; scene.add(m); return m; })();   // sillage
  scene.add(barge);
  // destroyer au mouillage au large (js/ship.js), bordée vers la plage
  const ship = buildDestroyer(scene); ship.root.position.set(330, 0, -210); scene.add(ship.root);
  // soldats dans la cale : corps, tête, casque
  const SOLD = 16, soldiers = [];
  { const bodyM = Mat(0x5d6244), skin = Mat(0xd9a982), helm = Mat(0x4c5238);
    for (let i = 0; i < SOLD; i++) {
      const g = new THREE.Group(), b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 1.0, 8), bodyM), hd = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), skin), hm = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), helm);
      b.position.y = 0.75; hd.position.y = 1.4; hm.position.y = 1.43; g.add(b, hd, hm); scene.add(g);
      soldiers.push({ g, col: i % 4, row: Math.floor(i / 4), state: 'hold', x: 0, z: 0, tx: 0, tz: 0, delay: i * 0.55 });
    } }
  // ---------- scénario de la barge : arrivée, échouage, rampe, débarquement, départ ----------
  const FWD = -1;   // la proue regarde vers −x (la plage)
  const bs = { x: 520, z: 0, phase: 'approach', t: 0, speed: 0, rampA: Math.PI / 2 - 0.04, yaw: 0 };
  const X_BEACH = 5.5 + 0.9 / SLOPE;   // centre de la barge quand la proue touche le fond (tirant d'eau 0,9 m)
  const holdPos = s => { const lx = -2.4 + s.row * 1.2, lz = (s.col - 1.5) * 0.62; return { x: bs.x - lx, z: bs.z - lz }; };
  function resetSoldiers() { for (const s of soldiers) { s.state = 'hold'; s.g.visible = true; s.t = 0; } }
  function stepBarge(dt) {
    bs.t += dt;
    if (bs.phase === 'approach') { bs.speed = Math.min(10, bs.speed + 2 * dt); bs.x -= bs.speed * dt; if (bs.x <= X_BEACH) { bs.x = X_BEACH; bs.speed = 0; bs.phase = 'beached'; bs.t = 0; } }
    else if (bs.phase === 'beached') { bs.rampA += ((-0.22 - bs.rampA) * Math.min(1, dt * 1.2)); if (bs.t > 4) { bs.phase = 'unload'; bs.t = 0; } }
    else if (bs.phase === 'unload') { if (bs.t > 20) { bs.phase = 'leave'; bs.t = 0; } }
    else if (bs.phase === 'leave') { bs.rampA += ((Math.PI / 2 - 0.04 - bs.rampA) * Math.min(1, dt * 1.5)); if (bs.t > 3) { bs.speed = Math.min(8, bs.speed + 1.5 * dt); bs.x += bs.speed * dt; } if (bs.x > 520) { bs.x = 520; bs.speed = 0; bs.phase = 'approach'; bs.t = 0; resetSoldiers(); } }
    // soldats : montent sur la rampe l'un après l'autre, traversent le bas-fond, s'arrêtent sur la plage
    for (const s of soldiers) {
      if (s.state === 'hold') { const p = holdPos(s); s.x = p.x; s.z = p.z; if (bs.phase === 'unload' && bs.t > s.delay) { s.state = 'walk'; s.tx = -16 - (s.row * 4) - (s.col % 2) * 2; s.tz = bs.z + (s.col - 1.5) * 5 + (s.row - 1.5) * 1.5; } }
      else if (s.state === 'walk') { const dx = s.tx - s.x, dz = s.tz - s.z, d = Math.hypot(dx, dz), v = (s.x > 8 ? 0.9 : 1.6) * dt; if (d < v) { s.x = s.tx; s.z = s.tz; s.state = 'stand'; } else { s.x += dx / d * v; s.z += dz / d * v; } }
    }
  }
  // ---------- caméra orbitale ----------
  const cam = { yaw: 2.35, pitch: 0.28, dist: 360, tgt: new THREE.Vector3(150, 4, 0), follow: false }, ptrs = new Map(); let pinch = 0;
  const place = () => { const cp = Math.cos(cam.pitch); camera.position.set(cam.tgt.x + cam.dist * cp * Math.cos(cam.yaw), Math.max(terrainH(cam.tgt.x, cam.tgt.z) + 1.5, cam.tgt.y + cam.dist * Math.sin(cam.pitch)), cam.tgt.z + cam.dist * cp * Math.sin(cam.yaw)); camera.lookAt(cam.tgt); };
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); pinch = 0; });
  canvas.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p[0], dy = e.clientY - p[1]; p[0] = e.clientX; p[1] = e.clientY;
    if (ptrs.size === 1) { cam.yaw -= dx * 0.005; cam.pitch = Math.max(0.02, Math.min(1.5, cam.pitch + dy * 0.005)); }
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) cam.dist = Math.max(4, Math.min(2500, cam.dist * pinch / d)); pinch = d; }
  });
  const up = e => { ptrs.delete(e.pointerId); pinch = 0; }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.max(4, Math.min(2500, cam.dist * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
  // boutons : vue d'ensemble, suivre la barge, vitesse du scénario
  let tscale = 1; const btn = id => document.getElementById(id);
  const setView = v => { cam.follow = v === 'barge' ? barge : v === 'ship' ? ship.root : null; if (v === 'barge') { cam.dist = 40; cam.pitch = 0.3; } else if (v === 'ship') { cam.dist = 150; cam.pitch = 0.2; } else { cam.dist = 420; cam.pitch = 0.3; cam.tgt.set(150, 4, 0); } for (const [id, k] of [['bOver', 'over'], ['bFollow', 'barge'], ['bShip', 'ship']]) btn(id).classList.toggle('on', (v || 'over') === k); };
  btn('bOver').onclick = () => setView(null); btn('bFollow').onclick = () => setView('barge'); btn('bShip').onclick = () => setView('ship');
  [['bS1', 1], ['bS3', 3], ['bS10', 10]].forEach(([id, v]) => { btn(id).onclick = () => { tscale = v; for (const [i2, v2] of [['bS1', 1], ['bS3', 3], ['bS10', 10]]) btn(i2).classList.toggle('on', v2 === v); }; });
  function resize() { const vv = window.visualViewport, w = Math.round(vv ? vv.width : innerWidth), h = Math.round(vv ? vv.height : innerHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); if (window.visualViewport) visualViewport.addEventListener('resize', resize); resize();
  let last = performance.now(), T = 0, infoT = 0;
  function frame(now) {
    const dtR = Math.min(0.1, (now - last) / 1000); last = now; T += dtR; const dt = dtR * tscale;
    waterMat.uniforms.uTime.value = T;
    stepBarge(dt); ship.update(T, dtR, waveH);
    // barge : flotte sur la houle (hauteurs en 4 points → tangage et roulis), posée sur le fond une fois échouée
    const hC = waveH(bs.x, bs.z, T), hB = waveH(bs.x - 5.2, bs.z, T), hS = waveH(bs.x + 5.2, bs.z, T), hP = waveH(bs.x, bs.z - 1.6, T), hSt = waveH(bs.x, bs.z + 1.6, T);
    const grounded = bs.phase === 'beached' || bs.phase === 'unload' || (bs.phase === 'leave' && bs.speed < 0.5);
    const pitch = grounded ? 0 : Math.atan2(hB - hS, 10.4), roll = grounded ? 0 : Math.atan2(hSt - hP, 3.2);
    barge.position.set(bs.x, (grounded ? 0 : hC) + 0.05, bs.z); barge.rotation.order = 'YZX'; barge.rotation.set(0, Math.PI, 0);
    barge.rotation.z = pitch; barge.rotation.x = roll; ramp.rotation.z = bs.rampA;
    ramp.scale.x = 0.5 + 0.5 * Math.min(1, Math.max(0, (RAMP_UP - bs.rampA) / (RAMP_UP - RAMP_DN)));   // relevée : affleure le bordé (1,3 m) ; abaissée : 2,6 m
    prop.rotation.x += Math.abs(bs.speed) * dt * 2;
    // sillage : derrière la barge (côté +x), visible quand elle avance
    wake.position.set(bs.x + 26, 0.12, bs.z); wake.material.opacity = Math.min(1, Math.abs(bs.speed) / 8) * 0.9;
    for (const s of soldiers) { const y = s.state === 'hold' ? (grounded ? 0 : hC) + BH - 0.62 : Math.max(terrainH(s.x, s.z), -0.2); s.g.position.set(s.x, y, s.z); s.g.rotation.y = s.state === 'stand' ? Math.PI / 2 : Math.PI / 2 + Math.sin(T * 6 + s.row) * 0.03; if (s.state === 'walk') s.g.position.y += Math.abs(Math.sin(T * 7 + s.row * 2 + s.col)) * 0.05; }
    if (cam.follow) cam.tgt.lerp(cam.follow.position, 1 - Math.exp(-dtR * 3));
    place(); renderer.render(scene, camera); requestAnimationFrame(frame);
    infoT -= dtR; if (infoT <= 0) { infoT = 0.3; const lab = { approach: 'la barge approche', beached: 'échouée, la rampe s’abaisse', unload: 'débarquement', leave: 'la barge repart' }[bs.phase]; info.textContent = 'zone 1 km × 1 km · ' + lab + ' · ' + Math.round(Math.max(0, bs.x - X_BEACH)) + ' m de la plage · ×' + tscale; }
  }
  requestAnimationFrame(frame);
})();
