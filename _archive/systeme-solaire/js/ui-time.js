// Interface : barre du temps (lecture, vitesses, curseur de date).
// temps
const dateEl = document.getElementById('date'), playBtn = document.getElementById('play'), speedsEl = document.getElementById('speeds');
const SPEEDS = [['◀ 1 an/s', -365.256], ['Temps réel', 1 / 86400], ['×3', 3 / 86400], ['1 h/s', 1 / 24], ['1 j/s', 1], ['1 mois/s', 30.44], ['1 an/s', 365.256], ['10 ans/s', 3652.56]];
const speedBtns = [];
SPEEDS.forEach(([label, v]) => { const b = mkBtn(label, false, () => { stopReplay(); speed = v; playing = true; refreshTime(); }); speedsEl.append(b); speedBtns.push([b, v]); });
playBtn.addEventListener('click', () => { playing = !playing; refreshTime(); });
document.getElementById('v1replay').addEventListener('click', () => startReplay(V1));
document.getElementById('now').addEventListener('click', () => { stopReplay(); simT = (Date.now() - J2000) / DAYMS; speed = 1 / 86400; playing = true; refreshTime(); });
function refreshTime() { playBtn.textContent = playing ? '❚❚' : '▶'; speedBtns.forEach(([b, v]) => b.classList.toggle('on', playing && v === speed)); }
refreshTime();
// curseur de date : indépendant de la vitesse (la vitesse continue de faire avancer la date à partir de l'endroit choisi)
const sliderEl = document.getElementById('slider'), pickEl = document.getElementById('datepick');
const SL_MIN = dayOf(Date.UTC(1900, 0, 1, 12)), SL_MAX = dayOf(Date.UTC(2100, 11, 31, 12));
sliderEl.min = SL_MIN; sliderEl.max = SL_MAX; sliderEl.step = 'any';
let sliding = false;
sliderEl.addEventListener('pointerdown', () => { sliding = true; });
addEventListener('pointerup', () => { sliding = false; }); addEventListener('pointercancel', () => { sliding = false; });
sliderEl.addEventListener('input', () => { stopReplay(); simT = +sliderEl.value; });
pickEl.addEventListener('change', () => { const ms = Date.parse(pickEl.value + 'T12:00:00Z'); if (!isNaN(ms)) { stopReplay(); simT = dayOf(ms); } });
function updateDate() {
  const d = new Date(J2000 + simT * DAYMS);
  dateEl.textContent = speed < 1 ? d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!sliding) sliderEl.value = simT;
  if (document.activeElement !== pickEl) { const iso = d.toISOString().slice(0, 10); if (pickEl.value !== iso) pickEl.value = iso; }
}
