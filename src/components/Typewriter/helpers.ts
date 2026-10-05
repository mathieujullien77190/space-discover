// Vrai si l'utilisateur demande moins d'animations (le texte s'affiche alors d'un coup).
export const prefersReducedMotion = (): boolean => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
