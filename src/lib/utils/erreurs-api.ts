import { ApiError } from '$lib/api/client';
import {
	CODE_IMPORT_INVALIDE,
	CODE_VALIDATION_ERROR,
	type ErreurChamp,
	type ErreurLigneImport
} from '$lib/types';

/**
 * Le champ `erreurs` d'une `ApiError` a deux formes selon `code` :
 * - `VALIDATION_ERROR` → `[{ champ, message }]`
 * - `IMPORT_INVALIDE`  → `[{ ligne, messages }]`
 * On les distingue ici, de façon défensive (le corps vient du réseau).
 */

/** Messages de validation par champ, ou `null` si l'erreur n'est pas de ce type. */
export function erreursParChamp(erreur: unknown): ErreurChamp[] | null {
	if (!(erreur instanceof ApiError) || erreur.code !== CODE_VALIDATION_ERROR) return null;
	if (!Array.isArray(erreur.erreurs)) return null;
	const liste = erreur.erreurs.filter(
		(e): e is ErreurChamp =>
			typeof e === 'object' &&
			e !== null &&
			typeof (e as ErreurChamp).champ === 'string' &&
			typeof (e as ErreurChamp).message === 'string'
	);
	return liste.length > 0 ? liste : null;
}

/** Erreurs de l'import Excel par ligne, ou `null` si l'erreur n'est pas de ce type. */
export function erreursParLigne(erreur: unknown): ErreurLigneImport[] | null {
	if (!(erreur instanceof ApiError) || erreur.code !== CODE_IMPORT_INVALIDE) return null;
	if (!Array.isArray(erreur.erreurs)) return null;
	const liste = erreur.erreurs
		.filter(
			(e): e is ErreurLigneImport =>
				typeof e === 'object' &&
				e !== null &&
				typeof (e as ErreurLigneImport).ligne === 'number' &&
				Array.isArray((e as ErreurLigneImport).messages)
		)
		.sort((a, b) => a.ligne - b.ligne);
	return liste.length > 0 ? liste : null;
}

export const MESSAGE_ERREUR_INCONNUE = 'Une erreur inattendue est survenue. Veuillez réessayer.';

export function messageErreur(erreur: unknown): string {
	return erreur instanceof ApiError ? erreur.message : MESSAGE_ERREUR_INCONNUE;
}
