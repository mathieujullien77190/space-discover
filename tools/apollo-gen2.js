// Suite de apollo-gen.js : la mission complète (chargé après lui par make-apollo.js, même contexte).
// generateApollo(log, cache) → objet sérialisable : { th0, veh: { sivb, csm, lm, sm, cm }, ev: [...], burns, stats }.
// Instants en s depuis le décollage ; états ABSOLUS [t, x, y, vx, vy] (Terre au centre, repère inertiel du plan de la montée, mètres et m/s).
function generateApollo(log, cache) {
  log = log || (() => {});
  const sim = ascent(), k0 = phKepler(sim.state, TLI_T - sim.tEnd), sp0 = Math.hypot(k0.vx, k0.vy);
  const burnOf = dv => ({ x: k0.x, y: k0.y, vx: k0.vx * (1 + dv / sp0), vy: k0.vy * (1 + dv / sp0) });
  let tli = cache && cache.tli;
  if (!tli) {
    const seed = { dv: 3140, th0: 0.9607679449190535 }, ap = approach(burnOf(seed.dv), TLI_T, seed.th0, 30);
    const r = tliRefine(k0, { err: Math.abs(ap.minM - PERI_TARGET), dv: seed.dv, th0: seed.th0, ap }, log);
    tli = { dv: r.dv, th0: r.th0, tc: r.ap.tMin };
  }
  if (!(cache && cache.tli) && typeof __saveCache === 'function') __saveCache({ tli });
  const th0 = tli.th0, tc = tli.tc, stats = { tliDv: tli.dv };
  const V = { sivb: [], csm: [], lm: [], sm: [], cm: [] }, ev = [];
  const add = (t, key, label, veh, extra) => ev.push(Object.assign({ t: Math.round(t * 10) / 10, key, label, veh }, extra || {}));
  const recKepler2 = (arr, r0, t0, t1, step) => recKepler(arr, r0, t0, t1, step, th0);
  // --- orbite d'attente, TLI, vol vers la Lune ---
  for (let t = sim.tEnd; t < TLI_T; t += 60) V.csm.push(mkSample(t, phKepler(sim.state, t - sim.tEnd)));
  V.csm.push(mkSample(TLI_T, k0));
  const tb = burnOf(tli.dv);
  add(TLI_T, 'tli', 'Injection translunaire (TLI)', 'csm', { burn: 347, dv: tli.dv });
  const tSep = TLI_T + 1500;
  const rc = flyRec(V.csm, tb, TLI_T + 0.01, th0, { tMax: tc + 1, cap: 30, stop: (s, t) => (t >= tc - 1e-6 ? 'tc' : null) });
  let sSep = null;
  flyRec(null, tb, TLI_T + 0.01, th0, { tMax: tSep + 400, cap: 30, stop: (s, t) => (t >= tSep ? (sSep = { s: Object.assign({}, s), t }, 'sep') : null) });
  // S-IVB : même trajectoire avec une petite poussée de purge qui l'écarte de la Lune
  let bestS = null;
  for (const d of [-60, -30, 30, 60]) {
    const sp = Math.hypot(sSep.s.vx, sSep.s.vy), s2 = { x: sSep.s.x, y: sSep.s.y, vx: sSep.s.vx * (1 + d / sp), vy: sSep.s.vy * (1 + d / sp) };
    let minM = 1e18;
    flyRec(null, s2, sSep.t, th0, { tMax: tc + 5 * 3600, cap: 120, stop: (s, t) => { const m = moonAt(t, th0), r = Math.hypot(s.x - m.x, s.y - m.y); if (r < minM) minM = r; return Math.hypot(s.x, s.y) < RE ? 'earth' : r < RM ? 'moon' : null; } });
    if (minM > RM + 2000e3 && (!bestS || minM > bestS.minM)) bestS = { d, s2, minM };
  }
  if (bestS) { V.sivb.push(mkSample(sSep.t, sSep.s)); flyRec(V.sivb, bestS.s2, sSep.t + 0.5, th0, { tMax: tc + 5 * 3600, cap: 60, maxStep: 600 }); stats.sivbMissKm = Math.round(bestS.minM / 1e3); }
  add(tSep, 'sivbsep', 'Séparation du S-IVB, amarrage et extraction du LEM', 'csm', {});
  log('  vol translunaire : ' + V.csm.length + ' échantillons, S-IVB passe à ' + stats.sivbMissKm + ' km du centre de la Lune');
  // --- insertion en orbite lunaire ---
  const last = V.csm[V.csm.length - 1], tC = last[0], rel0 = relOf({ x: last[1], y: last[2], vx: last[3], vy: last[4] }, tC, th0);
  const rP = Math.hypot(rel0.x, rel0.y), rA1 = RM + 312e3, a1 = (rP + rA1) / 2, vP1 = Math.sqrt(MUM * (2 / rP - 1 / a1)), vHyp = Math.hypot(rel0.vx, rel0.vy);
  const rel1 = withSpeed(rel0, vP1); stats.loi1Dv = Math.round(vHyp - vP1); stats.periseleneKm = Math.round((rP - RM) / 1e3);
  add(tC, 'loi1', 'Insertion en orbite lunaire (LOI-1)', 'csm', { burn: 357, dv: vHyp - vP1, moon: true });
  const T1 = 2 * Math.PI * Math.sqrt(a1 ** 3 / MUM), tL2 = tC + 2 * T1, relL2p = phKepler(rel1, 2 * T1, MUM);
  const vC = Math.sqrt(MUM / Math.hypot(relL2p.x, relL2p.y)), relCirc = withSpeed(relL2p, vC), rC = Math.hypot(relCirc.x, relCirc.y);
  recKepler2(V.csm, rel1, tC + 30, tL2, 60);
  add(tL2, 'loi2', 'Circularisation à 110 km (LOI-2)', 'csm', { burn: 17, dv: Math.hypot(relL2p.vx, relL2p.vy) - vC, moon: true });
  const Tc = 2 * Math.PI * Math.sqrt(rC ** 3 / MUM), circ = t => phKepler(relCirc, t - tL2, MUM), thC = t => { const c = circ(t); return Math.atan2(c.y, c.x); };
  // --- descente du LEM : phasage et recherche (angle parcouru, durée) ---
  const tU = tL2 + 20 * 3600, rpD = RM + 15e3, aD = (rC + rpD) / 2, vApD = Math.sqrt(MUM * (2 / rC - 1 / aD)), Th = Math.PI * Math.sqrt(aD ** 3 / MUM);
  let best = null;
  for (let dphiDeg = 10; dphiDeg <= 40; dphiDeg += 1) for (let Tpd = 520; Tpd <= 1100; Tpd += 20) {
    const dphi = dphiDeg * DEGR; let tDOI = null, prev = null;
    for (let t = tU + 1800; t < tU + 1800 + Tc; t += 10) { const f = wrapPi(thC(t) + Math.PI + dphi - siteAngle(t + Th + Tpd, th0)); if (prev !== null && prev < 0 && f >= 0 && Math.abs(f - prev) < 1) { tDOI = t - 10 * f / (f - prev); break; } prev = f; }
    if (tDOI == null) continue;
    const relD = withSpeed(circ(tDOI), vApD), P = phKepler(relD, Th, MUM), tL = tDOI + Th + Tpd, al = siteAngle(tL, th0), pf = [RM * Math.cos(al), RM * Math.sin(al)], vf = [-nM * pf[1] - 3 * Math.cos(al), nM * pf[0] - 3 * Math.sin(al)];   /* touche le sol à 3 m/s */
    const d = descent([P.x, P.y], [P.vx, P.vy], pf, vf, Tpd, 0);
    if (globalThis.__dbg) __dbg(dphiDeg, Tpd, d);
    if (d.minAlt < 8 || d.maxThrottle > 1.0 || d.mEnd < LM.m0 - LM.prop + 100) continue;
    if (!best || d.used < best.d.used) best = { dphiDeg, Tpd, tDOI, relD, P, d, tL, pf, vf };
  }
  if (!best) throw new Error('descente : aucune solution faisable');
  log('  descente : ' + best.dphiDeg + '° parcourus, ' + best.Tpd + ' s, carburant ' + Math.round(best.d.used) + ' kg, poussée max ' + Math.round(best.d.maxThrottle * 100) + ' %, altitude mini ' + Math.round(best.d.minAlt) + ' m');
  stats.descent = { dphi: best.dphiDeg, T: best.Tpd, fuelKg: Math.round(best.d.used), maxThrottle: +best.d.maxThrottle.toFixed(2) };
  const tDOI = best.tDOI, tPDI = tDOI + Th, tL = best.tL;
  add(tU, 'undock', 'Séparation du LEM « Eagle » et du CSM « Columbia »', 'csm', {});
  add(tDOI, 'doi', 'Manœuvre de descente (DOI) : périgée abaissé à 15 km', 'lm', { burn: 30, dv: vC - vApD, moon: true });
  add(tPDI, 'pdi', 'Début de la descente motorisée (PDI)', 'lm', { burn: best.Tpd, moon: true });
  const dd = descent([best.P.x, best.P.y], [best.P.vx, best.P.vy], best.pf, best.vf, best.Tpd, 2), lmBurn = [];
  recKepler2(V.lm, best.relD, tDOI, tPDI, 60);
  for (const p of dd.pts) { V.lm.push(mkSample(tPDI + p.t, absOf(p, tPDI + p.t, th0))); lmBurn.push([Math.round((tPDI + p.t) * 10) / 10, rnd2(p.ax), rnd2(p.ay), Math.round(p.m), Math.round(p.F)]); }
  add(tL, 'land', 'Alunissage dans la Mer de la Tranquillité', 'lm', { site: 'tranquility', moon: true });
  stats.descentMassEnd = Math.round(dd.mEnd);
  // --- séjour en surface, puis remontée (calculée une fois dans le repère local : site à l'angle 0) ---
  const surf = t => { const al = siteAngle(t, th0); return absOf({ x: RM * Math.cos(al), y: RM * Math.sin(al), vx: -nM * RM * Math.sin(al), vy: nM * RM * Math.cos(al) }, t, th0); };
  let asc = null;
  for (const hT of [12e3, 16e3, 20e3, 25e3, 30e3, 40e3]) { const a = ascentLM(hT); if (a.out && a.ok && (!asc || Math.abs(a.rp - (RM + 17e3)) < Math.abs(asc.rp - (RM + 17e3)))) asc = a; }
  if (!asc) throw new Error('remontée du LEM : orbite non atteinte');
  log('  remontée : ' + Math.round(asc.t) + ' s, orbite ' + Math.round((asc.rp - RM) / 1e3) + ' × ' + Math.round((asc.ra - RM) / 1e3) + ' km');
  const tAsc = asc.t, dthA = Math.atan2(asc.state.y, asc.state.x);
  let tLift = null, bestE = 1e9;   // le LEM doit se retrouver ~12° derrière le CSM à l'insertion
  for (let t = tL + 21.6 * 3600; t < tL + 21.6 * 3600 + Tc; t += 5) { const e = wrapPi(thC(t + tAsc) - (siteAngle(t, th0) + dthA) - 12 * DEGR); if (Math.abs(e) < bestE) { bestE = Math.abs(e); tLift = t; } }
  const alL = siteAngle(tLift, th0), toAbs = (p, t) => { const [x, y] = rotXY(p.x, p.y, alL), [vx, vy] = rotXY(p.vx, p.vy, alL); return absOf({ x, y, vx, vy }, t, th0); };
  for (let t = tL + 30; t < tLift - 1; t += 1800) V.lm.push(mkSample(t, surf(t)));
  V.lm.push(mkSample(tLift, surf(tLift)));
  add(tL + 6.65 * 3600, 'step', 'Armstrong pose le pied sur la Lune (« un petit pas… »)', 'lm', { site: 'tranquility', moon: true });
  add(tL + 9.2 * 3600, 'eva', 'Fin de la sortie lunaire : retour dans le LEM', 'lm', { site: 'tranquility', moon: true });
  add(tLift, 'lift', 'Décollage de l’étage de remontée du LEM', 'lm', { burn: tAsc, moon: true, site: 'tranquility' });
  const lmAsc = [];
  for (const p of asc.out) { V.lm.push(mkSample(tLift + p.t, toAbs(p, tLift + p.t))); const [tx, ty] = rotXY(p.tx, p.ty, alL); lmAsc.push([Math.round((tLift + p.t) * 10) / 10, rnd2(tx), rnd2(ty), Math.round(p.m), Math.round(p.F)]); }
  const tIns = tLift + tAsc, relIns = (() => { const [x, y] = rotXY(asc.state.x, asc.state.y, alL), [vx, vy] = rotXY(asc.state.vx, asc.state.vy, alL); return { x, y, vx, vy }; })();
  add(tIns, 'ins', 'LEM en orbite lunaire (≈ 17 × 85 km)', 'lm', { moon: true });
  // --- rendez-vous : fondu lisse vers le CSM pendant 30 min (approche finale scriptée) ---
  let tB = null, bestD = 1e18;
  for (let t = tIns + 3600; t < tIns + 3600 + 8 * 3600; t += 20) { const A = phKepler(relIns, t - tIns, MUM), C = circ(t), d = Math.hypot(A.x - C.x, A.y - C.y); if (d < bestD) { bestD = d; tB = t; } }
  const tD = tB + 1800; stats.rendezvousStartKm = Math.round(bestD / 1e3);
  recKepler2(V.lm, relIns, tIns + 20, tB, 60);
  for (let t = tB; t <= tD + 1e-6; t += 30) {
    const A = phKepler(relIns, t - tIns, MUM), C = circ(t), u = (t - tB) / 1800, w = smoothW(u), dw = dsmoothW(u) / 1800;
    V.lm.push(mkSample(t, absOf({ x: A.x + w * (C.x - A.x), y: A.y + w * (C.y - A.y), vx: A.vx + dw * (C.x - A.x) + w * (C.vx - A.vx), vy: A.vy + dw * (C.y - A.y) + w * (C.vy - A.vy) }, t, th0)));
  }
  add(tB, 'rdv', 'Rendez-vous avec le CSM (approche finale)', 'lm', { moon: true });
  add(tD, 'dock', 'Amarrage du LEM au CSM', 'csm', { moon: true });
  const tJ = tD + 1.4 * 3600; add(tJ, 'lmjett', 'Largage de l’étage de remontée du LEM', 'csm', { moon: true });
  { const cj = circ(tJ); recKepler2(V.lm, withSpeed(cj, Math.hypot(cj.vx, cj.vy) - 1), tJ, tJ + 6 * 3600, 120); }
  // --- retour : recherche de l'instant et du Δv de la TEI ---
  const tTWin = tD + 7 * 3600, EI = RE + 121.92e3, PERI_RET = RE + (typeof __peri === "number" ? __peri : 60) * 1e3;
  const tryTEI = (tT, dv, cap) => { const c = circ(tT); return approachEarth(absOf(withSpeed(c, Math.hypot(c.vx, c.vy) + dv), tT, th0), tT, th0, cap); };
  let bt = null;
  for (let tT = tTWin; tT < tTWin + Tc; tT += 60) for (let dv = 800; dv <= 1200; dv += 25) { const ap = tryTEI(tT, dv, 300); if (!ap.state || ap.minE > 4e7) continue; const err = Math.abs(ap.minE - PERI_RET); if (!bt || err < bt.err) bt = { err, tT, dv, ap }; }
  if (!bt) throw new Error('TEI : aucun retour trouvé');
  log('  TEI (grille) : écart ' + Math.round(bt.err / 1e3) + ' km, Δv ' + bt.dv + ' m/s');
  for (const [dts, dvs, n] of [[10, 5, 6], [1, 0.5, 8], [0.1, 0.05, 6]]) { const c = bt; for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) { const tT = c.tT + i * dts, dv = c.dv + j * dvs, ap = tryTEI(tT, dv, 60); if (!ap.state || ap.minE > 4e7) continue; const err = Math.abs(ap.minE - PERI_RET); if (err < bt.err) bt = { err, tT, dv, ap }; } }
  log('  TEI affiné : écart ' + Math.round(bt.err) + ' m, Δv ' + bt.dv.toFixed(2) + ' m/s, périgée ' + Math.round((bt.ap.minE - RE) / 1e3) + ' km');
  const tT = bt.tT; stats.tei = { dv: +bt.dv.toFixed(1), perigeeKm: Math.round((bt.ap.minE - RE) / 1e3) };
  recKepler2(V.csm, relCirc, tL2 + 30, tT, 90);   // le CSM reste sur son orbite circulaire jusqu’à la TEI
  add(tT, 'tei', 'Injection transterrestre (TEI)', 'csm', { burn: 150, dv: bt.dv, moon: true });
  const cT = circ(tT), sT = absOf(withSpeed(cT, Math.hypot(cT.vx, cT.vy) + bt.dv), tT, th0);
  let tEI = null;
  flyRec(null, sT, tT + 0.01, th0, { tMax: tT + 6 * 86400, cap: 30, stop: (s, t) => { if (Math.hypot(s.x, s.y) <= EI) { tEI = t; return 'ei'; } return null; } });
  if (tEI == null) throw new Error('retour : pas d’entrée dans l’atmosphère');
  let tSM = null, sSM = null;
  flyRec(V.csm, sT, tT + 0.01, th0, { tMax: tEI, cap: 30, stop: (s, t) => { if (t >= tEI - 900) { tSM = t; sSM = Object.assign({}, s); return 'sm'; } return null; } });
  add(tSM, 'smsep', 'Largage du module de service (SM)', 'csm', {});
  // --- rentrée : moteur de traînée générique (Body) ; parachutes en changeant le CdA ---
  const cm = new Body({ name: 'Module de commande', dry: 5560, prop: 0, shape: { type: 'sphere', r: 1.95 }, cdA: 1.25 * Math.PI * 1.95 * 1.95 }, { x: sSM.x, y: sSM.y, vx: sSM.vx, vy: sSM.vy, t: tSM }, { wEff: 0, mode: 'tumble' });
  let chute = 0;
  const rEnt = cm.propagate({ tMax: 5000, sampleDt: 1, stop: b => { const alt = Math.hypot(b.x, b.y) - RE; if (alt < 7300 && chute === 0) { chute = 1; b.cdA = 50; add(b.t, 'drogue', 'Parachutes stabilisateurs', 'cm', {}); } if (alt < 3000 && chute === 1) { chute = 2; b.cdA = 1030; add(b.t, 'main', 'Grands parachutes', 'cm', {}); } return null; } });
  let gMax = 0, tG = 0, tEI2 = null, vEI = 0;
  for (let i = 0; i < rEnt.samples.length; i++) { const b = rEnt.samples[i]; if (tEI2 == null && b.alt <= 121.92e3) { tEI2 = b.t; vEI = b.v; } if (i) { const a = rEnt.samples[i - 1], g = Math.hypot(b.vx - a.vx, b.vy - a.vy) / G0A; if (g > gMax && b.alt < 100e3) { gMax = g; tG = b.t; } } V.cm.push(mkSample(b.t, b)); }
  add(tEI2 || tEI, 'ei', 'Entrée dans l’atmosphère (122 km, ≈ ' + Math.round(vEI / 100) / 10 + ' km/s)', 'cm', {});
  add(tG, 'gmax', 'Pic de décélération (≈ ' + gMax.toFixed(1).replace('.', ',') + ' g)', 'cm', {});
  const tEnd = rEnt.samples[rEnt.samples.length - 1].t; add(tEnd, 'splash', 'Amerrissage', 'cm', {});
  stats.entry = { gMax: +gMax.toFixed(1), end: rEnt.end.reason, vEI: Math.round(vEI), duration: Math.round(tEnd - (tEI2 || tEI)) };
  // module de service : Body sans parachute, se désintègre
  const nv = Math.hypot(sSM.vx, sSM.vy), sm = new Body({ name: 'Module de service', dry: 4000, prop: 0, shape: { type: 'cyl', r: 1.95, h: 7.5 } }, { x: sSM.x, y: sSM.y, vx: sSM.vx - 1.5 * sSM.vx / nv, vy: sSM.vy - 1.5 * sSM.vy / nv, t: tSM }, { wEff: 0, mode: 'tumble' });
  for (const s of sm.propagate({ tMax: 3000, sampleDt: 2, burnupAlt: 75e3 }).samples) V.sm.push(mkSample(s.t, s));
  ev.sort((a, b) => a.t - b.t);
  return { th0, tc: tC, tEnd, tliT: TLI_T, tliDv: tli.dv, MUM, RM, DM, nM, lonSite: LON_SITE, veh: V, ev, burns: { lmDescent: lmBurn, lmAscent: lmAsc }, stats, cache: { tli } };
}
