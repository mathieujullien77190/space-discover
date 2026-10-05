import type { Camera, Group, LineSegments, Vector3 } from 'three'

export const LINE_COLOR: number
export const LINE_OPACITY: number
export const LABEL_H: number
export const CHAR_W: number
export function constellationSegments(): Float32Array
export function createConstellations(starsGroup: Group, overlay: { label(text: string, kind?: string): HTMLElement; remove(el: HTMLElement): void }): {
  lines: LineSegments
  update(a: { on: boolean; camera: Camera & { fov: number }; width: number; height: number; earthCenter?: Vector3 }): number
  count(): number
  dispose(): void
}
