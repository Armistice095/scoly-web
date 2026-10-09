import { browser } from '$app/environment';
import { authApi } from '$lib/api/auth';
import { ApiError, CODE_RESEAU, STATUT_RESEAU } from '$lib/api/client';
import type { AuthReponse, Etablissement, Utilisateur } from '$lib/types';

/**
 * Session courante.
 *
 * - `accessToken` : uniquement en mémoire (jamais persisté), durée de vie
 *   courte (15 min côté back). Se perd donc à chaque rechargement de page —
 *   c'est voulu, voir `tenterRestauration`.
 * - `refreshToken` : persisté en localStorage pour survivre à un rechargement
 *   ou une fermeture d'onglet. `resterConnecte` (voir §4 de l'API) contrôle
 *   sa durée de vie côté back (7 j / 1 j), pas son stockage côté front.
 */

const CLE_REFRESH_TOKEN = 'scoly.refreshToken';

/**
 * Appelé une seule fois quand la session est perdue sans que l'utilisateur
 * l'ait demandé (refresh refusé, 401 persistant). Enregistré par le layout
 * `(app)` : il purge les caches, prévient l'utilisateur et redirige. Le store
 * de session reste ainsi indépendant du routeur et des autres stores.
 */
let surSessionPerdue: (() => void) | null = null;

let utilisateur = $state<Utilisateur | null>(null);
let etablissement = $state<Etablissement | null>(null);
let accessToken = $state<string | null>(null);

function lireRefreshTokenStocke(): string | null {
	if (!browser) return null;
	return localStorage.getItem(CLE_REFRESH_TOKEN);
}

function ecrireRefreshTokenStocke(valeur: string | null) {
	if (!browser) return;
	if (valeur) {
		localStorage.setItem(CLE_REFRESH_TOKEN, valeur);
	} else {
		localStorage.removeItem(CLE_REFRESH_TOKEN);
	}
}

function definir(reponse: AuthReponse) {
	utilisateur = reponse.utilisateur;
	etablissement = reponse.etablissement;
	accessToken = reponse.accessToken;
	ecrireRefreshTokenStocke(reponse.refreshToken);
}

function effacer() {
	utilisateur = null;
	etablissement = null;
	accessToken = null;
	ecrireRefreshTokenStocke(null);
}

/** Met à jour l'établissement en session après une modification dans Paramètres. */
function mettreAJourEtablissement(valeur: Etablissement) {
	etablissement = valeur;
}

/** Met à jour l'utilisateur en session après une modification de profil/notifications. */
function mettreAJourUtilisateur(valeur: Utilisateur) {
	utilisateur = valeur;
}

/**
 * Tente de restaurer la session à partir du refresh token stocké (§8).
 * À appeler au chargement d'une page qui a besoin d'être connectée, ou de
 * la page de connexion elle-même (pour rediriger si déjà connecté).
 * Retourne `true` si la session a bien été restaurée.
 */
/**
 * Le refresh token est à usage unique (API_AUTH.md §8) : deux rafraîchissements
 * simultanés se verraient comme un rejeu et révoqueraient TOUTE la session. Tous
 * les appelants (garde, polling, pages) partagent donc le même appel en cours.
 */
let restaurationEnCours: Promise<boolean> | null = null;

function tenterRestauration(): Promise<boolean> {
	restaurationEnCours ??= restaurer().finally(() => {
		restaurationEnCours = null;
	});
	return restaurationEnCours;
}

async function restaurer(): Promise<boolean> {
	const refreshToken = lireRefreshTokenStocke();
	if (!refreshToken) return false;

	try {
		const reponse = await authApi.rafraichir(refreshToken);
		definir(reponse);
		return true;
	} catch (erreur) {
		// Un refus du serveur (401) ou un jeton illisible = session perdue. Une coupure
		// réseau ne l'est pas : on garde le refresh token pour réessayer plus tard.
		if (erreur instanceof ApiError && erreur.status === STATUT_RESEAU) return false;
		effacer();
		return false;
	}
}

/** Perte de session subie : on efface, puis le layout redirige (une seule fois). */
function signalerSessionPerdue() {
	effacer();
	surSessionPerdue?.();
}

/**
 * Enveloppe un appel à une route protégée : fournit le token courant, et si
 * la route renvoie `401` (accessToken expiré, durée de vie 15 min), tente une
 * fois un rafraîchissement silencieux avant de rejouer l'appel. Si le
 * rafraîchissement échoue aussi, la session est effacée et l'erreur d'origine
 * est renvoyée (au composant appelant de rediriger vers /connexion).
 */
async function requeteAuthentifiee<T>(appel: (token: string) => Promise<T>): Promise<T> {
	if (!accessToken && !(await tenterRestauration())) {
		// Coupure réseau : pas de session « expirée », juste un échec à afficher.
		if (lireRefreshTokenStocke()) {
			throw new ApiError(
				STATUT_RESEAU,
				'Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.',
				CODE_RESEAU
			);
		}
		signalerSessionPerdue();
		throw new ApiError(401, 'Session expirée, veuillez vous reconnecter.');
	}

	try {
		return await appel(accessToken!);
	} catch (erreur) {
		if (erreur instanceof ApiError && erreur.status === 401) {
			// Un autre appel a pu rafraîchir entre-temps : `tenterRestauration` est partagé.
			if (await tenterRestauration()) return await appel(accessToken!);
			signalerSessionPerdue();
		}
		throw erreur;
	}
}

export const session = {
	get utilisateur() {
		return utilisateur;
	},
	get etablissement() {
		return etablissement;
	},
	get accessToken() {
		return accessToken;
	},
	get estConnecte() {
		return accessToken !== null;
	},
	/** Pour l'appel de déconnexion uniquement : jamais affiché ni journalisé. */
	lireRefreshToken: lireRefreshTokenStocke,
	/** Enregistre le gestionnaire global de perte de session (retourne la fonction de retrait). */
	surPerteDeSession(gestionnaire: () => void) {
		surSessionPerdue = gestionnaire;
		return () => {
			if (surSessionPerdue === gestionnaire) surSessionPerdue = null;
		};
	},
	definir,
	effacer,
	tenterRestauration,
	requeteAuthentifiee,
	mettreAJourEtablissement,
	mettreAJourUtilisateur
};
