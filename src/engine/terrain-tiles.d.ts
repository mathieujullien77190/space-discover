export const IMAGERY_URL: string
export const DEM_URL: string
export const TERRAIN_CREDIT: string
export const TERRAIN_Z_MIN: number
export const TERRAIN_Z_MAX: number
export const TERRAIN_RADIUS: number
export const TERRAIN_MAX_ALT_KM: number
export const TERRAIN_HYSTERESIS: number
export const TERRAIN_EXAGGERATION: number
export const TERRAIN_GLOW: number
export const EARTH_R_M: number
export const SEA_LEVEL_OFFSET: number
export function tileUrl(z: number, x: number, y: number, template: string): string
export function tilesAt(z: number): number
export function tileLon(x: number, z: number): number
export function tileLat(y: number, z: number): number
export function tileBounds(x: number, y: number, z: number): [number, number, number, number]
export function tileAt(lon: number, lat: number, z: number): { x: number; y: number; z: number }
export function mercY(lat: number): number
export function terrainZoom(altKm: number, latDeg: number, fovDeg: number, aspect: number): number
export function terrainTiles(lon: number, lat: number, z: number, radius?: number): { x: number; y: number; z: number; key: string; d: number }[]
export function terrariumElevation(r: number, g: number, b: number): number
export function sampleDem(rgba: ArrayLike<number>, w: number, h: number, u: number, v: number): number
export function tileHeights(rgba: ArrayLike<number>, w: number, h: number, nx: number, ny: number, bounds?: [number, number, number, number]): Float32Array
export function vertexRadius(elevM: number, exag?: number): number
export const TERRAIN_LEVELS: number
export const TERRAIN_FAR_RADIUS: number
export function horizonKm(altKm: number): number
export function terrainLevels(lon: number, lat: number, altKm: number, fovDeg: number, aspect: number): { k: number; z: number; dem: boolean; tiles: { x: number; y: number; z: number; key: string; d: number }[] }[]
export function terrainFallbacks(want: { x: number; y: number; z: number; key: string; k?: number; d?: number }[], isReady: (key: string) => boolean): { x: number; y: number; z: number; key: string; k: number; dem: boolean; d: number; fallback: boolean }[]
