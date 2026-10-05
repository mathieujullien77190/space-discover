// Plein écran (comme F11) : demandé avec le geste de l'utilisateur (clic) ; sans effet si le navigateur ne le permet pas.
export const enterFullscreen = (): void => {
  try {
    void document.documentElement.requestFullscreen?.()?.catch(() => undefined);
  } catch {
    /* plein écran indisponible : on masque seulement l'interface */
  }
};

export const exitFullscreen = (): void => {
  try {
    if (document.fullscreenElement)
      void document.exitFullscreen?.()?.catch(() => undefined);
  } catch {
    /* rien */
  }
};
