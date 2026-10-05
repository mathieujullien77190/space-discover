import { describe, expect, it } from 'vitest'
import { SKIRT, TILE_SEGMENTS, terrainTileGeometry } from '@/engine/terrain-layer'
import { SEA_LEVEL_OFFSET, tileBounds, vertexRadius } from '@/engine/terrain-tiles'

describe('géométrie d’une tuile de relief', () => {
  const b = tileBounds(264, 180, 9)
  const n = TILE_SEGMENTS
  const flat = new Float32Array((n + 1) * (n + 1))
  const hill = new Float32Array((n + 1) * (n + 1)).map((_, i) => (i === Math.floor(((n + 1) * (n + 1)) / 2) ? 3000 : 0))

  it('plate : tous les sommets au niveau de la mer, la jupe plus basse', () => {
    const g = terrainTileGeometry(b, n, n, flat, 2)
    const pos = g.attributes.position
    expect(pos.count).toBe((n + 3) * (n + 3))
    const r = (i: number) => Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i))
    expect(r((n + 3) * 5 + 5)).toBeCloseTo(1 + SEA_LEVEL_OFFSET, 6)         // sommet intérieur
    expect(r(0)).toBeCloseTo(1 + SEA_LEVEL_OFFSET - SKIRT, 6)               // coin de la jupe
    expect(g.index!.count).toBe((n + 2) * (n + 2) * 6)
  })

  it('une colline de 3 000 m dépasse de 3 000 × 2 m au-dessus de la mer dans la scène', () => {
    const g = terrainTileGeometry(b, n, n, hill, 2)
    const pos = g.attributes.position
    let max = 0
    for (let i = 0; i < pos.count; i++) max = Math.max(max, Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)))
    expect(max).toBeCloseTo(vertexRadius(3000, 2), 7)
    expect(max - (1 + SEA_LEVEL_OFFSET)).toBeCloseTo((3000 * 2) / 6378137, 7)
  })

  it('texture : V en ordonnée Mercator de 0 (sud) à 1 (nord), U de 0 à 1', () => {
    const g = terrainTileGeometry(b, n, n, flat, 2)
    const uv = g.attributes.uv
    let umin = 1
    let umax = 0
    let vmin = 1
    let vmax = 0
    for (let i = 0; i < uv.count; i++) {
      umin = Math.min(umin, uv.getX(i))
      umax = Math.max(umax, uv.getX(i))
      vmin = Math.min(vmin, uv.getY(i))
      vmax = Math.max(vmax, uv.getY(i))
    }
    expect([umin, umax, vmin, vmax].map((x) => Math.round(x * 1e6) / 1e6)).toEqual([0, 1, 0, 1])
  })
})
