// RENTRÉE ATMOSPHÉRIQUE : un objet qui plonge à grande vitesse dans l'atmosphère s'échauffe (flux de chaleur ∝ ρ·v³, loi d'Allen-Eggers), SE DÉSINTÈGRE (son modèle 3D perd des morceaux : « polygones » retirés par blocs) et s'illumine
// (boule de plasma, traînée, lumière intense). Tout le calcul physique est PUR (testable) ; l'effet visuel (`createReentry`) s'applique à n'importe quel groupe three.js sans toucher à sa géométrie :
// le shader des matériaux écarte les fragments dont le BLOC (cellule cubique du repère du modèle, hachée) est « brûlé », avec un liseré incandescent à la frontière — le modèle s'érode donc morceau par morceau.
import * as THREE from 'three';

export const EARTH_ATMOSPHERE = { rho0: 1.225, scaleLowKm: 7.2, knee: 100, scaleHighKm: 15 };   // masse volumique de l'air (kg/m³) : exponentielle de hauteur d'échelle 7,2 km jusqu'à 100 km, puis 15 km
export const airDensity = (altKm, atm = EARTH_ATMOSPHERE) => {
  const h = Math.max(0, altKm);
  return h <= atm.knee ? atm.rho0 * Math.exp(-h / atm.scaleLowKm) : atm.rho0 * Math.exp(-atm.knee / atm.scaleLowKm) * Math.exp(-(h - atm.knee) / atm.scaleHighKm);
};
// flux de chaleur relatif q = ρ v³ (v en m/s), et intensité normalisée 0–1 (échelle logarithmique entre l'air à 110 km et l'air à 60 km à 7,6 km/s)
export const heatFlux = (altKm, speedKmS, atm = EARTH_ATMOSPHERE) => airDensity(altKm, atm) * Math.pow(speedKmS * 1000, 3);
const Q_MIN = heatFlux(110, 7.6), Q_MAX = heatFlux(60, 7.6);
export const heatIntensity = (altKm, speedKmS, atm = EARTH_ATMOSPHERE) => {
  const q = heatFlux(altKm, speedKmS, atm); if (q <= Q_MIN) return 0;
  return Math.max(0, Math.min(1, Math.log(q / Q_MIN) / Math.log(Q_MAX / Q_MIN)));
};
// la fraction brûlée (0 = intact, 1 = détruit) augmente de BURN_RATE·intensité² par seconde (+ un chauffage de fond) : l'ISS lancée de 120 km à 7,6 km/s est détruite en une quarantaine de secondes
export const BURN_BASE = 0.004, BURN_RATE = 0.06;
export const burnStep = (burn, heat, dt) => Math.min(1, burn + dt * (BURN_BASE * (heat > 0 ? 1 : 0) + BURN_RATE * heat * heat));

// trajectoire de rentrée mise en scène : l'altitude baisse de alt0 à 0 en DURATION_S secondes (loi quadratique : lente en haut, rapide en bas) ; la vitesse reste orbitale au-dessus de 90 km puis chute avec le freinage
export const DURATION_S = 90;
export const reentryAltitude = (alt0Km, t) => alt0Km * Math.pow(Math.max(0, 1 - t / DURATION_S), 2);
export const reentrySpeed = (speed0KmS, altKm) => altKm >= 90 ? speed0KmS : speed0KmS * (1 - 0.88 * Math.pow(1 - altKm / 90, 1.4));

// ---------- effet visuel ----------
const VERT_PARS = 'varying vec3 vReL;\nuniform mat4 uReInv;\n';
const FRAG_PARS = `varying vec3 vReL;
uniform float uReBurn;
uniform float uReCell;
uniform float uReHeat;
float reHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
`;
// patch d'un matériau : écarte les fragments des blocs brûlés, liseré incandescent à la frontière, teinte chaude globale ; renvoie une fonction qui le restaure
export function patchMaterial(material, uniforms) {
  const prev = material.onBeforeCompile, prevKey = material.customProgramCacheKey;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    shader.uniforms.uReBurn = uniforms.uReBurn; shader.uniforms.uReCell = uniforms.uReCell; shader.uniforms.uReHeat = uniforms.uReHeat; shader.uniforms.uReInv = uniforms.uReInv;
    shader.vertexShader = shader.vertexShader.replace('void main() {', VERT_PARS + 'void main() {').replace('#include <begin_vertex>', '#include <begin_vertex>\nvReL = (uReInv * (modelMatrix * vec4(position, 1.0))).xyz;');
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', FRAG_PARS + 'void main() {\n  if (uReBurn > 0.0 && reHash(floor(vReL / uReCell)) < uReBurn) discard;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  { float rd = reHash(floor(vReL / uReCell)); float edge = uReBurn > 0.0 ? 1.0 - smoothstep(uReBurn, uReBurn + 0.15, rd) : 0.0; gl_FragColor.rgb += edge * vec3(1.0, 0.5, 0.15) * 2.0 + uReHeat * vec3(1.0, 0.45, 0.15) * 0.5; }');
  };
  material.customProgramCacheKey = () => (prevKey ? prevKey.call(material) : '') + 'reentry';
  material.needsUpdate = true;
  return () => { material.onBeforeCompile = prev || (() => {}); material.customProgramCacheKey = prevKey || (() => ''); material.needsUpdate = true; };
}

