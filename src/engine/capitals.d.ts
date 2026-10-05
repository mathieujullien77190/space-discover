import type { Camera, Object3D } from 'three'

export const MIN_ELEVATION: number
export const MAX_LABELS: number
export const MIN_EARTH_PX: number
export const LABEL_H: number
export const CHAR_W: number
export function overlaps(a: number[], b: number[]): boolean
export function createCapitals(overlay: { label(text: string, kind?: string): HTMLElement; remove(el: HTMLElement): void }, earth: Object3D): {
  update(a: { on: boolean; camera: Camera & { fov: number }; width: number; height: number; hidden?: (p: { x: number; y: number; z: number }) => boolean }): number
  count(): number
  dispose(): void
}
