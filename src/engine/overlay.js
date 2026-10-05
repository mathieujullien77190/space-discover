// Étiquettes 3D (noms d'étapes, composants, ISS, cotes…) : de simples <div> positionnés à chaque image par le moteur dans un conteneur fourni par l'application.
// Le moteur possède leur style (feuille injectée ici) : pas de dépendance aux CSS de l'interface React.
const CSS = `.eng-l3d{position:fixed;left:0;top:0;padding:1px 6px;font:600 12px system-ui,sans-serif;color:#4fd8ff;background:rgba(0,0,0,.55);border-radius:4px;pointer-events:none;text-shadow:0 1px 2px #000;white-space:nowrap;display:none}
.eng-l3d.evl{color:#9fd8ff}.eng-l3d.evl.done{color:#8fe58f}
.eng-l3d.tag{color:#ffe9a8;background:rgba(60,40,0,.6);pointer-events:auto;cursor:pointer}.eng-l3d.tag:hover{background:rgba(120,80,0,.8)}.eng-l3d.tag.follow{outline:2px solid #ffd54a}
.eng-l3d.iss{color:#ffd54a;background:rgba(0,0,0,.45)}
.eng-l3d.const{color:#9fc4ff;background:none;font-weight:400;font-style:italic;text-shadow:0 0 4px #000,0 1px 3px #000;text-align:center}
.eng-l3d.cap{color:#fff;background:rgba(0,0,0,.35);font-weight:500;padding:0 4px;line-height:18px}`;

export const createOverlay = (container) => {
  const style = document.createElement('style'); style.textContent = CSS; container.appendChild(style);
  const els = new Set();
  const label = (text, kind = '') => { const el = document.createElement('div'); el.className = 'eng-l3d' + (kind ? ' ' + kind : ''); el.textContent = text; container.appendChild(el); els.add(el); return el; };
  const remove = el => { els.delete(el); el.remove(); };
  const dispose = () => { els.forEach(e => e.remove()); els.clear(); style.remove(); };
  return { label, remove, dispose };
};
