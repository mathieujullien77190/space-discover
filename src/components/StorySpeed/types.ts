export type StorySpeedProps = {
  speed: number
  effective?: number   // vitesse réellement appliquée (plus basse pendant le ralenti aux étapes)
  slowMotion?: boolean
  onSlowMotion?: (on: boolean) => void
  onChange: (speed: number) => void
}
