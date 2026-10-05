import type { Group, Mesh, Vector3 } from 'three'
import type { AirlinerTrack } from './airliner'

export const AIRLINERS_MAX: number
export const AIRLINER_GAP_S: number[]
export const MODEL_MIN_PX: number
export const CONTRAIL_MAX_AGE_S: number
export const CONTRAIL_SAMPLE_S: number
export const CONTRAIL_HALF_WIDTH_M: number[]
export const CONTRAIL_OPACITY: { day: number; night: number }
export const PLANE_STROBE_PERIOD_S: number
export function strobeFlash(t: number, phase?: number): number
export type ContrailSample = { pos: Vector3; right: Vector3; t: number }
export function contrailData(samples: ContrailSample[], head: ContrailSample, now: number, opacity: number): { positions: Float32Array; colors: Float32Array; count: number }
export type AirlinerFrame = { up: number[]; east: number[]; north: number[] }
export type AirlinerPlane = { tr: AirlinerTrack; t: number; pos: Vector3; px: number; shown: boolean; night: boolean; flash: number; model: Group; trail: Mesh; samples: ContrailSample[]; eye: Vector3; frame: AirlinerFrame }
export function createAirliners(world: Group, rand?: () => number): {
  spawn(a: { frame: AirlinerFrame; groundR: number; eye: Vector3 | number[] }): boolean
  update(a: { dt: number; camera: { position: Vector3 }; fov: number; height: number; sunDir: Vector3; hide: boolean; hiddenByEarth: (p: Vector3) => boolean; obsActive: boolean; obsFrame?: AirlinerFrame | null; groundR?: number; eye?: Vector3; R_KM: number }): void
  count(): number
  list(): AirlinerPlane[]
  skip(sec: number): void
  clear(): void
  dispose(): void
}
