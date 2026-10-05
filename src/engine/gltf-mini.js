import { assetUrl } from './config.js';
import * as THREE from 'three';

// Mini chargeur GLB (le build UMD de three.js n'a pas GLTFLoader) : nœuds (matrice ou TRS), primitives triangles (POSITION, NORMAL, TEXCOORD_0, indices),
// matériaux PBR de base (couleur, texture de couleur, normal map, rugosité), images WebP/PNG/JPEG intégrées. Pas d'animations, de caméras ni de compression.
// Nécessite http(s) (fetch) : en file:// le chargement échoue et l'appelant garde son modèle de repli.
export function loadGlb(url) {
  return fetch(assetUrl(url)).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }).then(buf => {
    const dv = new DataView(buf); if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('pas un GLB');
    const jl = dv.getUint32(12, true), json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl))), bin0 = 20 + jl + 8;
    const view = i => { const v = json.bufferViews[i]; return { off: bin0 + (v.byteOffset || 0), len: v.byteLength, stride: v.byteStride || 0 }; };
    const T = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }, N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
    const readAcc = i => {   // copie compacte (gère l'entrelacement)
      const a = json.accessors[i], v = view(a.bufferView), n = N[a.type], C = T[a.componentType], out = new C(a.count * n), sz = C.BYTES_PER_ELEMENT, st = v.stride || n * sz, base = v.off + (a.byteOffset || 0);
      const get = { 5126: 'getFloat32', 5123: 'getUint16', 5125: 'getUint32', 5121: 'getUint8', 5122: 'getInt16', 5120: 'getInt8' }[a.componentType];
      for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = dv[get](base + k * st + c * sz, true);
      return out;
    };
    // images -> textures (asynchrones)
    const imgPromises = (json.images || []).map(im => new Promise(res => {
      const v = view(im.bufferView), blob = new Blob([new Uint8Array(buf, v.off, v.len)], { type: im.mimeType || 'image/png' }), img = new Image();
      img.onload = () => res(img); img.onerror = () => res(null); img.src = URL.createObjectURL(blob);
    }));
    return Promise.all(imgPromises).then(imgs => {
      const texCache = {}, tex = (ti, srgb) => {
        if (ti == null) return null; const key = ti + (srgb ? 's' : 'l'); if (texCache[key]) return texCache[key];
        const t = json.textures[ti], src = t.source != null ? t.source : t.extensions && t.extensions.EXT_texture_webp && t.extensions.EXT_texture_webp.source;
        if (src == null || !imgs[src]) return null;
        const x = new THREE.Texture(imgs[src]); x.flipY = false; x.wrapS = x.wrapT = THREE.RepeatWrapping; x.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; x.anisotropy = 8; x.needsUpdate = true;
        return (texCache[key] = x);
      };
      const mats = (json.materials || []).map(m => {
        const p = m.pbrMetallicRoughness || {}, f = p.baseColorFactor || [1, 1, 1, 1];
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(f[0], f[1], f[2]), map: tex(p.baseColorTexture && p.baseColorTexture.index, true), normalMap: tex(m.normalTexture && m.normalTexture.index, false),
          metalness: Math.min(0.2, (p.metallicFactor == null ? 1 : p.metallicFactor) * 0.3),   // pas d'environnement : un métal pur serait noir
          roughness: p.roughnessFactor == null ? 1 : p.roughnessFactor, side: THREE.DoubleSide,
        });
      });
      const geoCache = {}, meshOf = i => {
        const grp = new THREE.Group();
        json.meshes[i].primitives.forEach((p, pi) => {
          if (p.mode != null && p.mode !== 4) return;
          const key = i + ':' + pi, geo = geoCache[key] || (geoCache[key] = (() => {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(readAcc(p.attributes.POSITION), 3));
            if (p.attributes.NORMAL != null) g.setAttribute('normal', new THREE.BufferAttribute(readAcc(p.attributes.NORMAL), 3)); else g.computeVertexNormals();
            if (p.attributes.TEXCOORD_0 != null) g.setAttribute('uv', new THREE.BufferAttribute(readAcc(p.attributes.TEXCOORD_0), 2));
            if (p.indices != null) g.setIndex(new THREE.BufferAttribute(readAcc(p.indices), 1));
            return g;
          })());
          grp.add(new THREE.Mesh(geo, mats[p.material] || new THREE.MeshStandardMaterial({ color: 0xcccccc })));
        });
        return grp;
      };
      const nodeOf = i => {
        const n = json.nodes[i], o = n.mesh != null ? meshOf(n.mesh) : new THREE.Group();
        if (n.matrix) { new THREE.Matrix4().fromArray(n.matrix).decompose(o.position, o.quaternion, o.scale); }
        else { if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale); }
        (n.children || []).forEach(c => o.add(nodeOf(c)));
        return o;
      };
      const root = new THREE.Group(); (json.scenes[json.scene || 0].nodes || []).forEach(i => root.add(nodeOf(i)));
      return root;
    });
  });
}
