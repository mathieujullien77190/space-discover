import type { Group, Scene, Vector3 } from 'three'

export function starVector(raDeg: number, decDeg: number, out: Vector3): Vector3
export function bvColor(bv: number): number[]
export const STAR_BINS: { max: number; size: number; light: number }[]
export function starBin(mag: number): number
export function createStars(scene: Scene): Group
export const TWINKLE_SHARE: number
export function twinkles(k: number): boolean
export const TWINKLE_MIN_RAD_S: number
export const TWINKLE_MAX_RAD_S: number
export function twinkleFactor(timeS: number, phase: number, freq: number, amp: number): number
export const STAR_FADE_LIMITS: number[]
export function starOpacity(bin: number, day: number): number
