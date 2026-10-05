import type { BufferGeometry, Group, WebGLRenderer } from 'three'

export const TILE_SEGMENTS: number
export const SKIRT: number
export const FAR_SEGMENTS: number
export function terrainTileGeometry(b: [number, number, number, number], nx: number, ny: number, heights: ArrayLike<number>, exag: number): BufferGeometry
export function createTerrainLayer(parent: Group, renderer: WebGLRenderer, opts?: { exaggeration?: number }): {
  group: Group
  setLook(glow: number, gain: number): void
  update(a: { on: boolean; camAlt: number; cl: number; co: number; fov: number; aspect: number; http: boolean; aim?: { lon: number; lat: number; distKm: number } | null }): boolean
  stats(): { gain: number; glow: number; levels: number; tiles: number; ready: number; loading: number; seaOffset: number }
  dispose(): void
}
