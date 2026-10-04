// Destroyer américain type Fletcher (115 m × 12 m, tirant d'eau 4,3 m), modèle procédural détaillé : coque loftée par sections, pont en planches, bordés et filières,
// passerelle vitrée, directeur de tir, mât avec radars qui tournent, 2 cheminées qui fument, 5 pièces de 127 mm, tubes lance-torpilles, Bofors et Oerlikon, canots sur bossoirs,
// radeaux Carley, grenades sous-marines, pavillon qui flotte, écume autour de la coque. Repère local : x = vers la proue, y = haut (flottaison à y = 0), z = bâbord (+z).
// Utilisation : const ship = buildDestroyer(scene); ship.root.position.set(...); puis ship.update(T, dt, waveH) à chaque image.
(function () {
  window.buildDestroyer = function (scene) {
    const rnd = Math.random, L = 115, HB = 6.05, STA = 64, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const root = new THREE.Group(), body = new THREE.Group(), foamG = new THREE.Group(); root.add(body, foamG);
    // ---------- matériaux et textures peintes ----------
    const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7, metalness: 0.2 }, o || {}));
    const mkTex = (w, h, draw, rx, ry, clampE) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); if (!g) return null; draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.wrapS = t.wrapT = clampE ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping; if (rx) t.repeat.set(rx, ry || rx); return t; };
    const plateT = mkTex(256, 256, (g, w, h) => {   // tôles de bordé : virures horizontales, couples verticaux, rivets, coulures de rouille
      g.fillStyle = '#d9d9d9'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4000; i++) { g.fillStyle = (rnd() < 0.5 ? 'rgba(0,0,0,' : 'rgba(255,255,255,') + rnd() * 0.06 + ')'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 2); }
      for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(100,60,30,' + (0.04 + rnd() * 0.09) + ')'; g.fillRect(rnd() * w, rnd() * h * 0.7, 1 + rnd() * 2, 20 + rnd() * 120); }
      g.fillStyle = 'rgba(0,0,0,0.38)'; for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 2); g.fillRect(0, 0, 2, h); g.fillRect(w / 2, 0, 1, h);
      for (let y = 6; y < h; y += 64) for (let x = 6; x < w; x += 12) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x, y, 2, 2); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y - 1, 1, 1); }
    });
    const deckT = mkTex(256, 256, (g, w, h) => {   // pont en planches
      g.fillStyle = '#d6d6d6'; g.fillRect(0, 0, w, h);
      for (let p = 0; p < 16; p++) { const y = p * 16; g.fillStyle = 'rgba(0,0,0,' + rnd() * 0.12 + ')'; g.fillRect(0, y, w, 16); for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(0,0,0,' + rnd() * 0.12 + ')'; g.fillRect(rnd() * w, y + 1 + rnd() * 14, 8 + rnd() * 50, 1); } g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, y, w, 1); g.fillRect((p * 71) % w, y, 1, 16); }
    });
    const winT = mkTex(256, 64, (g, w, h) => {   // vitrage de la timonerie
      g.fillStyle = '#9aa0a4'; g.fillRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6f94ad'); gr.addColorStop(1, '#10222e'); g.fillStyle = gr; g.fillRect(0, 12, w, h - 24);
      g.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(i * 44 + 10, 12); g.lineTo(i * 44 + 24, 12); g.lineTo(i * 44 + 8, h - 12); g.lineTo(i * 44 - 6, h - 12); g.fill(); }
      g.fillStyle = '#80888e'; for (let i = 0; i <= 6; i++) g.fillRect(i * 42.6 - 2, 0, 5, h);
    }, 0, 0, true);
    const flagT = mkTex(190, 100, (g, w, h) => {   // pavillon américain
      for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#f2f2f2' : '#b22234'; g.fillRect(0, i * h / 13, w, h / 13 + 1); }
      g.fillStyle = '#3c3b6e'; g.fillRect(0, 0, w * 0.4, h * 7 / 13); g.fillStyle = '#fff'; for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) g.fillRect(6 + c * 12, 6 + r * 13, 3, 3);
    }, 0, 0, true);
    const numT = mkTex(256, 96, (g, w, h) => { g.clearRect(0, 0, w, h); g.font = 'bold 84px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(245,245,238,0.95)'; g.fillText('445', w / 2, h / 2 + 4); }, 0, 0, true);
    const puffT = mkTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 0, 0, true);
    const GRAY = 0x848c92, hullM = M(GRAY, { map: plateT, roughness: 0.6 }), redM = M(0x6f2f25, { map: plateT, roughness: 0.7 }), bootM = M(0x2a2a2c, { map: plateT }), deckM = M(0x565b5e, { map: deckT, roughness: 0.85, metalness: 0.05 });
    const darkM = M(0x16191c, { roughness: 0.5 }), blackM = M(0x151515, { roughness: 0.45, metalness: 0.5 }), supM = M(0x8a9298, { map: plateT, roughness: 0.62 }), supDM = M(0x6e757a, { map: plateT, roughness: 0.65 }), woodM = M(0x7a6a50, { map: deckT, roughness: 0.9, metalness: 0 });
    const glassM = M(0xffffff, { map: winT, roughness: 0.25, metalness: 0.3 }), orangeM = M(0xb8572f, { roughness: 0.8, metalness: 0 }), whiteM = M(0xe9e9e2, { roughness: 0.7, metalness: 0 }), brassM = M(0x9a7b3a, { roughness: 0.4, metalness: 0.7 });
    const add = (o, x, y, z, p) => { o.position.set(x, y, z); (p || body).add(o); return o; };
    const bx = (w, h, d, x, y, z, m, p) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m || supM), x, y, z, p);
    const cy = (r, l, x, y, z, m, ax, p, seg, r2) => { const o = add(new THREE.Mesh(new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, l, seg || 12), m || supM), x, y, z, p); if (ax === 'x') o.rotation.z = Math.PI / 2; else if (ax === 'z') o.rotation.x = Math.PI / 2; return o; };
    // ---------- coque loftée : sections (couples) le long de la quille, largeur selon la hauteur ----------
    const bf = t => Math.max(0, (t - 0.55) / 0.45);
    const Bwl = t => { if (t > 0.55) return HB * Math.pow(1 - Math.pow(bf(t), 1.8), 0.75); if (t < 0.12) { const k = (0.12 - t) / 0.12; return HB * (0.62 + 0.38 * Math.sqrt(Math.max(0, 1 - k * k))); } return HB; };   // demi-largeur à la flottaison : arrière à tableau arrondi, étrave effilée
    const keel = t => -4.3 + 3.0 * Math.pow(Math.max(0, (t - 0.78) / 0.22), 2) + 1.2 * Math.pow(Math.max(0, (0.12 - t) / 0.12), 1.5);
    const deck = t => 3.9 + 3.4 * Math.pow(Math.max(0, (t - 0.5) / 0.5), 2.2) + 0.4 * Math.pow(Math.max(0, (0.25 - t) / 0.25), 2);   // livre du pont : relevé à l'avant et un peu à l'arrière
    const W = (t, y) => { const k = keel(t), d = deck(t); if (y >= 0) return Bwl(t) * (1 + (0.05 + 0.3 * bf(t) * bf(t)) * y / d); return Bwl(t) * Math.pow(Math.sin(clamp((y - k) / -k, 0, 1) * Math.PI / 2), 0.5); };
    const xAt = (t, y) => -L / 2 + t * L + 3.5 * Math.pow(bf(t), 3) * clamp((y - keel(t)) / (deck(t) - keel(t)), 0, 1);   // étrave élancée (lancée vers l'avant en haut)
    const tOf = i => 0.5 - 0.5 * Math.cos(Math.PI * i / STA), tX = X => clamp((X + L / 2) / L, 0, 1), dk = X => deck(tX(X));
    const loft = (rowsFn, R, mat) => {
      const pos = [], uv = [], idx = [];
      for (const sg of [1, -1]) {
        const base = pos.length / 3;
        for (let i = 0; i <= STA; i++) { const t = tOf(i), ys = rowsFn(t); for (let j = 0; j < R; j++) { const y = ys[j], x = xAt(t, y); pos.push(x, y, sg * W(t, y)); uv.push(x * 0.18, y * 0.45); } }
        for (let i = 0; i < STA; i++) for (let j = 0; j < R - 1; j++) { const a = base + i * R + j, b = a + 1, c = a + R, d = c + 1; if (sg > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }
      }
      const cb = pos.length / 3, ys0 = rowsFn(0);   // tableau arrière
      for (let j = 0; j < R; j++) { const y = ys0[j], x = xAt(0, y), w = W(0, y); pos.push(x, y, w, x, y, -w); uv.push(w * 0.18, y * 0.45, -w * 0.18, y * 0.45); }
      for (let j = 0; j < R - 1; j++) { const a = cb + 2 * j, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const m = mat.clone(); m.side = THREE.DoubleSide; return add(new THREE.Mesh(g, m), 0, 0, 0);
    };
    loft(t => { const k = keel(t); return Array.from({ length: 14 }, (_, j) => k * (1 - Math.pow(j / 13, 0.7))); }, 14, redM);   // œuvres vives rouges
    loft(() => [0, 0.6], 2, bootM);   // ceinture de flottaison noire
    loft(t => { const d = deck(t); return Array.from({ length: 7 }, (_, j) => 0.6 + (d - 0.6) * j / 6); }, 7, hullM);   // muraille gris « haze gray »
    { const pos = [], uv = [], idx = [];   // pont : bombé, planches
      for (let i = 0; i <= STA; i++) { const t = tOf(i), yd = deck(t), x = xAt(t, yd), w = W(t, yd); for (const [z, dy] of [[-w, 0], [0, 0.12], [w, 0]]) { pos.push(x, yd + dy, z); uv.push(x / 4, z / 4); } }
      for (let i = 0; i < STA; i++) for (let c = 0; c < 2; c++) { const a = i * 3 + c, b = a + 1, e = a + 3, f = e + 1; idx.push(a, b, e, b, f, e); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); const m = deckM.clone(); m.side = THREE.DoubleSide; add(new THREE.Mesh(g, m), 0, 0, 0); }
    // pavois plein à l'avant (étrave), filières (lisses + chandeliers) sur le reste du bord
    const edgePts = (sg, tA, tB, dy, inset, n) => Array.from({ length: n + 1 }, (_, k) => { const t = tA + (tB - tA) * k / n, yd = deck(t); return new THREE.Vector3(xAt(t, yd), yd + dy, sg * (W(t, yd) - inset)); });
    for (const sg of [1, -1]) {
      const lo = edgePts(sg, 0.76, 0.995, 0, 0.04, 14), hi = edgePts(sg, 0.76, 0.995, 1.15, 0.04, 14), pos = [], idx = [];
      lo.forEach((p, k) => { pos.push(p.x, p.y, p.z, hi[k].x, hi[k].y, hi[k].z); if (k) { const a = 2 * (k - 1); idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); const bm = hullM.clone(); bm.map = null; bm.side = THREE.DoubleSide; add(new THREE.Mesh(g, bm), 0, 0, 0);
      for (const [dy, r] of [[1.12, 0.03], [0.58, 0.018]]) add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgePts(sg, 0.015, 0.76, dy, 0.05, 30)), 60, r, 4, false), supM), 0, 0, 0);
      add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hi), 28, 0.04, 5, false), supM), 0, 0, 0);
    }
    { const st = edgePts(1, 0.015, 0.76, 0.5, 0.05, 40).concat(edgePts(-1, 0.015, 0.76, 0.5, 0.05, 40)), im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 4), supM, st.length), o = new THREE.Object3D();   // chandeliers
      st.forEach((p, k) => { o.position.copy(p); o.updateMatrix(); im.setMatrixAt(k, o.matrix); }); body.add(im); }
    { const pts = [], ro = new THREE.Object3D();   // hublots le long de la muraille
      for (const sg of [1, -1]) for (let X = -36; X <= 24; X += 3.2) { const t = tX(X), y = deck(t) - 1.5; pts.push([xAt(t, y), y, sg * (W(t, y) + 0.03), sg]); }
      const im = new THREE.InstancedMesh(new THREE.CircleGeometry(0.2, 10), darkM, pts.length); pts.forEach((p, k) => { ro.position.set(p[0], p[1], p[2]); ro.rotation.set(0, p[3] > 0 ? 0 : Math.PI, 0); ro.updateMatrix(); im.setMatrixAt(k, ro.matrix); }); body.add(im); }
    if (numT) for (const sg of [1, -1]) {   // numéro de coque sur la muraille, posé sur la surface (normale par différences finies)
      const X = 33, t = tX(X), y = deck(t) - 2.0, e = 0.05, dwx = (W(t + e / L, y) - W(t - e / L, y)) / (2 * e), dwy = (W(t, y + e) - W(t, y - e)) / (2 * e);
      const n = new THREE.Vector3(-dwx, -dwy, sg).normalize();
      const d = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.65), new THREE.MeshBasicMaterial({ map: numT, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); d.position.set(xAt(t, y), y, sg * (W(t, y) + 0.04)); body.add(d); }
    // ---------- superstructure ----------
    const D0 = dk(0);
    // château : bloc passerelle, timonerie vitrée, plate-forme de veille, directeur de tir, mât
    bx(13, 3.1, 8.6, 11, D0 + 1.55, 0, supM); bx(11, 0.35, 9.2, 10.5, D0 + 3.25, 0, supDM);
    { const m = [glassM, glassM, supDM, supDM, glassM, glassM], wh = new THREE.Mesh(new THREE.BoxGeometry(9.6, 2.7, 7.6), m); add(wh, 11, D0 + 4.7, 0); }
    bx(11.5, 0.3, 8.4, 11, D0 + 6.2, 0, supDM);
    for (const sg of [1, -1]) bx(11.5, 0.9, 0.08, 11, D0 + 6.8, sg * 4.15, supM);
    bx(0.08, 0.9, 8.4, 5.3, D0 + 6.8, 0, supM);   // pare-éclats de la passerelle de veille
    bx(0.08, 0.9, 8.4, 16.7, D0 + 6.8, 0, supM);
    for (const sg of [1, -1]) { bx(5, 0.25, 1.6, 12, D0 + 4.0, sg * 4.9, supDM); bx(5, 0.8, 0.07, 12, D0 + 4.5, sg * 5.65, supM); }   // ailerons de passerelle
    cy(0.55, 1.2, 14.5, D0 + 7.0, 0, supM, null, null, 12); cy(0.4, 0.15, 14.5, D0 + 7.7, 0, brassM, null, null, 12);   // compas magnétique
    cy(1.6, 1.5, 9.2, D0 + 7.15, 0, supM, null, null, 16);   // socle du directeur Mk 37
    { const dir = new THREE.Group(); bx(3.0, 1.5, 2.4, 0, 0.75, 0, supM, dir); bx(2.6, 0.3, 2.0, 0, 1.65, 0, supDM, dir); for (const sg of [1, -1]) { cy(0.17, 3.3, 0.2, 1.0, sg * 1.5, blackM, 'x', dir, 8); bx(0.5, 0.5, 0.4, 1.7, 1.0, sg * 1.5, blackM, dir); }
      bx(0.1, 0.35, 0.9, 1.52, 1.1, 0, glassM, dir); add(dir, 9.2, D0 + 7.9, 0); dir.rotation.y = -Math.PI / 2; }
    cy(0.24, 13.5, 6.4, D0 + 13.0, 0, supM, null, null, 10, 0.16);   // mât-pylône
    cy(0.1, 9.0, 6.4, D0 + 14.2, 0, supM, 'z', null, 8);   // vergue de signaux
    const radar = new THREE.Group(); {   // radar de veille aérienne SC « sommier » : cadre + fils, tourne
      for (let i = 0; i < 9; i++) bx(0.05, 0.03, 4.4, 0.08, -1.1 + i * 0.275, 0, supM, radar); for (let i = 0; i < 12; i++) bx(0.05, 2.3, 0.03, 0.08, 0, -2.0 + i * 0.36, supM, radar);
      for (const sg of [1, -1]) bx(0.12, 2.5, 0.08, 0, 0, sg * 2.3, supM, radar); for (const sy of [1, -1]) bx(0.12, 0.08, 4.6, 0, sy * 1.25, 0, supM, radar); cy(0.1, 0.9, 0, -1.6, 0, supM, null, radar, 8);
      add(radar, 6.4, D0 + 21.2, 0); }
    const sg2 = new THREE.Group(); { const dish = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), supM); dish.rotation.x = Math.PI / 2; dish.scale.set(1, 1, 0.5); dish.position.x = 0.4; sg2.add(dish); cy(0.12, 1.0, 0, -0.6, 0, supM, null, sg2, 8); sg2.scale.set(0.6, 0.6, 0.6); add(sg2, 6.4, D0 + 15.4, 0); }
    // cheminées elliptiques inclinées, bague noire, tuyau de vapeur
    const tops = [];
    for (const fx of [-5.5, -24.5]) { const f = new THREE.Group(); const sh = cy(1, 7.6, 0, 3.8, 0, supM, null, f, 20); sh.scale.set(1.9, 1, 1.5); const cap = cy(1.01, 1.4, 0, 7.0, 0, M(0x161616), null, f, 20); cap.scale.set(1.9, 1, 1.5); const rim = cy(0.9, 0.12, 0, 7.72, 0, blackM, null, f, 20); rim.scale.set(1.8, 1, 1.35);
      cy(0.12, 5.5, -2.1, 3.0, 0.4, supDM, null, f, 8); bx(4.6, 0.7, 3.6, 0, 0.35, 0, supDM, f); f.rotation.z = 0.1; add(f, fx, dk(fx), 0); const top = new THREE.Object3D(); top.position.set(0, 7.9, 0); f.add(top); tops.push(top); }
    // canons de 127 mm sous masque : socle, masque à profil, volée, manchon
    const gun5 = (X, lift) => { const g = new THREE.Group(); g.position.set(X, dk(X) + (lift || 0), 0); if (lift) bx(4.2, lift, 4.2, 0, -lift / 2, 0, supDM, g);
      cy(1.6, 0.7, 0, 0.35, 0, supDM, null, g, 16); const tur = new THREE.Group(); g.add(tur); const pr = new THREE.Shape(); [[-1.7, 0], [1.5, 0], [1.5, 1.5], [0.8, 2.25], [-1.2, 2.25], [-1.75, 1.6]].forEach((p, i) => i ? pr.lineTo(p[0], p[1]) : pr.moveTo(p[0], p[1])); pr.closePath();
      const sh = new THREE.Mesh(new THREE.ExtrudeGeometry(pr, { depth: 2.6, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 }), supM); sh.position.set(0, 0.7, -1.3); tur.add(sh);
      bx(0.08, 0.7, 0.95, 1.6, 1.85, 0, darkM, tur); const pv = new THREE.Group(); pv.position.set(1.4, 1.85, 0); pv.rotation.z = 0.3; tur.add(pv); cy(0.2, 1.6, 0.9, 0, 0, supDM, 'x', pv, 10); cy(0.12, 4.6, 2.6, 0, 0, blackM, 'x', pv, 8); cy(0.16, 0.25, 4.85, 0, 0, blackM, 'x', pv, 8);
      tur.rotation.y = -Math.PI / 2; body.add(g); return g; };   // pièces pointées vers la plage (côté +z)
    gun5(34); gun5(24, 1.3); gun5(-40); gun5(-47.5, 1.3); gun5(-52);
    // lance-torpilles quintuples (2 tubes au-dessus de 3), bossoirs et canots
    for (const X of [-12, -19]) { const g = new THREE.Group(), b = cy(1.2, 0.5, 0, 0.25, 0, supDM, null, g, 14); for (let k = 0; k < 5; k++) { const row = k < 3, z = row ? (k - 1) * 0.58 : (k - 3.5) * 0.58; cy(0.27, 6.4, 0, 1.15 + (row ? 0 : 0.5), z, supM, 'x', g, 12); cy(0.29, 0.25, 3.2, 1.15 + (row ? 0 : 0.5), z, blackM, 'x', g, 12); } bx(0.15, 1.6, 2.0, 1.4, 1.35, 0, supDM, g); bx(0.15, 1.6, 2.0, -1.4, 1.35, 0, supDM, g); add(g, X, dk(X), 0); }
    const boatShape = (hw, hl) => { const s = new THREE.Shape(); s.moveTo(-hl, -hw * 0.8); s.lineTo(-hl + 0.4, -hw); s.quadraticCurveTo(hl * 0.35, -hw * 1.05, hl, 0); s.quadraticCurveTo(hl * 0.35, hw * 1.05, -hl + 0.4, hw); s.lineTo(-hl, hw * 0.8); s.closePath(); return s; };
    for (const sg of [1, -1]) { const X = -9, yd = dk(X), zc = sg * 3.9, g = new THREE.Group(); const hl = new THREE.Mesh(new THREE.ExtrudeGeometry(boatShape(1.05, 3.6), { depth: 0.9, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 }), M(0xd9d9d0, { roughness: 0.6 })); hl.rotation.x = -Math.PI / 2; g.add(hl);
      const inn = new THREE.Mesh(new THREE.ExtrudeGeometry(boatShape(0.9, 3.4), { depth: 0.05, bevelEnabled: false }), M(0x6b5a3f, { roughness: 0.9 })); inn.rotation.x = -Math.PI / 2; inn.position.y = 0.95; g.add(inn);
      bx(0.1, 0.12, 1.9, 0.3, 0.45, 0, woodM, g); bx(0.1, 0.12, 1.9, -1.2, 0.45, 0, woodM, g); add(g, X + 0.4, yd + 2.15, zc);
      for (const dx of [-2.2, 2.4]) { bx(0.12, 2.9, 0.12, X + dx, yd + 1.5, zc + sg * 0.95, supDM); cy(0.05, 1.0, X + dx, yd + 3.0, zc + sg * 0.45, supDM, 'z'); } }
    // tourelleaux antiaériens : Bofors 40 mm quadruples (tub, plateau, 4 tubes) et Oerlikon 20 mm
    const bofors = (X, h) => { const g = new THREE.Group(); cy(1.7, 1.0, 0, 0.5, 0, supDM, null, g, 18); cy(0.5, 0.8, 0, 1.0, 0, blackM, null, g, 10);
      const tur = new THREE.Group(); tur.position.set(0, 1.4, 0); g.add(tur); for (const [yy, zz] of [[0.45, 0.28], [0.45, -0.28], [0.95, 0.28], [0.95, -0.28]]) { cy(0.07, 2.6, 1.4, yy, zz, blackM, 'x', tur, 6); cy(0.1, 0.4, 2.7, yy, zz, blackM, 'x', tur, 6); } bx(1.2, 1.2, 1.4, 0, 0.6, 0, blackM, tur); bx(0.06, 1.1, 1.4, 0.7, 0.9, 0, supDM, tur); tur.rotation.y = -Math.PI / 2; add(g, X, dk(X) + h, 0); };
    bofors(-31, 3.2); bofors(-2, 2.2);
    const oerl = (X, Z, y) => { const g = new THREE.Group(); cy(0.04, 1.0, 0, 0.5, 0, blackM, null, g, 5); cy(0.03, 1.4, 0.6, 1.05, 0, blackM, 'x', g, 5); bx(0.04, 0.45, 0.6, 0.35, 1.2, 0, supDM, g); bx(0.4, 0.14, 0.14, 0.05, 1.0, 0, blackM, g); g.rotation.y = -Math.PI / 2; add(g, X, y, Z); };
    for (const sg of [1, -1]) { oerl(13, sg * 4.6, D0 + 4.0); oerl(-36, sg * 4.3, dk(-36)); oerl(-27, sg * 4.6, dk(-27)); }
    // château arrière, descente, cabestan, treuil d'ancre, ventilateurs en champignon, radeaux Carley, grenades sous-marines
    bx(8.5, 2.9, 7.4, -33, dk(-33) + 1.45, 0, supM); bx(7.5, 0.3, 6.4, -33, dk(-33) + 3.05, 0, supDM); bx(3.2, 2.2, 5.0, -2, dk(-2) + 1.1, 0, supM);
    cy(0.55, 1.0, 44, dk(44) + 0.5, 0, blackM, null, null, 10); cy(0.7, 0.2, 44, dk(44) + 1.05, 0, supDM, null, null, 10); cy(0.45, 0.8, 38, dk(38) + 0.4, 1.4, supDM, 'z', null, 8); cy(0.45, 0.8, 38, dk(38) + 0.4, -1.4, supDM, 'z', null, 8);
    for (const [X, Z] of [[-10, 2.4], [-10, -2.4], [-27, 3.0], [-27, -3.0], [3, 4.0], [3, -4.0], [-44, 3.3], [-44, -3.3]]) { const y = dk(X), g = new THREE.Group(); cy(0.2, 1.0, 0, 0.5, 0, supDM, null, g, 10); const bell = cy(0.5, 0.55, 0.3, 1.2, 0, supDM, null, g, 12, 0.14); bell.rotation.z = -0.9; add(g, X, y, Z); }
    for (const sg of [1, -1]) for (const X of [14, 7, -18, -28]) { const y = dk(X), z = sg * (W(tX(X), y) - 0.9), c = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.13, 8, 20), orangeM); c.rotation.x = Math.PI / 2; c.scale.set(1.5, 1, 1); c.position.set(X, y + 0.2, z); body.add(c); bx(1.6, 0.04, 0.8, X, y + 0.21, z, M(0xd9c9a0, { roughness: 1, metalness: 0 })); }
    for (const sg of [1, -1]) { bx(2.8, 0.1, 0.12, -56.0, dk(-56) + 0.25, sg * 2.2, blackM); for (let k = 0; k < 4; k++) cy(0.3, 0.95, -57.0 + k * 0.65, dk(-56) + 0.6, sg * 2.2, M(0x4a5a46), 'z', null, 10); }
    // drapeaux : pavillon arrière qui flotte, guidon d'étrave, antennes
    cy(0.04, 3.2, -56.5, dk(-56.5) + 1.6, 0, supM, null, null, 5); cy(0.03, 2.2, 56.5, dk(56.5) + 1.1 + 0.4, 0, supM, null, null, 5);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4, 10, 4), new THREE.MeshBasicMaterial({ map: flagT, color: flagT ? 0xffffff : 0xb22234, side: THREE.DoubleSide })); flag.position.set(-57.9, dk(-56.5) + 2.6, 0); flag.rotation.y = Math.PI / 2; body.add(flag); const fp0 = Float32Array.from(flag.geometry.attributes.position.array);
    for (const [X, Z, H] of [[2, 4.0, 6], [14, -4.0, 5]]) cy(0.015, H, X, D0 + 6.4 + H / 2, Z, blackM, null, null, 4);
    // écume autour de la coque (anneau à la flottaison, alpha qui s'estompe)
    { const inner = [], outer = [], put = (a, x, z) => a.push([x, z]); for (let i = 0; i <= STA; i++) { const t = tOf(i), x = xAt(t, 0), w = W(t, 0); put(inner, x, w); put(outer, x - (i === 0 ? 0.8 : 0), w + 1.5); }
      put(inner, xAt(1, 0), 0); put(outer, xAt(1, 0) + 2.4, 0); for (let i = STA; i >= 0; i--) { const t = tOf(i), x = xAt(t, 0), w = W(t, 0); put(inner, x, -w); put(outer, x - (i === 0 ? 0.8 : 0), -w - 1.5); }
      const pos = [], col = [], idx = []; inner.forEach((p, k) => { pos.push(p[0], 0, p[1], outer[k][0], 0, outer[k][1]); col.push(1, 1, 1, 0.75, 1, 1, 1, 0); if (k) { const a = 2 * (k - 1); idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); g.setIndex(idx);
      const foam = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide })); foam.renderOrder = 3; foamG.add(foam); }
    // fumée : sprites qui montent, grossissent et s'estompent, emportés par le vent
    const smoke = [], wind = new THREE.Vector3(3.5, 1.6, 0.6), tmp = new THREE.Vector3();
    tops.forEach((top, fi) => { for (let k = 0; k < 16; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffT, color: 0x3d3d3d, transparent: true, depthWrite: false, opacity: 0 })); sp.renderOrder = 4; scene.add(sp); smoke.push({ sp, top, age: k / 16 * 9, life: 9 }); } });
    // ---------- animation ----------
    const v0 = new THREE.Vector3();
    function update(T, dt, waveH) {
      const sx = root.position.x, sz = root.position.z;
      root.rotation.y = -Math.PI / 2 + Math.sin(T * 0.07) * 0.03;   // proue vers +z, bordée +z (bâbord) face à la plage ; légère dérive sur l'ancre
      const hC = waveH(sx, sz, T), hB = waveH(sx, sz + 42, T), hS = waveH(sx, sz - 42, T), hP = waveH(sx - 5.5, sz, T), hN = waveH(sx + 5.5, sz, T);
      body.position.y = hC * 0.7; body.rotation.set(Math.atan2(hN - hP, 11) * 0.6, 0, Math.atan2(hB - hS, 84) * 0.6); foamG.position.y = hC * 0.85 + 0.05;
      radar.rotation.y += 1.5 * dt; sg2.rotation.y -= 3.0 * dt;
      for (let k = 0; k < flag.geometry.attributes.position.count; k++) { const x0 = fp0[3 * k], p = flag.geometry.attributes.position; p.setZ(k, fp0[3 * k + 2] + Math.sin(x0 * 2.4 - T * 6) * 0.12 * (x0 + 1.3) / 2.6); } flag.geometry.attributes.position.needsUpdate = true;
      root.updateMatrixWorld(true);
      for (const s of smoke) { s.age += dt; if (s.age > s.life) { s.age -= s.life; s.top.getWorldPosition(tmp); s.sp.position.copy(tmp).add(v0.set((rnd() - 0.5) * 0.8, 0, (rnd() - 0.5) * 0.8)); s.x0 = s.sp.position.x; s.y0 = s.sp.position.y; s.z0 = s.sp.position.z; s.drift = 0.7 + rnd() * 0.6; }
        if (s.x0 === undefined) { s.top.getWorldPosition(tmp); s.x0 = tmp.x; s.y0 = tmp.y; s.z0 = tmp.z; s.drift = 1; }
        const a = s.age / s.life; s.sp.position.set(s.x0 + wind.x * s.age * s.drift, s.y0 + wind.y * s.age + 2 * a, s.z0 + wind.z * s.age); const sc = 2.5 + 15 * a; s.sp.scale.set(sc, sc, 1); s.sp.material.opacity = Math.min(1, a * 12) * (1 - a) * 0.55; }
    }
    return { root, update, body };
  };
})();
