import { PUBLIC_API_URL } from '$env/static/public';

/**
 * Client HTTP minimal vers scoly-api.
 * Centralise l'URL de base, l'injection du token JWT, et les erreurs.
 *
 * Contrat d'erreur (voir docs/API_AUTH.md) : toute réponse en erreur a la
 * forme `{ statusCode, message, code? }`. `code` n'est présent que sur les
 * erreurs que le front doit traiter spécifiquement (ex. COMPTE_NON_ACTIVE).
 *
 * Particularités :
 * - Erreurs de validation (`400`, `code: "VALIDATION_ERROR"`) : `message` est
 *   un tableau de phrases ; `erreurs` liste `{ champ, message }`.
 * - Import Excel (`code: "IMPORT_INVALIDE"`) : `erreurs` liste `{ ligne, messages }`.
 *   Le même mot « erreurs » a donc deux formes selon `code` — voir
 *   `lib/utils/erreurs-api.ts` pour les extraire de façon typée.
 *
 * L'authentification se fait par `Authorization: Bearer <accessToken>`
 * (pas de cookies) — voir `token` ci-dessous et `lib/stores/session.svelte.ts`
 * pour la gestion du token courant et du rafraîchissement.
 */

const BASE_URL = PUBLIC_API_URL ?? 'http://localhost:3000';

/** `status` de l'`ApiError` quand le serveur n'a pas pu être joint (coupure réseau, API arrêtée). */
export const STATUT_RESEAU = 0;
export const CODE_RESEAU = 'RESEAU';

interface CorpsErreurApi {
	statusCode?: number;
	message?: string | string[];
	code?: string;
	erreurs?: unknown;
	retryAfterSecondes?: number;
}

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
		public code?: string,
		/** Détail brut `erreurs` du corps (forme dépendante de `code`). */
		public erreurs?: unknown,
		/** Toutes les phrases d'erreur (une seule hors validation). */
		public messages: string[] = [message],
		/** Présent sur `429 TROP_DE_REQUETES` : délai avant de réessayer. */
		public retryAfterSecondes?: number
	) {
		super(message);
		this.name = 'ApiError';
	}
}

interface RequestOptions extends RequestInit {
	/** Token à joindre en `Authorization: Bearer <token>`, pour les routes protégées. */
	token?: string;
}

function estAnnulation(erreur: unknown): boolean {
	return erreur instanceof DOMException && erreur.name === 'AbortError';
}

/** Envoie la requête et convertit toute réponse non-2xx (ou coupure réseau) en `ApiError`. */
async function envoyer(path: string, options: RequestOptions = {}): Promise<Response> {
	const { token, headers, ...reste } = options;
	// FormData (téléversement d'images, §3 de API_ETABLISSEMENT.md) : ne pas
	// fixer Content-Type nous-mêmes, le navigateur doit poser son propre
	// boundary multipart.
	const estFormData = reste.body instanceof FormData;

	let response: Response;
	try {
		response = await fetch(`${BASE_URL}${path}`, {
			...reste,
			headers: {
				...(estFormData || !reste.body ? {} : { 'Content-Type': 'application/json' }),
				...(token ? { Authorization: `Bearer ${token}` } : {}),
				...headers
			}
		});
	} catch (erreur) {
		// Une requête annulée volontairement (AbortController) n'est pas une erreur à afficher.
		if (estAnnulation(erreur)) throw erreur;
		throw new ApiError(
			STATUT_RESEAU,
			'Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.',
			CODE_RESEAU
		);
	}

	if (!response.ok) {
		const body: CorpsErreurApi = await response.json().catch(() => ({}));
		const messages = Array.isArray(body.message)
			? body.message
			: body.message
				? [body.message]
				: [`Erreur API (${response.status})`];
		throw new ApiError(
			response.status,
			messages.join(' '),
			body.code,
			body.erreurs,
			messages,
			typeof body.retryAfterSecondes === 'number' ? body.retryAfterSecondes : undefined
		);
	}

	return response;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const response = await envoyer(path, options);

	if (response.status === 204) {
		return undefined as T;
	}

	return response.json() as Promise<T>;
}

/** Extrait le nom de fichier d'un en-tête `Content-Disposition` (`filename*` prioritaire). */
function nomFichierDepuisEntete(entete: string | null): string | null {
	if (!entete) return null;
	const etendu = /filename\*=UTF-8''([^;]+)/i.exec(entete);
	if (etendu) {
		try {
			return decodeURIComponent(etendu[1]);
		} catch {
			/* on retombe sur filename= */
		}
	}
	const simple = /filename="?([^";]+)"?/i.exec(entete);
	return simple ? simple[1] : null;
}

export interface FichierTelecharge {
	blob: Blob;
	/** Nom proposé par l'API (`Content-Disposition`), s'il est présent. */
	nomFichier: string | null;
}

export const api = {
	get: <T>(path: string, options?: RequestOptions) =>
		request<T>(path, { ...options, method: 'GET' }),
	post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
		request<T>(path, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
	patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
		request<T>(path, {
			...options,
			method: 'PATCH',
			body: body ? JSON.stringify(body) : undefined
		}),
	delete: <T>(path: string, options?: RequestOptions) =>
		request<T>(path, { ...options, method: 'DELETE' }),
	/** Téléversement multipart (champ `fichier`, voir API_ETABLISSEMENT.md §3). */
	upload: <T>(path: string, fichier: File, options?: RequestOptions) => {
		const formData = new FormData();
		formData.append('fichier', fichier);
		return request<T>(path, { ...options, method: 'POST', body: formData });
	},
	/**
	 * Téléchargement d'un fichier protégé : un `<a href>` n'enverrait pas le
	 * header `Authorization`, on récupère donc le `blob` puis le front déclenche
	 * lui-même le téléchargement (voir `lib/utils/telechargement.ts`).
	 */
	telecharger: async (path: string, options?: RequestOptions): Promise<FichierTelecharge> => {
		const response = await envoyer(path, { ...options, method: 'GET' });
		return {
			blob: await response.blob(),
			nomFichier: nomFichierDepuisEntete(response.headers.get('Content-Disposition'))
		};
	},
	/**
	 * Comme `telecharger`, mais en POST avec un corps JSON (ex. l'aperçu PDF d'un
	 * document). En cas d'erreur, l'API répond en JSON : `ApiError` comme partout.
	 */
	postBlob: async (
		path: string,
		body: unknown,
		options?: RequestOptions
	): Promise<FichierTelecharge> => {
		const response = await envoyer(path, {
			...options,
			method: 'POST',
			body: JSON.stringify(body)
		});
		return {
			blob: await response.blob(),
			nomFichier: nomFichierDepuisEntete(response.headers.get('Content-Disposition'))
		};
	}
};
