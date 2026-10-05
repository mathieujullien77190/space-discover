import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { EARTH_MAP_URL, EARTH_TILES } from '@/engine/earth'

describe('fond de carte dessiné', () => {
  it('32 tuiles de 45° couvrent tout le globe sans trou ni recouvrement, et chaque fichier existe', () => {
    expect(EARTH_TILES).toHaveLength(32)
    let area = 0
    for (const t of EARTH_TILES) {
      const [w, e, s, n] = t.bounds
      expect(e - w).toBe(45)
      expect(n - s).toBe(45)
      area += (e - w) * (n - s)
      expect(fs.existsSync(path.join(process.cwd(), 'public', t.url))).toBe(true)
    }
    expect(area).toBe(360 * 180)
    expect(Math.min(...EARTH_TILES.map((t) => t.bounds[0]))).toBe(-180)
    expect(Math.max(...EARTH_TILES.map((t) => t.bounds[3]))).toBe(90)
  })
  it('la carte mondiale dessinée existe (repli à faible zoom)', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'public', EARTH_MAP_URL))).toBe(true)
  })
})
