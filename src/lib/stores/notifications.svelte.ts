import { notificationsApi } from '$lib/api/notifications';
import { ApiError } from '$lib/api/client';
import { session } from '$lib/stores/session.svelte';
import { toast } from '$lib/stores/toast.svelte';
import type { CategorieNotification, Notification } from '$lib/types';
import { messageErreurNotifications } from '$lib/utils/notifications';

/**
 * Notifications de l'utilisateur : badge de la cloche, menu déroulant et Centre
 * de notifications partagent ce store, pour qu'un « marquer comme lue » fait
 * dans l'un soit visible tout de suite dans les deux autres.
 *
 * Ne garde en mémoire que ce que l'API renvoie pour l'utilisateur courant ;
 * rien n'est écrit dans localStorage/sessionStorage, rien n'est journalisé.
 * `reinitialiser()` vide tout (déconnexion, session perdue).
 */

/** Cadence du polling du compteur (API_NOTIFICATIONS.md §10 : ~45 s). */
const INTERVALLE_POLLING_MS = 45_000;
const PAUSE_MAX_MS = 5 * 60_000;
const TAILLE_MENU = 5;
export const TAILLE_PAGE_CENTRE = 20;

export type EtatListe = 'initial' | 'chargement' | 'pret' | 'erreur';

export interface FiltreCentre {
	statut: 'toutes' | 'non_lues';
	categorie: CategorieNotification | '';
}

class ListeNotifications {
	elements = $state<Notification[]>([]);
	curseur = $state<string | null>(null);
	etat = $state<EtatListe>('initial');
	erreur = $state<string | null>(null);
	chargementPlus = $state(false);
	erreurPlus = $state<string | null>(null);

	vider() {
		this.elements = [];
		this.curseur = null;
		this.etat = 'initial';
		this.erreur = null;
		this.chargementPlus = false;
		this.erreurPlus = null;
	}
}

let nonLues = $state(0);
let compteurConnu = $state(false);
const menu = new ListeNotifications();
const centre = new ListeNotifications();

// --- Appels authentifiés ------------------------------------------------------

/** Mutations optimistes en cours : tant qu'il y en a, un résultat de polling serait périmé. */
let mutationsEnCours = 0;
// État interne, jamais lu par l'interface : pas besoin de réactivité.
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const lecturesEnCours = new Set<string>();

function ajusterCompteur(delta: number) {
	nonLues = Math.max(0, nonLues + delta);
}

function trouver(id: string): Notification | undefined {
	return centre.elements.find((n) => n.id === id) ?? menu.elements.find((n) => n.id === id);
}

function appliquer(id: string, fn: (n: Notification) => Notification) {
	for (const liste of [menu, centre]) {
		const i = liste.elements.findIndex((n) => n.id === id);
		if (i !== -1) liste.elements[i] = fn(liste.elements[i]);
	}
}

function retirer(id: string) {
	menu.elements = menu.elements.filter((n) => n.id !== id);
	centre.elements = centre.elements.filter((n) => n.id !== id);
}

// --- Compteur et polling -------------------------------------------------------

let sequenceCompteur = 0;
let minuteur: ReturnType<typeof setInterval> | undefined;
let pauseJusqua = 0;
let echecsConsecutifs = 0;
let actif = false;

async function rafraichirCompteur(forcer = false): Promise<void> {
	// Pas de polling avant `demarrerPolling()` ni après `reinitialiser()` (déconnexion).
	if (!actif || (!forcer && Date.now() < pauseJusqua)) return;
	const sequence = ++sequenceCompteur;
	try {
		const reponse = await session.requeteAuthentifiee((token) => notificationsApi.compteur(token));
		// Résultat périmé : une requête plus récente est partie, ou une action locale est en cours
		// (son propre rafraîchissement suivra).
		if (sequence !== sequenceCompteur || mutationsEnCours > 0) return;
		nonLues = Math.max(0, reponse.nonLues);
		compteurConnu = true;
		echecsConsecutifs = 0;
		pauseJusqua = 0;
	} catch (erreur) {
		if (sequence !== sequenceCompteur) return;
		// Le polling est silencieux : le badge garde sa dernière valeur. On espace les essais.
		if (erreur instanceof ApiError && erreur.status === 429) {
			pauseJusqua = Date.now() + (erreur.retryAfterSecondes ?? 60) * 1000;
		} else if (erreur instanceof ApiError && erreur.status === 401) {
			arreterPolling();
		} else {
			echecsConsecutifs++;
			const attente = Math.min(INTERVALLE_POLLING_MS * 2 ** echecsConsecutifs, PAUSE_MAX_MS);
			pauseJusqua = Date.now() + attente;
		}
	}
}

