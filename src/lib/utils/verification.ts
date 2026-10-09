/**
 * Utilitaires de la page publique de vérification (docs/API_VERIFICATION.md).
 * Aucune horloge du navigateur ici : toute date affichée vient de la réponse du serveur.
 */

const FUSEAU = 'Africa/Porto-Novo';

/** Longueur au-delà de laquelle un jeton ne peut pas venir d'un QR Scoly (jeton réel : 32 caractères). */
export const LONGUEUR_MAX_JETON = 512;

/** Nombre de précisions « nom de l'établissement » tentées avant de n'orienter que vers le QR / le contact. */
export const PRECISIONS_MAX = 2;

const formatJour = new Intl.DateTimeFormat('fr-FR', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	// Un jour civil n'a pas de fuseau : on le fabrique en UTC et on l'affiche en UTC, sans décalage possible.
	timeZone: 'UTC'
});
const formatInstantJour = new Intl.DateTimeFormat('fr-FR', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: FUSEAU
});
const formatInstantHeure = new Intl.DateTimeFormat('fr-FR', {
	hour: '2-digit',
	minute: '2-digit',
	timeZone: FUSEAU
});

/** `2026-09-28` → « 28 septembre 2026 ». Jour civil : jamais converti de fuseau. */
export function formaterJourCivil(jour: string | null | undefined): string | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(jour ?? '');
	if (!m) return null;
	const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
	return Number.isNaN(date.getTime()) ? null : formatJour.format(date);
}

/**
 * `verifieLe` (instant UTC du SERVEUR) → « 5 octobre 2026 à 18:47 », en Africa/Porto-Novo.
 * Renvoie `null` si l'instant est illisible : on n'invente jamais une heure avec l'horloge locale.
 */
export function formaterInstantServeur(iso: string | null | undefined): string | null {
	const date = new Date(iso ?? '');
	if (Number.isNaN(date.getTime())) return null;
	return `${formatInstantJour.format(date)} à ${formatInstantHeure.format(date)}`;
}

/** `+229 01 00 00 00 00` → `+22901000000000` : à préfixer par `tel:` (espaces et séparateurs retirés du lien). */
export const numeroPourLien = (telephone: string): string => telephone.replace(/[^\d+]/g, '');

/** 42 → « 42 s » ; 125 → « 2 min 05 s » ; 600 → « 10 min ». */
export function formaterDelai(secondes: number): string {
	const s = Math.max(0, Math.ceil(secondes));
	if (s < 60) return `${s} s`;
	const min = Math.floor(s / 60);
	const reste = s % 60;
	return reste === 0 ? `${min} min` : `${min} min ${String(reste).padStart(2, '0')} s`;
}

/** Un jeton exploitable : non vide (hors espaces) et de longueur plausible. */
export const jetonVide = (jeton: string): boolean => jeton.trim() === '';
export const jetonTropLong = (jeton: string): boolean => jeton.length > LONGUEUR_MAX_JETON;

/**
 * Point UNIQUE de signalement des bugs du front sur cette page (réponse inattendue, VALIDATION_ERROR…).
 * Ne reçoit volontairement que des métadonnées techniques : jamais la référence, le jeton ni le nom
 * d'établissement. Brancher ici l'outil de monitoring le jour où il y en aura un.
 */
export function signalerBugVerification(meta: { statut: number; code?: string }): void {
	console.error('[verification] réponse inattendue', { statut: meta.statut, code: meta.code });
}

/** Titres des écrans de résultat (aussi annoncés aux lecteurs d'écran). */
export const TITRES_RESULTAT = {
	VALIDE: 'Authenticité du document confirmée',
	ANNULE: 'Document annulé',
	INTROUVABLE: 'Document introuvable'
} as const;

export const TITRE_AMBIGU = 'Plusieurs documents portent cette référence';
export const TITRE_AMBIGU_FINAL = 'Impossible d’identifier l’établissement';

/** Message générique pour un bug du front (le détail technique n'a rien à faire sous les yeux du public). */
export const MESSAGE_BUG =
	'Une erreur inattendue est survenue. Veuillez réessayer. Si le problème persiste, contactez l’établissement émetteur.';
