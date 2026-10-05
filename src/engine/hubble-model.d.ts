import type { Group } from 'three'

export const HUBBLE_LENGTH_M: number
export const HUBBLE_DIAMETER_M: number
export const HUBBLE_MODEL: string
export const HUBBLE_MODEL_CFG: { scale: number; transform: number[] }
export const HUBBLE_DIMS: { a: number[]; b: number[]; text: string; up: number[] }[]
export function buildHubble(): Group
