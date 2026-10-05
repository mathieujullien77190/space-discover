import type { BufferGeometry, Group, WebGLRenderer } from 'three'

export const TILE_SEGMENTS: number
export const SKIRT: number
export const FAR_SEGMENTS: number
export function terrainTileGeometry(b: [number, number, number, number], nx: number, ny: number, heights: ArrayLike<number>, exag: number): BufferGeometry
export function createTerrainLayer(parent: Group, renderer: WebGLRenderer, opts?: { exaggeration?: number }): {
  group: Group
  update(a: { on: boolean; camAlt: number; cl: number; co: number; fov: number; aspect: number; http: boolean }): boolean
  stats(): { levels: number; opacity: number; tiles: number; ready: number; loading: number; seaOffset: number }
  dispose(): void
}
