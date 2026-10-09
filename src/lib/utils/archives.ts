import type {
	ArchiveListe,
	PersonneArchive,
	StatutArchive,
	TriArchives,
	TypeEvenementArchive
} from '$lib/types';
import { nomFichierPdf } from './telechargement';

/* ------------------------------------------------------------------ */
/* Dates : les instants de l'API sont en UTC, l'affichage est béninois  */
/* ------------------------------------------------------------------ */

const FUSEAU = 'Africa/Porto-Novo';

const formatDate = new Intl.DateTimeFormat('fr-FR', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	timeZone: FUSEAU
});
const formatHeure = new Intl.DateTimeFormat('fr-FR', {
	hour: '2-digit',
	minute: '2-digit',
	timeZone: FUSEAU
});

/** `2026-10-03T13:31:00.000Z` → « 3 oct. 2026 » (fuseau Africa/Porto-Novo). */
export function formaterDate(iso: string): string {
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? iso : formatDate.format(date);
}

/** `2026-10-03T13:31:00.000Z` → « 14:31 » (fuseau Africa/Porto-Novo). */
export function formaterHeure(iso: string): string {
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? '' : formatHeure.format(date);
}

/** « 3 oct. 2026 · 14:31 » */
export const formaterDateHeure = (iso: string): string =>
	`${formaterDate(iso)} · ${formaterHeure(iso)}`;

/* ------------------------------------------------------------------ */
/* Libellés                                                            */
/* ------------------------------------------------------------------ */

export const LIBELLE_STATUT_ARCHIVE: Record<StatutArchive, string> = {
	ACTIF: 'Actif',
	ANNULE: 'Annulé'
};

export const LIBELLE_EVENEMENT: Record<TypeEvenementArchive, string> = {
	ETABLI: 'Établi',
	TELECHARGE: 'Téléchargé',
	ANNULE: 'Annulé'
};

export const LIBELLE_TRI: Record<TriArchives, string> = {
	recent: 'Plus récents d’abord',
	ancien: 'Plus anciens d’abord'
};

/** « Eugène Sèdjro (Directeur) » */
export const libellePersonne = (p: PersonneArchive): string => `${p.nomComplet} (${p.fonction})`;

/** « 25 documents » / « 1 document » */
export const libelleTotal = (total: number): string =>
	`${total} ${total > 1 ? 'documents' : 'document'}`;

/** Nombre maximal de téléchargements listés dans l'historique (API_ARCHIVES.md §4). */
export const MAX_TELECHARGEMENTS_LISTES = 100;

/* ------------------------------------------------------------------ */
/* Paramètres d'URL (?q=&type=&statut=&tri=&page=) — valeurs défensives */
/* ------------------------------------------------------------------ */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un identifiant mal formé dans l'URL est ignoré plutôt que d'envoyer une requête vouée au `400`. */
export const lireUuid = (valeur: string | null): string =>
	valeur && UUID.test(valeur) ? valeur : '';

export const lireStatut = (valeur: string | null): StatutArchive | '' =>
	valeur === 'ACTIF' || valeur === 'ANNULE' ? valeur : '';

export const lireTri = (valeur: string | null): TriArchives =>
	valeur === 'ancien' ? 'ancien' : 'recent';

export const lirePage = (valeur: string | null): number =>
	Math.max(1, Number.parseInt(valeur ?? '', 10) || 1);

/* ------------------------------------------------------------------ */
/* Annulation                                                          */
/* ------------------------------------------------------------------ */

export const MOTIF_MIN = 5;
export const MOTIF_MAX = 500;

/** Règles du contrat (§5) : 5 à 500 caractères, espaces autour retirés. `null` = valide. */
export function validerMotif(motif: string): string | null {
	const valeur = motif.trim();
	if (!valeur) return 'Indiquez le motif de l’annulation.';
	if (valeur.length < MOTIF_MIN) return `Le motif doit contenir au moins ${MOTIF_MIN} caractères.`;
	if (valeur.length > MOTIF_MAX) return `Le motif ne doit pas dépasser ${MOTIF_MAX} caractères.`;
	return null;
}

/* ------------------------------------------------------------------ */
/* Cible d'une action (menu, fiche, aperçu, annulation)                 */
/* ------------------------------------------------------------------ */

/** Ce qu'il faut savoir d'un document pour le télécharger, l'annuler ou le prévisualiser. */
export interface CibleDocument {
	id: string;
	reference: string;
	typeNom: string;
	eleveNom: string;
}

export const cibleDepuisLigne = (l: ArchiveListe): CibleDocument => ({
	id: l.id,
	reference: l.reference,
	typeNom: l.typeDocument.nom,
	eleveNom: l.eleve.nomComplet
});

/** Nom de repli du PDF, si le lien signé ne l'impose pas : `<Type> - <Élève>.pdf`. */
export const nomFichierDocument = (c: CibleDocument): string =>
	nomFichierPdf(c.typeNom, c.eleveNom);
