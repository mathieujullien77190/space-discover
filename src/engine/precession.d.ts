import type { Matrix4, Quaternion } from 'three'

export function precessionAngles(T: number): { zeta: number; z: number; theta: number }
export function precessionMatrix(T: number, out?: Matrix4): Matrix4
export function precessionQuaternion(T: number, out?: Quaternion): Quaternion
