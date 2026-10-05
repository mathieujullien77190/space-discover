export const GREEK: Record<string, string>
export const FAMOUS: Record<string, string>
export type StarRow = [number, number, number, number, number]
export type StarDetails = { hip: number; title: string; subtitle: string; constellation: string; magnitude: number; colorClass: string; tempK: number; text: string; famous: boolean; note: string }
export function constellationName(abbr: string): string
export function starByHip(hip: number): StarRow | null
export function colorClass(bv: number): string
export function temperatureK(bv: number): number
export function starDetails(star: StarRow | number[]): StarDetails
export function pickNearest(project: (s: number[]) => [number, number] | null, x: number, y: number, maxPx?: number, visible?: (i: number) => boolean): number
