import type { BodyCardData, FeatureItem, MenuItem } from '@/types'

export function viewMenu(): MenuItem[]
export function issFeatures(): FeatureItem[]
export function bodyCard(id: string): BodyCardData | null