function auRetourDeLOnglet() {
	if (document.visibilityState === 'visible') void rafraichirCompteur();
}

function auFocus() {
	void rafraichirCompteur();
}

/** Lance le polling : immédiat, puis toutes les ~45 s, suspendu quand l'onglet est masqué. */
function demarrerPolling() {
	if (actif) return;
	actif = true;
	void rafraichirCompteur(true);
	minuteur = setInterval(() => {
		if (document.visibilityState === 'visible') void rafraichirCompteur();
	}, INTERVALLE_POLLING_MS);
	document.addEventListener('visibilitychange', auRetourDeLOnglet);
	window.addEventListener('focus', auFocus);
}

function arreterPolling() {
	actif = false;
	clearInterval(minuteur);
	minuteur = undefined;
	if (typeof document === 'undefined') return;
	document.removeEventListener('visibilitychange', auRetourDeLOnglet);
	window.removeEventListener('focus', auFocus);
}

// --- Chargement des listes -----------------------------------------------------

let abandonMenu: AbortController | undefined;

/** Menu de la cloche : les 5 dernières. Rafraîchit aussi le compteur. */
async function chargerMenu(): Promise<void> {
	abandonMenu?.abort();
	const abandon = (abandonMenu = new AbortController());
	// On garde l'ancienne liste affichée pendant un rechargement ; le squelette n'apparaît qu'au premier chargement.
	if (menu.etat !== 'pret') menu.etat = 'chargement';
	menu.erreur = null;
	void rafraichirCompteur(true);
	try {
		const page = await session.requeteAuthentifiee((token) =>
			notificationsApi.lister(token, { limite: TAILLE_MENU }, abandon.signal)
		);
		if (abandon.signal.aborted) return;
		menu.elements = page.data;
		menu.curseur = page.meta.curseurSuivant;
		menu.etat = 'pret';
	} catch (erreur) {
		if (abandon.signal.aborted || (erreur instanceof DOMException && erreur.name === 'AbortError'))
			return;
		menu.erreur = messageErreurNotifications(erreur);
		menu.etat = menu.elements.length > 0 ? 'pret' : 'erreur';
		if (menu.elements.length > 0) toast.afficher(menu.erreur);
	}
}

let abandonCentre: AbortController | undefined;

/** Première page du Centre pour un filtre donné (annule le chargement précédent). */
async function chargerCentre(filtre: FiltreCentre): Promise<void> {
	abandonCentre?.abort();
	const abandon = (abandonCentre = new AbortController());
	centre.etat = 'chargement';
	centre.erreur = null;
	centre.erreurPlus = null;
	centre.chargementPlus = false;
	void rafraichirCompteur(true);
	try {
		const page = await session.requeteAuthentifiee((token) =>
			notificationsApi.lister(token, { ...filtre, limite: TAILLE_PAGE_CENTRE }, abandon.signal)
		);
		if (abandon.signal.aborted) return;
		centre.elements = page.data;
		centre.curseur = page.meta.curseurSuivant;
		centre.etat = 'pret';
	} catch (erreur) {
		if (abandon.signal.aborted || (erreur instanceof DOMException && erreur.name === 'AbortError'))
			return;
		centre.elements = [];
		centre.curseur = null;
		centre.erreur = messageErreurNotifications(erreur);
		centre.etat = 'erreur';
	}
}

/** « Afficher plus » : page suivante par curseur (pas de doublon si une notification arrive entre deux pages). */
async function chargerPlusCentre(filtre: FiltreCentre): Promise<void> {
	const curseur = centre.curseur;
	if (!curseur || centre.chargementPlus || centre.etat !== 'pret') return;
	const abandon = abandonCentre;
	centre.chargementPlus = true;
	centre.erreurPlus = null;
	try {
		const page = await session.requeteAuthentifiee((token) =>
			notificationsApi.lister(
				token,
				{ ...filtre, limite: TAILLE_PAGE_CENTRE, curseur },
				abandon?.signal
			)
		);
		if (abandon?.signal.aborted || centre.curseur !== curseur) return;
		const connus = new Set(centre.elements.map((n) => n.id));
		centre.elements = [...centre.elements, ...page.data.filter((n) => !connus.has(n.id))];
		centre.curseur = page.meta.curseurSuivant;
	} catch (erreur) {
		if (erreur instanceof DOMException && erreur.name === 'AbortError') return;
		centre.erreurPlus = messageErreurNotifications(erreur);
	} finally {
		centre.chargementPlus = false;
	}
}

// --- Actions : mises à jour optimistes avec rollback ---------------------------

/**
 * Marque lue / non lue. L'interface change tout de suite ; si l'API refuse, on revient
 * à l'état précédent (liste + badge) et on explique pourquoi. Idempotent côté serveur.
 */
