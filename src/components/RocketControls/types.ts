export type RocketControlsProps = {
  T: number
  playing: boolean
  speed: number
  onSpeed: (speed: number) => void
  onStop: () => void
}