const glowTexture = () => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); if (!g) return null;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,110,40,0)'); gr.addColorStop(0.18, 'rgba(255,120,45,0.10)'); gr.addColorStop(0.45, 'rgba(255,105,30,0.32)'); gr.addColorStop(0.72, 'rgba(255,70,15,0.12)'); gr.addColorStop(1, 'rgba(255,50,0,0)');   // HALO : transparent au centre (pas de rond jaune), anneau diffus orangé
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
};

// effet de rentrée sur un objet : `target` = groupe du modèle (matériaux patchés) ; `parent` = groupe où poser le halo et la lumière ; `sizeUnits` = taille de l'objet (unités de la scène)
export function createReentry(parent, target, sizeUnits, light) {   // light : PointLight créée UNE FOIS au démarrage du moteur (en ajouter une à chaud ferait recompiler tous les shaders)
  const uniforms = { uReBurn: { value: 0 }, uReCell: { value: 1 }, uReHeat: { value: 0 }, uReInv: { value: new THREE.Matrix4() } };   // uReInv : monde → repère du modèle entier (les blocs restent attachés à l'objet)
  const restores = [];
  target.traverse(o => { if (o.isMesh) for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (m && !m.userData.reentryPatched) { m.userData.reentryPatched = true; restores.push(patchMaterial(m, uniforms), () => { m.userData.reentryPatched = false; }); } });
  const box = new THREE.Box3().setFromObject(target), size = box.getSize(new THREE.Vector3()), cellLocal = Math.max(size.x, size.y, size.z) / Math.max(1e-30, target.scale.x) / 28;   // 28 blocs sur la plus grande dimension (repère LOCAL du modèle)
  uniforms.uReCell.value = Math.max(1e-6, cellLocal || 1);
  const tex = glowTexture();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); glow.frustumCulled = false; glow.visible = false; parent.add(glow);
  light.distance = sizeUnits * 40; light.decay = 1;
    return {
    uniforms,
    // état : pos (Vector3, scène), vel (direction unitaire du mouvement), heat (0–1), burn (0–1), t (s, scintillement)
    update({ pos, vel, heat, burn, t, camDist }) {
      target.updateWorldMatrix(true, false); uniforms.uReInv.value.copy(target.matrixWorld).invert();   // à appeler APRÈS le décalage d'origine flottante de l'image (même repère que le rendu)
      uniforms.uReBurn.value = burn; uniforms.uReHeat.value = burn >= 1 ? 0 : heat;
      const alive = burn < 1, flick = 0.85 + 0.15 * Math.sin(t * 31) * Math.sin(t * 17 + 1.3);
      // halo : sa taille grandit avec la chaleur ; reste visible de loin (au moins 1 % de la distance à la caméra)
      const gs = Math.max(sizeUnits * (3 + 14 * heat) * flick, (camDist || 0) * 0.01 * heat);
      glow.visible = heat > 0.02; glow.position.copy(pos); glow.scale.setScalar(gs); glow.material.opacity = Math.min(1, heat * 1.3) * (alive ? 1 : Math.max(0, 1 - (burn - 1) * 4));
      light.position.copy(pos); light.intensity = heat * 4 * flick * (alive ? 1 : 0.3);
    },
    dispose() { for (const r of restores) r(); glow.removeFromParent(); light.intensity = 0; glow.material.dispose(); if (tex) tex.dispose(); },
  };
}

// lumière de la rentrée : créée une fois (intensité 0) et ajoutée à la scène au démarrage
export const createReentryLight = () => new THREE.PointLight(0xff9a50, 0, 1, 1);
