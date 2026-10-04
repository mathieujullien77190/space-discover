// Positions de tous les astres à une date : indices, tableau `pos`, `computePositions(t)`.
{ let n = BODIES.length; for (const p of PROBES) p.idx = n++; for (const c of COMETS) c.idx = n++; }
const pos = new Array(BODIES.length + PROBES.length + COMETS.length);
function computePositions(t) {
  pos[0] = [0, 0];
  for (const p of PLANETS) { pos[p.idx] = planetPos(p, t); p.E = planetPos.E; }
  for (const m of MOONS) { const pp = pos[m.parent.idx], th = moonAngle(m, t); m.th = th; pos[m.idx] = [pp[0] + m.a * Math.cos(th), pp[1] + m.a * Math.sin(th)]; }
  for (const p of PROBES) { p.pos3 = probePos3(p, t, true); pos[p.idx] = [p.pos3[0], p.pos3[1]]; }
  for (const c of COMETS) { const b = cometPos3(c, t - 1); c.pos3 = cometPos3(c, t, true); pos[c.idx] = [c.pos3[0], c.pos3[1]]; c.vel = [c.pos3[0] - b[0], c.pos3[1] - b[1]]; }
}
