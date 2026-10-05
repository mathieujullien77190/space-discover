export type Observatory = {
  id: string
  name: string
  short: string
  kind: string
  lat: number
  lon: number
  altM: number
  eyeM: number
  scene: 'snow' | 'desert' | 'forest' | 'moon'
  body?: 'moon'
  rover?: boolean
  image: string
  facts: { label: string; value: string }[]
  note: string
}
export const OBSERVATORIES: Observatory[]
export const OBS_VIEW_ALT_KM: number
export const OBS_VIEW_PITCH: number
export const OBS_VIEW_FOV: number
export const OBS_MOON_BOOST: number
export const OBS_MOON_BRIGHT: number
export function observatoryById(id: string): Observatory | null
export function observatoryFrame(o: Observatory, R_M?: number): { up: number[]; east: number[]; north: number[]; south: number[]; eye: number[]; ground: number[] }
