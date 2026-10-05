import type { Group, Scene } from 'three'

export const PLANE_GAP_S: number[]
export const PLANE_FIRST_S: number[]
export const PLANE_SPEED_DEG_S: number[]
export const PLANE_START_ELEVATION_DEG: number[]
export const PLANE_AZIMUTH_SPAN_DEG: number[]
export const PLANE_STROBE_PERIOD_S: number
export const PLANE_STROBE_FLASH_S: number
export const PLANE_SLOTS: number
export function planeLight(t: number, phase?: number): number
export function createPlanes(scene: Scene, rand?: () => number): {
  group: Group
  update(a: { dt: number; enabled: boolean; camera: { position: import('three').Vector3 }; R: number; up?: number[]; east?: number[]; north?: number[] }): void
  spawn(up: number[], east: number[], north: number[]): boolean
  count(): number
  total(): number
  dispose(): void
}
