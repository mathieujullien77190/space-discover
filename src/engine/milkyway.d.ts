import type { Group, Points } from 'three'

export const GALACTIC_FROM_EQUATORIAL: number[][]
export const GALACTIC_CENTER: { ra: number; dec: number }
export const GALACTIC_POLE: { ra: number; dec: number }
export const MILKY_FADE: number[]
export const MILKY_MAX_OPACITY: number
export const MILKY_DIM: number
export const MILKY_LUM_POWER: number
export const MILKY_BRIGHT_MIN: number
export function milkyWayOpacity(se: number): number
export function milkyWayStars(): { n: number; pos: Float32Array; col: Float32Array; lum: Float32Array }
export function createMilkyWay(starsGroup: Group): { points: Points[]; count: number; brightCount: number; update(opacity: number): void; visible(): boolean; opacity(): number; dispose(): void }
