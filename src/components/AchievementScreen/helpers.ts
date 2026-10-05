import type { StoryInfo } from '@/types'

export type Achievement = NonNullable<StoryInfo['achievement']>

// Retrouve la définition d'un haut fait d'après son id dans la liste des histoires.
export const achievementOf = (stories: StoryInfo[], id: string): Achievement | null => stories.find((s) => s.achievement?.id === id)?.achievement ?? null
