// Helpers purs partagés (mise en forme, stockage).

export const formatUtcDate = (ms: number, accelerated: boolean): string =>
  new Date(ms).toLocaleString('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) +
  ' UTC' +
  (accelerated ? ' · accéléré' : '')

