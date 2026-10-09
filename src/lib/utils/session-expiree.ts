import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { ApiError } from '$lib/api/client';

/**
 * `session.requeteAuthentifiee` rejoue une fois l'appel après refresh ; si le
 * `401` persiste, la session est perdue. Renvoie `true` (et redirige vers la
 * connexion) dans ce cas, pour que l'appelant n'affiche pas d'erreur de plus.
 */
export async function redirigerSiSessionExpiree(erreur: unknown): Promise<boolean> {
	if (erreur instanceof ApiError && erreur.status === 401) {
		await goto(resolve('/connexion'));
		return true;
	}
	return false;
}
