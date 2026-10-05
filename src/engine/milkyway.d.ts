import type { Group, Mesh, Quaternion } from 'three'

export const GALACTIC_FROM_EQUATORIAL: number[][]
export const GALACTIC_CENTER: { ra: number; dec: number }
export const GALACTIC_POLE: { ra: number; dec: number }
export const MILKY_FADE: number[]
export const MILKY_MAX_OPACITY: number
export function milkyWayOpacity(se: number): number
export function noise3(x: number, y: number, z: number): number
export function fbm(x: number, y: number, z: number, oct?: number): number
export function milkyWayPixel(gx: number, gy: number, gz: number): number[]
export function localToGalactic(x: number, y: number, z: number): number[]
export function paintMilkyWay(w: number, h: number): Uint8Array
export function milkyWayQuaternion(out?: Quaternion): Quaternion
export function createMilkyWay(starsGroup: Group, size?: number[]): { mesh: Mesh; update(opacity: number): void; dispose(): void }
