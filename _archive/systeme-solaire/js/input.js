// Entrées : molette, glisser, pincement, clic, clavier.
// =====================================================================
//  ENTRÉES : zoom, glisser, pincement, clic
// =====================================================================
function clampLog(v) { return Math.max(Math.log(minViewR(focus)), Math.min(LOG_MAX, v)); }
canvas.addEventListener('wheel', e => { e.preventDefault(); stopReplay(); logTarget = clampLog(logTarget + e.deltaY * 0.0015); fadeHint(); }, { passive: false });
const ptrs = new Map(); let dragMoved = 0, pinch0 = 0, pinchLog0 = 0;
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); dragMoved = 0;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); pinchLog0 = logTarget; }
});
canvas.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return;
  const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0 > 0) { logTarget = clampLog(pinchLog0 - Math.log(d / pinch0)); logR = logTarget; } dragMoved = 99; return; }
  const dx = e.clientX - prev[0], dy = e.clientY - prev[1]; dragMoved += Math.abs(dx) + Math.abs(dy);
  if (dragMoved > 6) { stopReplay(); canvas.classList.add('drag'); const k = viewK(); pan[0] -= dx / k; pan[1] += dy / k; }
});
function endPtr(e) {
  const wasTap = ptrs.size === 1 && dragMoved <= 6;
  ptrs.delete(e.pointerId); canvas.classList.remove('drag'); pinch0 = 0;
  if (wasTap) { const t = pickAt(e.clientX, e.clientY); if (t === EARTHB && pickEarthAt(e.clientX, e.clientY)) return; activate(t); }   // clic sur la Terre suivie : pile au-dessus du pays
}
// ce qui est sous le pointeur : un repère de météorite, le texte d'une étiquette (= l'astre qu'elle nomme) ou un astre
function pickAt(x, y) {
  const pin = hits.find(h => h.pin && Math.hypot(h.x - x, h.y - y) <= h.r + 4);
  if (pin) return pin.b;
  for (let i = labelHits.length - 1; i >= 0; i--) { const l = labelHits[i]; if (x >= l.x0 && x <= l.x1 && y >= l.y0 && y <= l.y1) return l.ref; }
  let best = null, bd = 1e9;
  for (const h of hits) { if (h.pin) continue; const d = Math.hypot(h.x - x, h.y - y) - h.r; if (d < 6 && (d < bd || (d === bd && h.b.R < best.R))) { bd = d; best = h.b; } }
  return best;
}
function activate(t) { if (!t) return; if (t.star) selectStar(t); else if (t.lat !== undefined && t.type) selectMeteo(t); else focusOn(t); }
canvas.addEventListener('pointermove', e => { if (!ptrs.size) canvas.style.cursor = pickAt(e.clientX, e.clientY) ? 'pointer' : ''; });
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); pinch0 = 0; });
addEventListener('keydown', e => {
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if (e.key === ' ') { e.preventDefault(); playing = !playing; refreshTime(); }
  else if (e.key === '+' || e.key === '=') logTarget = clampLog(logTarget - 0.3);
  else if (e.key === '-') logTarget = clampLog(logTarget + 0.3);
  else if (e.key === 'Escape') focusOn(SUN, 'overview');
  else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { stopReplay(); simT += (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 30 : 1); }
});
