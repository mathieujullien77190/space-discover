// L'ÉCLAT DU SOLEIL (demande de l'utilisateur : « le Soleil, on le voit presque pas sur notre modèle, alors que dans la vraie vie on le voit de ouf ») : quand le Soleil est dans le champ,
// un grand éblouissement l'entoure, comme sur les photos de la station : cœur blanc, halo bleuté, aigrettes en étoile. Image dessinée une fois (canvas), posée sur un sprite additif qui regarde la caméra,
// toujours dessiné par-dessus la scène ; il s'éteint quand la Terre cache le Soleil (avec un peu de fuite au bord, comme un lever de soleil) et rétrécit quand on s'éloigne du Soleil.
import * as THREE from 'three';

export const GLARE_SIZE = 512;          // côté de l'image (pixels)
export const GLARE_PX = 900;            // côté du sprite à l'écran à 1 UA (pixels) : le halo remplit une bonne part de l'écran
export const AU_UNITS = 23455;          // 1 UA en unités de la scène (rayons terrestres)
export const SUN_HIDE_UNITS = 4000;     // plus près que ça du Soleil (on est « dedans ») : pas d'éblouissement
export const GLARE_MIN_SCALE = 0.18;    // facteur de taille minimal (très loin du Soleil)

// dessine l'éblouissement sur un contexte 2D carré de côté `size`
export function paintGlare(g, size) {
  const c = size / 2;
  g.clearRect(0, 0, size, size);
  const halo = g.createRadialGradient(c, c, 0, c, c, c);
  halo.addColorStop(0, 'rgba(255,255,255,1)'); halo.addColorStop(0.025, 'rgba(255,255,250,1)'); halo.addColorStop(0.07, 'rgba(255,246,222,0.8)');
  halo.addColorStop(0.16, 'rgba(180,196,255,0.32)'); halo.addColorStop(0.38, 'rgba(110,124,255,0.11)'); halo.addColorStop(1, 'rgba(60,70,200,0)');
  g.fillStyle = halo; g.fillRect(0, 0, size, size);
  g.globalCompositeOperation = 'lighter';
  // aigrettes : 12 rayons effilés (les 4 principaux plus longs), du centre vers le bord, qui s'éteignent
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6 + (k % 3 === 0 ? 0 : 0.0), len = c * (k % 3 === 0 ? 0.98 : k % 3 === 1 ? 0.62 : 0.78), w = k % 3 === 0 ? 3.2 : 1.8, dx = Math.cos(a), dy = Math.sin(a);
    const lg = g.createLinearGradient(c, c, c + dx * len, c + dy * len);
    lg.addColorStop(0, 'rgba(255,255,255,0.95)'); lg.addColorStop(0.25, 'rgba(255,250,240,0.45)'); lg.addColorStop(1, 'rgba(200,215,255,0)');
    g.fillStyle = lg; g.beginPath();   // triangle très fin : large au centre (w), pointe au bout
    g.moveTo(c - dy * w, c + dx * w); g.lineTo(c + dx * len, c + dy * len); g.lineTo(c + dy * w, c - dx * w); g.closePath(); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
}

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// opacité de l'éblouissement : sep = écart angulaire (rad) entre le Soleil et le centre de la Terre vus de la caméra, angEarth = rayon angulaire de la Terre
// nulle si le Soleil est derrière le disque de la Terre, pleine un peu au-delà du bord (un peu de fuite au limbe : le lever de soleil éblouit avant d'apparaître)
export const glareOpacity = (sep, angEarth) => smooth(angEarth * 0.9, angEarth * 1.05, sep);

// taille du sprite (pixels) selon la distance au Soleil (unités de la scène) : pleine à 1 UA, plus petite au loin (racine de la distance, au moins GLARE_MIN_SCALE), nulle dans le Soleil
export const glarePixels = dist => (dist < SUN_HIDE_UNITS ? 0 : GLARE_PX * Math.max(GLARE_MIN_SCALE, Math.min(1, Math.sqrt(AU_UNITS / dist))));

export function createSunGlare(scene) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = GLARE_SIZE; paintGlare(canvas.getContext('2d'), GLARE_SIZE);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, fog: false });
  const sprite = new THREE.Sprite(mat); sprite.renderOrder = 50; sprite.frustumCulled = false; sprite.visible = false; scene.add(sprite);
  const dir = new THREE.Vector3(), ec = new THREE.Vector3();
  return {
    sprite,
    // sunPos : position du Soleil dans le monde (même repère que la caméra) ; earthCenter : centre de la Terre ; width / height : écran ; renvoie l'opacité appliquée (0 = caché)
    update({ camera, sunPos, earthCenter, height }) {
      dir.copy(sunPos).sub(camera.position); const d = dir.length(), px = glarePixels(d);
      if (!(d > 0) || px === 0) { sprite.visible = false; return 0; }
      dir.divideScalar(d);
      let op = 1;
      if (earthCenter) { ec.copy(earthCenter).sub(camera.position); const de = ec.length(); if (de > 1) { ec.divideScalar(de); op = glareOpacity(Math.acos(Math.max(-1, Math.min(1, ec.dot(dir)))), Math.asin(1 / de)); } }
      if (op <= 0.002) { sprite.visible = false; return 0; }
      const R = camera.far * 0.45, pxAng = 2 * Math.tan(camera.fov * Math.PI / 360) / height;   // même distance que les étoiles ; taille monde d'un pixel à cette distance = R · pxAng
      sprite.position.copy(camera.position).addScaledVector(dir, R); sprite.scale.setScalar(R * pxAng * px);
      mat.opacity = op; sprite.visible = true; return op;
    },
    dispose() { scene.remove(sprite); tex.dispose(); mat.dispose(); },
  };
}
