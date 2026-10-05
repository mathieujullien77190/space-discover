// Mise en forme des nombres affichés (français) : poids, altitudes et distances, durée de période. Pur (pas de DOM).
export const KM_UA = 149597870.7, KM_AL = 9.4607304725808e12;
const fr = (v, d) => v.toLocaleString('fr-FR', { maximumFractionDigits: d });
export const fmtMass = kg => kg >= 10000 ? Math.round(kg / 1000).toLocaleString('fr-FR') + ' t' : kg >= 1000 ? (kg / 1000).toFixed(1).replace('.', ',') + ' t' : Math.round(kg).toLocaleString('fr-FR') + ' kg';   // poids lisible (kg ou tonnes)
export const fmtBig = km => km >= 0.1 * KM_AL ? fr(km / KM_AL, 2) + ' al' : km >= 1e7 ? fr(km / KM_UA, km / KM_UA < 10 ? 2 : 1) + ' UA' : null;   // null : rester en km
export const fmtAltKm = km => km < 10 ? Math.round(km * 1000).toLocaleString('fr-FR') + ' m' : (km < 1000 ? km.toFixed(1) : Math.round(km).toLocaleString('fr-FR')) + ' km';
export const fmtAlt = km => fmtBig(km) || fmtAltKm(km);
