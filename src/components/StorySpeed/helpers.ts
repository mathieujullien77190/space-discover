import { SLIDER_STEPS, SPEED_MAX, SPEED_MIN } from './constants'

// Échelle logarithmique : le milieu du curseur est ≈ ×7, les petites vitesses restent précises.
export const speedToPos = (speed: number): number => Math.round((Math.log(Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed)) / SPEED_MIN) / Math.log(SPEED_MAX / SPEED_MIN)) * SLIDER_STEPS)
export const posToSpeed = (pos: number): number => {
  const v = SPEED_MIN * Math.pow(SPEED_MAX / SPEED_MIN, pos / SLIDER_STEPS)
  return v < 10 ? Math.round(v * 100) / 100 : Math.round(v)
}
export const fmtSpeed = (speed: number): string => `×${speed < 10 ? String(Math.round(speed * 100) / 100).replace('.', ',') : Math.round(speed)}`
