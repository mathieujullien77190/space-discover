import type { Material } from 'three'

export const WRAP: number
export const LAMBERT_LINE: string
export function wrappedChunk(w?: number): string
export function wrapLighting<T extends Material>(material: T, w?: number): T
