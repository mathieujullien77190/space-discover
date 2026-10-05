export type StoryQuizProps = {
  question: string
  choices: { text: string; correct?: boolean }[]
  explain: string
}
