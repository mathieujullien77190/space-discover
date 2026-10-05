import type { Group, Vector3 } from 'three'

export const A320: { lengthM: number; spanM: number; heightM: number; fuselageDiameterM: number }
export const AIRLINER_ALTITUDE_M: number[]
export const AIRLINER_SPEED_MS: number[]
export const AIRLINER_CLOSEST_M: number[]
export const AIRLINER_START_ELEVATION_DEG: number[]
export const AIRLINER_MIN_ELEVATION_DEG: number
export type AirlinerTrack = { H: number; speed: number; c: number; hx: number; hy: number; nx: number; ny: number; s0: number; S: number }
export function makeAirlinerTrack(rand?: () => number): AirlinerTrack
export function airlinerAt(tr: AirlinerTrack, t: number): { s: number; done: boolean; local: number[]; heading: number[] }
export function airlinerWorld(local: number[], frame: { up: number[]; east: number[]; north: number[] }, groundRadius: number, out?: Vector3): Vector3
export function elevationFrom(pos: Vector3, eye: Vector3, up: number[], tmp?: Vector3): number
export function buildA320(): Group
