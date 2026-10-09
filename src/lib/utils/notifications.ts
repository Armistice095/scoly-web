import { resolve } from '$app/paths';
import { ApiError, CODE_RESEAU } from '$lib/api/client';
import type {
	CategorieNotification,
	GroupeNotification,
	Notification,
	TypeNotification
} from '$lib/types';
import { CODE_TROP_DE_REQUETES } from '$lib/types';

/** Icône (voir `Icon.svelte`) de chaque type : elle dépend de l'événement, pas de la catégorie. */
export const ICONE_NOTIFICATION = {
	DOCUMENT_ETABLI: 'notifDocument',
	DOCUMENT_ANNULE: 'notifDocumentAnnule',
	IMPORT_TERMINE: 'upload',
	NOUVEL_ELEVE: 'user',
	ALERTE_MATRICULE_EDUCMASTER: 'warn'
} as const satisfies Record<TypeNotification, string>;

export const CATEGORIES: { valeur: CategorieNotification; libelle: string }[] = [
	{ valeur: 'DOCUMENTS', libelle: 'Documents' },
	{ valeur: 'ELEVES', libelle: 'Élèves' },
	{ valeur: 'IMPORTS', libelle: 'Imports' },
	{ valeur: 'ALERTES', libelle: 'Alertes' }
];

export const GROUPES: { valeur: GroupeNotification; libelle: string }[] = [
	{ valeur: 'AUJOURD_HUI', libelle: 'Aujourd’hui' },
	{ valeur: 'HIER', libelle: 'Hier' },
	{ valeur: 'PLUS_ANCIEN', libelle: 'Plus ancien' }
];

/** Badge de la cloche : masqué à 0 (`null`), « 9+ » au-delà de 9. */
export function libelleBadge(nonLues: number): string | null {
	if (nonLues <= 0) return null;
	return nonLues > 9 ? '9+' : String(nonLues);
}

/** Libellé accessible de la cloche, avec le nombre de non lues. */
export function libelleCloche(nonLues: number): string {
	if (nonLues <= 0) return 'Notifications';
	return `Notifications, ${nonLues} non lue${nonLues > 1 ? 's' : ''}`;
}

export function libelleNonLues(nonLues: number): string {
	if (nonLues <= 0) return 'Aucune notification non lue';
	return `${nonLues} notification${nonLues > 1 ? 's' : ''} non lue${nonLues > 1 ? 's' : ''}`;
}

/**
 * Route où mène une notification, ou `null` (pas de cible : on marque seulement comme lue).
 * Le serveur ne donne que `cible` ; le choix de la route est du ressort du front.
 */
export function routeDeLaCible(notification: Notification): string | null {
	const cible = notification.cible;
	if (!cible) return null;
	switch (cible.type) {
		case 'DOCUMENT':
			return cible.id ? `${resolve('/archives')}?ouvrir=${encodeURIComponent(cible.id)}` : null;
		case 'ELEVE':
			return cible.id ? `${resolve('/eleves')}?ouvrir=${encodeURIComponent(cible.id)}` : null;
		case 'ELEVES':
			return resolve('/eleves');
		default:
			return null;
	}
}

// --- Dates : instants UTC (ISO 8601) → texte français, fuseau local du navigateur ---

const formatHeure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const formatDateCourte = new Intl.DateTimeFormat('fr-FR', {
	day: 'numeric',
	month: 'short',
	year: 'numeric'
});

const MINUTE = 60_000;
const HEURE = 60 * MINUTE;

function debutDeJour(date: Date): number {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Temps relatif de la maquette : « À l'instant », « Il y a 12 min », « Il y a 1 h »,
 * « Hier, 16:40 », « Il y a 3 jours », puis une date au-delà de 30 jours.
 *
 * `groupe` (fourni par le serveur sur le jour civil du Bénin) tranche entre
 * « aujourd'hui », « hier » et « plus ancien » pour que le texte de la ligne et son
 * titre de section ne se contredisent jamais ; l'heure affichée reste, elle, locale.
 */
export function formaterTempsRelatif(
	iso: string,
	groupe: GroupeNotification,
	maintenant: Date = new Date()
): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';

	const ecart = maintenant.getTime() - date.getTime();

	if (groupe === 'AUJOURD_HUI') {
		if (ecart < MINUTE) return 'À l’instant';
		if (ecart < HEURE) return `Il y a ${Math.floor(ecart / MINUTE)} min`;
		return `Il y a ${Math.floor(ecart / HEURE)} h`;
	}
	if (groupe === 'HIER') return `Hier, ${formatHeure.format(date)}`;

	const jours = Math.max(
		2,
		Math.round((debutDeJour(maintenant) - debutDeJour(date)) / (24 * HEURE))
	);
	return jours <= 30 ? `Il y a ${jours} jours` : formatDateCourte.format(date);
}

/** Valeur pour l'attribut `datetime` de `<time>` (ISO 8601, inchangée). */
export function dateHeureAttribut(iso: string): string {
	return Number.isNaN(new Date(iso).getTime()) ? '' : iso;
}

// --- Erreurs ---

/** Message français pour une erreur de l'API Notifications (dont 429 et 5xx). */
export function messageErreurNotifications(erreur: unknown): string {
	if (!(erreur instanceof ApiError)) {
		return 'Une erreur inattendue est survenue. Veuillez réessayer.';
	}
	if (erreur.code === CODE_RESEAU) return erreur.message;
	if (erreur.status === 429 || erreur.code === CODE_TROP_DE_REQUETES) {
		const secondes = erreur.retryAfterSecondes;
		return secondes
			? `Trop de requêtes. Réessayez dans ${secondes} seconde${secondes > 1 ? 's' : ''}.`
			: 'Trop de requêtes. Réessayez dans quelques instants.';
	}
	if (erreur.status >= 500) {
		return 'Le service est momentanément indisponible. Réessayez dans quelques instants.';
	}
	if (erreur.status === 404) return 'Cette notification n’existe plus.';
	return erreur.message;
}
