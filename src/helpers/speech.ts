// Lecture à voix haute (Web Speech API, voix française) : sans dépendance, sans effet si le navigateur n'a pas de synthèse vocale.
export const speechAvailable = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'

export const stopSpeech = (): void => {
  if (speechAvailable()) window.speechSynthesis.cancel()
}

export const speak = (text: string): void => {
  if (!speechAvailable()) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'fr-FR'
  u.rate = 0.95
  window.speechSynthesis.speak(u)
}
