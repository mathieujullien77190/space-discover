import type { BodyCardData, FeatureItem, MenuItem, RocketOption, SatelliteItem } from '@/types'

export function viewMenu(): MenuItem[]
export function issFeatures(): FeatureItem[]
export function satellites(): SatelliteItem[]
export function rocketList(): RocketOption[]
export function bodyCard(id: string): BodyCardData | null
