import type { Group, Mesh, WebGLRenderer } from 'three'

export const CLOUDS_URL: { low: string; high: string }
export const CLOUDS_CREDIT: string
export const CLOUDS_R: number
export const CLOUDS_REFRESH_MS: number
export const CLOUDS_HIGH_ALT_KM: number
export const CLOUDS_FADE_KM: [number, number]
export function cloudsOpacity(altKm: number): number
export function createClouds(parent: Group, renderer: WebGLRenderer, now?: () => number): {
  mesh: Mesh
  update(a: { on: boolean; camAlt: number; http: boolean }): boolean
  stats(): { state: string | null; level: string | null; stamp: number; visible: boolean; opacity: number }
  dispose(): void
}
