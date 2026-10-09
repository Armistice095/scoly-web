import { PUBLIC_API_URL } from '$env/static/public';
import { ApiError, CODE_RESEAU, STATUT_RESEAU } from './client';
import type { components } from './generated/verification';

/**
 * Vérification publique d'un document — `POST /verification` (voir
 * docs/API_VERIFICATION.md et openapi/verification.yaml, dont viennent les types).
 *
 * Service volontairement ISOLÉ du client `api` : route publique, donc
 *  - jamais de cookie ni d'en-tête Authorization (`credentials: 'omit'`) ;
 *  - jamais de cache (`cache: 'no-store'`) : un document actif aujourd'hui peut être annulé demain ;
 *  - jamais de Referer (`referrerPolicy: 'no-referrer'`) ;
 *  - le jeton et la référence restent dans le CORPS, jamais dans l'URL ;
 *  - rien n'est journalisé ici (ni jeton, ni référence, ni nom d'établissement).
 */

export type ReponseVerification = components['schemas']['VerificationResponse'];
export type DocumentPublic = components['schemas']['DocumentPublic'];
export type EtablissementPublic = components['schemas']['EtablissementPublic'];
export type ResultatVerification = ReponseVerification['resultat'];

/** Parcours QR : `{ token }`. Saisie : `{ reference }`, + `etablissement` après un AMBIGU. Jamais les deux modes. */
export type DemandeVerification = { token: string } | { reference: string; etablissement?: string };

/** Ce que le front doit faire d'une erreur (voir API_VERIFICATION.md §7). */
export type GenreErreurVerification =
	/** 400 CHAMP_VIDE / FORMAT_INVALIDE : à afficher sous le champ `champ`. */
	| 'champ'
	/** 429 TROP_DE_REQUETES : attendre `retryAfterSecondes`. */
	| 'limite'
	/** 500, 5xx ou coupure réseau : proposer de réessayer. JAMAIS « Introuvable ». */
	| 'indisponible'
	/** 400 VALIDATION_ERROR, corps illisible, réponse inattendue : bug du front. */
	| 'bug';

export class ErreurVerification extends ApiError {
	constructor(
		public genre: GenreErreurVerification,
		status: number,
		message: string,
		code?: string,
		/** Champ désigné par `erreurs[0].champ` (genre `champ`). */
		public champ?: string,
		/** Délai avant de pouvoir réessayer (genre `limite`). */
		public retryAfterSecondes?: number,
		messages?: string[]
	) {
		super(status, message, code, undefined, messages ?? [message]);
		this.name = 'ErreurVerification';
	}
}

const BASE_URL = PUBLIC_API_URL ?? 'http://localhost:3000';

const RESULTATS: readonly string[] = ['VALIDE', 'ANNULE', 'INTROUVABLE', 'AMBIGU'];
const DELAI_PAR_DEFAUT_S = 60;

const MESSAGE_RESEAU =
	'Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.';
const MESSAGE_INDISPONIBLE =
	'Le service de vérification est momentanément indisponible. Veuillez réessayer dans quelques instants.';
const MESSAGE_LIMITE =
	'Trop de vérifications en peu de temps. Veuillez patienter avant de réessayer.';

interface CorpsErreur {
	code?: string;
	message?: string | string[];
	erreurs?: { champ?: string; message?: string }[];
	retryAfterSecondes?: number;
}

const phrases = (message: CorpsErreur['message']): string[] =>
	(Array.isArray(message) ? message : message ? [message] : []).filter(
		(m): m is string => typeof m === 'string' && m.trim() !== ''
	);

async function erreurDepuisReponse(response: Response): Promise<ErreurVerification> {
	const corps: CorpsErreur = await response.json().catch(() => ({}));
	const messages = phrases(corps.message);
	const { status } = response;

	if (status === 429) {
		// Le corps est la source fiable : `Retry-After` n'est lisible en cross-origin que s'il est exposé par CORS.
		const entete = Number.parseInt(response.headers.get('Retry-After') ?? '', 10);
		const delai = [corps.retryAfterSecondes, entete].find(
			(n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0
		);
		return new ErreurVerification(
			'limite',
			status,
			messages[0] ?? MESSAGE_LIMITE,
			corps.code,
			undefined,
			Math.ceil(delai ?? DELAI_PAR_DEFAUT_S)
		);
	}

	if (status === 400 && (corps.code === 'CHAMP_VIDE' || corps.code === 'FORMAT_INVALIDE')) {
		const champ = corps.erreurs?.[0]?.champ;
		const lisibles = messages.length ? messages : phrases(corps.erreurs?.[0]?.message);
		return new ErreurVerification(
			'champ',
			status,
			lisibles.join(' ') || 'La saisie n’est pas valide.',
			corps.code,
			champ,
			undefined,
			lisibles
		);
	}

	if (status >= 500) {
		return new ErreurVerification(
			'indisponible',
			status,
			messages[0] ?? MESSAGE_INDISPONIBLE,
			corps.code
		);
	}

	// VALIDATION_ERROR, 400 sans code (corps illisible), 401/404…: ce n'est pas la faute de l'utilisateur.
	return new ErreurVerification('bug', status, 'Réponse inattendue du serveur.', corps.code);
}

/**
 * Vérifie un document. Rejette avec une `ErreurVerification` (ou une `AbortError` si `signal` est annulé :
 * à ignorer par l'appelant, ce n'est pas une erreur à afficher).
 */
export async function verifierDocument(
	demande: DemandeVerification,
	signal?: AbortSignal
): Promise<ReponseVerification> {
	let response: Response;
	try {
		response = await fetch(`${BASE_URL}/verification`, {
			method: 'POST',
			// CORS : seul `Content-Type` est autorisé côté API. Pas d'Authorization, pas de cookie.
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(demande),
			credentials: 'omit',
			cache: 'no-store',
			referrerPolicy: 'no-referrer',
			signal
		});
	} catch (erreur) {
		if (erreur instanceof DOMException && erreur.name === 'AbortError') throw erreur;
		throw new ErreurVerification('indisponible', STATUT_RESEAU, MESSAGE_RESEAU, CODE_RESEAU);
	}

	if (!response.ok) throw await erreurDepuisReponse(response);

	const corps: unknown = await response.json().catch(() => null);
	if (
		typeof corps !== 'object' ||
		corps === null ||
		!RESULTATS.includes((corps as { resultat?: string }).resultat ?? '')
	) {
		throw new ErreurVerification('bug', response.status, 'Réponse inattendue du serveur.');
	}
	return corps as ReponseVerification;
}