async function definirLecture(id: string, lue: boolean): Promise<boolean> {
	const avant = trouver(id);
	if (!avant || lecturesEnCours.has(id)) return false;
	if (avant.lue === lue) return true;

	lecturesEnCours.add(id);
	mutationsEnCours++;
	const lueLeAvant = avant.lueLe;
	const delta = lue ? -1 : 1;
	appliquer(id, (n) => ({ ...n, lue, lueLe: lue ? new Date().toISOString() : n.lueLe }));
	ajusterCompteur(delta);

	try {
		const misAJour = await session.requeteAuthentifiee((token) =>
			lue ? notificationsApi.marquerLue(token, id) : notificationsApi.marquerNonLue(token, id)
		);
		appliquer(id, () => misAJour);
		return true;
	} catch (erreur) {
		if (erreur instanceof ApiError && erreur.status === 404) {
			// Supprimée entre-temps (rétention) : on la retire plutôt que de la ressusciter.
			// Déjà décomptée côté serveur si elle était non lue ; sinon on annule notre « +1 ».
			retirer(id);
			if (delta > 0) ajusterCompteur(-1);
		} else {
			appliquer(id, (n) => ({ ...n, lue: avant.lue, lueLe: lueLeAvant }));
			ajusterCompteur(-delta);
		}
		toast.afficher(
			erreur instanceof ApiError && erreur.status === 404
				? messageErreurNotifications(erreur)
				: lue
					? `Impossible de marquer comme lue. ${messageErreurNotifications(erreur)}`
					: `Impossible de marquer comme non lue. ${messageErreurNotifications(erreur)}`
		);
		return false;
	} finally {
		lecturesEnCours.delete(id);
		mutationsEnCours = Math.max(0, mutationsEnCours - 1);
		// Le compteur du serveur fait foi une fois l'action terminée (§6 : « mettez à jour le badge »).
		void rafraichirCompteur(true);
	}
}

/** « Tout marquer comme lu » : optimiste, `nonLues` de la réponse fait foi (une notification arrivée entre-temps reste non lue). */
let toutLireEnCours = false;

async function toutLire(): Promise<void> {
	if (toutLireEnCours) return;
	toutLireEnCours = true;
	mutationsEnCours++;
	const compteurAvant = nonLues;
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- instantané local, jamais affiché
	const etatAvant = new Map<string, { lue: boolean; lueLe: string | null }>();
	for (const n of [...menu.elements, ...centre.elements]) {
		etatAvant.set(n.id, { lue: n.lue, lueLe: n.lueLe });
	}
	const maintenant = new Date().toISOString();
	for (const liste of [menu, centre]) {
		liste.elements = liste.elements.map((n) =>
			n.lue ? n : { ...n, lue: true, lueLe: maintenant }
		);
	}
	nonLues = 0;

	try {
		const reponse = await session.requeteAuthentifiee((token) => notificationsApi.toutLire(token));
		nonLues = Math.max(0, reponse.nonLues);
	} catch (erreur) {
		for (const liste of [menu, centre]) {
			liste.elements = liste.elements.map((n) => {
				const avant = etatAvant.get(n.id);
				return avant ? { ...n, lue: avant.lue, lueLe: avant.lueLe } : n;
			});
		}
		nonLues = compteurAvant;
		toast.afficher(`Impossible de tout marquer comme lu. ${messageErreurNotifications(erreur)}`);
	} finally {
		toutLireEnCours = false;
		mutationsEnCours = Math.max(0, mutationsEnCours - 1);
		void rafraichirCompteur(true);
	}
}

/** Vide tout (déconnexion, session perdue) : plus rien de l'utilisateur ne reste en mémoire. */
function reinitialiser() {
	arreterPolling();
	abandonMenu?.abort();
	abandonCentre?.abort();
	sequenceCompteur++;
	mutationsEnCours = 0;
	lecturesEnCours.clear();
	toutLireEnCours = false;
	pauseJusqua = 0;
	echecsConsecutifs = 0;
	nonLues = 0;
	compteurConnu = false;
	menu.vider();
	centre.vider();
}

export const notifications = {
	get nonLues() {
		return nonLues;
	},
	/** `false` tant que le premier compteur n'est pas arrivé (pas de badge à afficher). */
	get compteurConnu() {
		return compteurConnu;
	},
	menu,
	centre,
	demarrerPolling,
	arreterPolling,
	rafraichirCompteur: () => rafraichirCompteur(true),
	chargerMenu,
	chargerCentre,
	chargerPlusCentre,
	definirLecture,
	toutLire,
	reinitialiser
};
