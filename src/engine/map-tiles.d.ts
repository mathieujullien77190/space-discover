export const MAP_STYLES: Record<'street' | 'clean' | 'ocean' | 'terrain', { url: string; credit: string; zMax: number; maxAltKm?: number }>
export const MAP_URL: string
export const MAP_CREDIT: string
export const MAP_Z_MIN: number
export const MAP_Z_MAX: number
export const MAP_RADIUS: number
export const MAP_MAX_ALT_KM: number
export const MAP_HYSTERESIS: number
export function mapMaxAlt(style: string): number
export function tileUrl(z: number, x: number, y: number, template?: string): string
export function tilesAt(z: number): number
export function tileLon(x: number, z: number): number
export function tileLat(y: number, z: number): number
export function tileBounds(x: number, y: number, z: number): [number, number, number, number]
export function tileAt(lon: number, lat: number, z: number): { x: number; y: number; z: number }
export function mercY(lat: number): number
export function mapZoom(altKm: number, latDeg: number, fovDeg: number, aspect: number): number
export function mapTiles(lon: number, lat: number, z: number, radius?: number): { x: number; y: number; z: number; key: string; d: number }[]
