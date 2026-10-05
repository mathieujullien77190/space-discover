import type { Camera, Scene, Sprite, Vector3 } from 'three'

export const GLARE_SIZE: number
export const GLARE_PX: number
export const AU_UNITS: number
export const SUN_HIDE_UNITS: number
export const GLARE_MIN_SCALE: number
export function paintGlare(g: CanvasRenderingContext2D, size: number): void
export function glarePixels(dist: number): number
export function createSunGlare(scene: Scene): {
  sprite: Sprite
  update(a: { camera: Camera & { fov: number; far: number }; sunPos: Vector3; width?: number; height: number }): number
  dispose(): void
}
