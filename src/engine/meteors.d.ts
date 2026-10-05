import type { Group, Scene, Vector3 } from 'three'

export const METEOR_GAP_S: number[]
export const METEOR_DURATION_S: number[]
export const METEOR_LENGTH_DEG: number[]
export const METEOR_ELEVATION_DEG: number[]
export const METEOR_HEAD_SHARE: number
export const METEOR_TAIL_DELAY: number
export const METEOR_SLOTS: number
export function createMeteors(scene: Scene, rand?: () => number): {
  group: Group
  update(a: { dt: number; enabled: boolean; camera: { position: Vector3 }; R: number; up?: number[]; east?: number[]; north?: number[] }): void
  spawn(up: number[], east: number[], north: number[]): boolean
  count(): number
  total(): number
  dispose(): void
}
