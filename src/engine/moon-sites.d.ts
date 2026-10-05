import type { BufferGeometry, Group, InstancedMesh, Matrix4, Vector3 } from 'three'

export const MOON_RADIUS_M: number
export const MOON_EYE_M: number
export type MoonSite = {
  id: string; name: string; short: string; kind: string; lat: number; lon: number; altM: number; eyeM: number; body: 'moon'; scene: string; image: string; rover: boolean; seed: number
  facts: { label: string; value: string }[]; note: string
}
export const MOON_SITES: MoonSite[]
export function moonSiteById(id: string): MoonSite | null
export const SITE_LAYOUT: Record<'flag' | 'lander' | 'rover', { x: number; z: number; yaw: number }>
export function moonSiteFrame(site: { lat: number; lon: number; eyeM?: number }, matrixWorld: Matrix4, rMeters?: number): { ground: Vector3; eye: Vector3; up: Vector3; east: Vector3; north: Vector3; south: Vector3; unit: number }
export function makeTerrain(seed?: number): { height: (x: number, z: number) => number; craters: { x: number; z: number; r: number; depth: number }[] }
export function groundGeometry(height: (x: number, z: number) => number, rings?: number, sectors?: number, r0?: number, growth?: number): { geometry: BufferGeometry; rMax: number }
export function regolithPixels(n?: number, seed?: number): Uint8Array
export function flagPixels(w?: number, h?: number): Uint8Array
export function buildFlag(): Group
export function buildLander(): Group
export function buildRover(): Group
export function buildRocks(height: (x: number, z: number) => number, seed?: number, count?: number): InstancedMesh
export function buildMoonSite(site: MoonSite): Group
