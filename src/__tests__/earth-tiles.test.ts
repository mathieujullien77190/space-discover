import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { EARTH_MAP_URL } from '@/engine/earth'

describe('fond de carte dessiné', () => {
  it('la carte mondiale dessinée (Natural Earth I) existe et sert à toutes les altitudes', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'public', EARTH_MAP_URL))).toBe(true)
  })
})
