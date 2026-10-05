// Occultation d'un astre par un autre vu de la caméra : un astre n'est pas affiché (maillage, point, nom, orbite) s'il passe DERRIÈRE un autre astre.
// Fonction PURE (tableaux [x, y, z], mêmes unités) : l'astre cible est caché si, vu de la caméra, il se trouve plus loin qu'un occulteur ET que son disque ENTIER (rayon `targetR`) tient dans celui de l'occulteur
// (disque d'au moins `minAng` radians : un astre dessiné comme un point cache aussi ce qui est exactement derrière lui ; un gros astre n'est jamais caché par un petit point).
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = a => Math.hypot(a[0], a[1], a[2]);

// others : [{ p: [x, y, z], r: rayon, id? }] ; renvoie l'id (ou true) du premier occulteur, ou null
export function occludedBy(cam, target, others, minAng = 0, targetR = 0) {
  const vt = sub(target, cam), dt = len(vt);
  if (!(dt > 0)) return null;
  const tAng = dt > targetR ? Math.asin(Math.min(1, targetR / dt)) : Math.PI / 2;   // rayon angulaire de la cible
  for (const o of others) {
    const vo = sub(o.p, cam), d = len(vo);
    if (!(d > 0) || d >= dt || d <= o.r) continue;   // pas plus près que la cible, ou la caméra est dans l'occulteur
    const cos = (vt[0] * vo[0] + vt[1] * vo[1] + vt[2] * vo[2]) / (dt * d), ang = Math.acos(Math.max(-1, Math.min(1, cos))), rad = Math.max(Math.asin(Math.min(1, o.r / d)), minAng);
    if (ang + tAng < rad) return o.id === undefined ? true : o.id;
  }
  return null;
}
