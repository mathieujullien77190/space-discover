// L'ÉCLAT DU SOLEIL (demande de l'utilisateur : « le Soleil, on le voit presque pas sur notre modèle, alors que dans la vraie vie on le voit de ouf ») : quand le Soleil est dans le champ,
// un grand éblouissement l'entoure, comme sur les photos de la station : cœur blanc, halo bleuté, aigrettes en étoile. Image dessinée une fois (canvas), posée sur un sprite additif qui regarde la caméra,
// toujours dessiné par-dessus la scène ; il s'éteint quand la Terre cache le Soleil (avec un peu de fuite au bord, comme un lever de soleil) et rétrécit quand on s'éloigne du Soleil.
import * as THREE from 'three';

export const GLARE_SIZE = 512;          // côté de l'image (pixels)
export const GLARE_PX = 900;            // côté du sprite à l'écran à 1 UA (pixels) : le halo remplit une bonne part de l'écran
export const AU_UNITS = 23455;          // 1 UA en unités de la scène (rayons terrestres)
export const SUN_HIDE_UNITS = 4000;     // plus près que ça du Soleil (on est « dedans ») : pas d'éblouissement
export const GLARE_OPACITY = 0.7;       // luminosité de l'éclat (moins lumineux qu'avant, MÊME taille)
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
  // traînées DIFFUSES (pas de triangles nets) : chaque traînée est une ellipse très allongée remplie d'un dégradé radial (opaque au centre, transparente au bord), donc douce dans la longueur ET dans la largeur ;
  // 6 ellipses tournées de 30° = 12 traînées de part et d'autre du centre, de longueurs différentes ; plus un voile large très faible
  const streaks = [[0, 0.98, 0.12, 0.3], [30, 0.6, 0.11, 0.2], [60, 0.78, 0.11, 0.24], [90, 0.98, 0.12, 0.3], [120, 0.6, 0.11, 0.2], [150, 0.78, 0.11, 0.24]];
  for (const [deg, len, wid, alpha] of streaks) {
    g.save(); g.translate(c, c); g.rotate(deg * Math.PI / 180); g.scale(c * len, c * wid);
    const sg = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    sg.addColorStop(0, 'rgba(255,255,255,' + alpha + ')'); sg.addColorStop(0.18, 'rgba(235,240,255,' + alpha * 0.55 + ')'); sg.addColorStop(0.55, 'rgba(170,190,255,' + alpha * 0.16 + ')'); sg.addColorStop(1, 'rgba(120,140,255,0)');
    g.fillStyle = sg; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore();
  }
  const veil = g.createRadialGradient(c, c, 0, c, c, c * 0.8);
  veil.addColorStop(0, 'rgba(255,250,240,0.22)'); veil.addColorStop(0.3, 'rgba(200,215,255,0.08)'); veil.addColorStop(1, 'rgba(120,140,255,0)');
  g.fillStyle = veil; g.fillRect(0, 0, size, size);
  g.globalCompositeOperation = 'source-over';
}

// taille du sprite (pixels) selon la distance au Soleil (unités de la scène) : pleine à 1 UA, plus petite au loin (racine de la distance, au moins GLARE_MIN_SCALE), nulle dans le Soleil
export const glarePixels = dist => (dist < SUN_HIDE_UNITS ? 0 : GLARE_PX * Math.max(GLARE_MIN_SCALE, Math.min(1, Math.sqrt(AU_UNITS / dist))));

export function createSunGlare(scene) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = GLARE_SIZE; paintGlare(canvas.getContext('2d'), GLARE_SIZE);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, transparent: true, fog: false });
  const sprite = new THREE.Sprite(mat); sprite.renderOrder = 50; sprite.frustumCulled = false; sprite.visible = false; scene.add(sprite);
  const dir = new THREE.Vector3();
  return {
    sprite,
    // sunPos : position du Soleil dans le monde (même repère que la caméra) ; width / height : écran ; renvoie 1 (affiché) ou 0
    update({ camera, sunPos, height, tint = 0 }) {   // tint : 0 (blanc) à 1 (rouge-orangé du coucher)
      dir.copy(sunPos).sub(camera.position); const d = dir.length(), px = glarePixels(d);
      if (!(d > 0) || px === 0) { sprite.visible = false; return 0; }
      dir.divideScalar(d);
      const R = camera.far * 0.45, pxAng = 2 * Math.tan(camera.fov * Math.PI / 360) / height;   // même distance que les étoiles ; taille monde d'un pixel à cette distance = R · pxAng
      sprite.position.copy(camera.position).addScaledVector(dir, R); sprite.scale.setScalar(R * pxAng * px);
      mat.opacity = GLARE_OPACITY; mat.color.setRGB(1, 1 - 0.45 * tint, 1 - 0.75 * tint); sprite.visible = true; return 1;
    },
    dispose() { scene.remove(sprite); tex.dispose(); mat.dispose(); },
  };
}
