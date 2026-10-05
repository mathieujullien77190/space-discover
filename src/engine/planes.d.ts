import type { Group, Scene, Vector3 } from 'three'

export const PLANE_GAP_S: number[]
export const PLANE_FIRST_S: number[]
export const PLANE_ALTITUDE_M: number[]
export const PLANE_SPEED_MS: number[]
export const PLANE_CLOSEST_M: number[]
export const PLANE_MIN_ELEVATION_DEG: number
export const PLANE_WINGSPAN_M: number
export const PLANE_STROBE_PERIOD_S: number
export const PLANE_LENGTH_M: number
export function strobeFlash(t: number, phase?: number): number
export const PLANE_SLOTS: number
export type PlaneTrack = { H: number; speed: number; c: number; hx: number; hy: number; nx: number; ny: number; S: number; s0: number }
export function makeTrack(rand?: () => number): PlaneTrack
export function planeAt(tr: PlaneTrack, t: number): { s: number; done: boolean; center: number[]; left: number[]; right: number[]; tail: number[] }
export function elevationDeg(p: number[]): number
export function distanceM(p: number[]): number
export function createPlanes(scene: Scene, rand?: () => number): {
  group: Group
  update(a: { dt: number; enabled: boolean; camera: { position: Vector3 }; R: number; up?: number[]; east?: number[]; north?: number[] }): void
  spawn(): boolean
  count(): number
  total(): number
  dispose(): void
}
