export const CONTOUR_STEP_M: number
export const CONTOUR_MAJOR_EVERY: number
export const TERRAIN_URL: string
export const TERRAIN_CREDIT: string
export function terrariumElevation(r: number, g: number, b: number): number
export function bandColor(band: number): [number, number, number]
export function paintContours(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number, mpp?: number): Uint8ClampedArray
