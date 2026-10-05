// Copie un texte dans le presse-papiers (sans effet si le navigateur le refuse, par exemple hors https).
export const copyText = (text: string): void => {
  try {
    void navigator.clipboard.writeText(text)
  } catch {
    /* presse-papiers indisponible */
  }
}
