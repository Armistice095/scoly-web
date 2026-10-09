import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { authApi } from '$lib/api/auth';
import { notifications } from '$lib/stores/notifications.svelte';
import { session } from '$lib/stores/session.svelte';

/** Délai maximal accordé à l'appel de déconnexion : on ne bloque jamais l'utilisateur sur le réseau. */
const DELAI_MAX_MS = 5000;

let enCours = false;

/** `true` pendant une déconnexion voulue : la perte de session qui en découle n'est pas une « expiration ». */
export function deconnexionEnCours(): boolean {
	return enCours;
}

/**
 * Purge tout l'état local de l'utilisateur : session (access token en mémoire, refresh
 * token stocké, utilisateur, établissement) et notifications. À appeler sans condition,
 * qu'il s'agisse d'une déconnexion, d'une session expirée ou d'un échec de l'API.
 */
export function purgerEtatLocal() {
	notifications.reinitialiser();
	session.effacer();
}

/**
 * Déconnexion (API_AUTH.md §13). L'API répond 204 dans tous les cas ; côté front le
 * résultat de l'appel ne change donc rien : succès, échec réseau, 401, 429 ou
 * session déjà expirée, on purge l'état local puis on redirige vers /connexion.
 */
export async function seDeconnecter(): Promise<void> {
	if (enCours) return;
	enCours = true;

	// Les jetons sont lus avant la purge, uniquement pour être envoyés à l'API : jamais journalisés.
	const accessToken = session.accessToken;
	const refreshToken = session.lireRefreshToken();

	const abandon = new AbortController();
	const delai = setTimeout(() => abandon.abort(), DELAI_MAX_MS);
	try {
		await authApi.deconnexion(accessToken, refreshToken, abandon.signal);
	} catch {
		// Volontairement ignoré : l'utilisateur est de toute façon déconnecté côté client.
	} finally {
		clearTimeout(delai);
		purgerEtatLocal();
		try {
			await goto(resolve('/connexion'), { replaceState: true });
		} finally {
			enCours = false;
		}
	}
}
