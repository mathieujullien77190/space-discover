import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { ATM_R, buildAtmosphere } from '@/engine/atmosphere'

describe('halo bleu de l’atmosphère', () => {
  it('coque dessinée de l’intérieur, additive, sans écriture de profondeur, compatible avec le tampon de profondeur logarithmique', () => {
    const m = buildAtmosphere()
    const mat = m.material as THREE.ShaderMaterial
    expect(mat.side).toBe(THREE.BackSide)
    expect(mat.blending).toBe(THREE.AdditiveBlending)
    expect(mat.depthWrite).toBe(false)
    expect(mat.fragmentShader).toContain('logdepthbuf_fragment')
    expect(mat.vertexShader).toContain('logdepthbuf_vertex')
    expect(mat.uniforms.uRatm.value).toBe(ATM_R)
    expect(ATM_R).toBeGreaterThan(1.005)
    expect(ATM_R).toBeLessThan(1.15)
    expect(mat.uniforms.uUseSun.value).toBe(0)                                       // sans Soleil par défaut
    expect(mat.fragmentShader).toContain('uSun')
    expect(mat.fragmentShader).toContain('vec3(0.93, 0.56, 0.36)')                // la teinte orangée (adoucie) du crépuscule
    expect(mat.uniforms.uColor.value.z).toBeGreaterThan(mat.uniforms.uColor.value.x)   // bleu
  })
})
