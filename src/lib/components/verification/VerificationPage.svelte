<script lang="ts">
	import { onDestroy, tick, untrack } from 'svelte';
	import { goto, pushState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		ErreurVerification,
		verifierDocument,
		type DemandeVerification,
		type ReponseVerification
	} from '$lib/api/verification';
	import '$lib/styles/verification.css';
	import {
		MESSAGE_BUG,
		TITRES_RESULTAT,
		TITRE_AMBIGU,
		TITRE_AMBIGU_FINAL,
		PRECISIONS_MAX,
		jetonTropLong,
		signalerBugVerification
	} from '$lib/utils/verification';
	import VerifAmbigu from './VerifAmbigu.svelte';
	import VerifChargement from './VerifChargement.svelte';
	import VerifEntete from './VerifEntete.svelte';
	import VerifErreur from './VerifErreur.svelte';
	import VerifResultat from './VerifResultat.svelte';
	import VerifSaisie from './VerifSaisie.svelte';

	/**
	 * Page publique de vérification, pour les deux parcours :
	 *  - `token` renseigné  → parcours QR (`/verifier/:token`) : vérification automatique, jamais d'AMBIGU ;
	 *  - `token` à `null`   → saisie manuelle de la référence (`/verifier`).
	 *
	 * Confidentialité : la référence, le jeton et le nom saisis ne vivent QUE dans la mémoire de ce
	 * composant. Ni URL, ni historique, ni stockage navigateur, ni journal (voir API_VERIFICATION.md §10).
	 * L'appel part du navigateur (jamais d'un `load` serveur) : l'API limite le débit par IP.
	 */

	interface Props {
		token: string | null;
	}

	let { token }: Props = $props();

	type Vue = 'saisie' | 'chargement' | 'resultat' | 'ambigu' | 'erreur';
	interface ErreurAffichee {
		genre: 'indisponible' | 'limite' | 'bug';
		message: string;
		reessayable: boolean;
	}

	const modeQr = $derived(token !== null);

	let vue = $state<Vue>(untrack(() => (token !== null ? 'chargement' : 'saisie')));
	let reference = $state('');
	let etablissement = $state('');
	let reponse = $state<ReponseVerification | null>(null);
	/** Précisions « nom de l'établissement » déjà tentées et restées AMBIGU. */
	let precisions = $state(0);
	let erreur = $state<ErreurAffichee | null>(null);
	let erreurChamp = $state<{ champ: 'reference' | 'etablissement'; message: string } | null>(null);
	let message429 = $state<string | null>(null);
	let restant = $state(0);
	let enCours = $state(false);
	/** Phrase lue par la région `aria-live` à chaque changement d'écran. */
	let annonce = $state('');

	let saisieRef = $state<ReturnType<typeof VerifSaisie>>();
	let ambiguRef = $state<ReturnType<typeof VerifAmbigu>>();

	// Mémoire seule : de quoi « Réessayer » sans redemander la saisie.
	let derniere: DemandeVerification | null = null;
	let controleur: AbortController | null = null;
	let sequence = 0;
	let historiquePousse = false;
	let echeance = 0;
	let minuteur: ReturnType<typeof setInterval> | undefined;

	/* ---------- Compte à rebours (429) ---------- */

	function arreterCompteARebours() {
		clearInterval(minuteur);
		minuteur = undefined;
		restant = 0;
	}

	function demarrerCompteARebours(secondes: number) {
		arreterCompteARebours();
		// Échéance absolue : un onglet en arrière-plan (minuteur ralenti) ne fausse pas le délai.
		echeance = Date.now() + Math.max(1, secondes) * 1000;
		restant = Math.ceil((echeance - Date.now()) / 1000);
		minuteur = setInterval(() => {
			restant = Math.max(0, Math.ceil((echeance - Date.now()) / 1000));
			if (restant === 0) {
				arreterCompteARebours();
				message429 = null;
				annonce = 'Vous pouvez de nouveau lancer une vérification.';
			}
		}, 500);
	}

	/* ---------- Navigation entre écrans ---------- */

	async function focaliserTitre() {
		await tick();
		document.getElementById('v-titre')?.focus();
	}

	async function aller(suivante: Vue) {
		const quitteLaSaisie = vue === 'saisie' && suivante !== 'saisie';
		vue = suivante;
		// Saisie manuelle : chaque écran de résultat a son entrée d'historique (« Retour » ramène à la saisie).
		// L'état n'est qu'un marqueur : aucune donnée ne passe dans l'historique.
		if (quitteLaSaisie && !modeQr && !historiquePousse) {
			historiquePousse = true;
			pushState('', { verification: true });
		}
		if (suivante === 'chargement') annonce = 'Vérification en cours…';
		else if (suivante === 'resultat' && reponse && reponse.resultat !== 'AMBIGU')
			annonce = `Résultat de la vérification : ${TITRES_RESULTAT[reponse.resultat]}.`;
		else if (suivante === 'ambigu')
			annonce = precisions >= PRECISIONS_MAX ? TITRE_AMBIGU_FINAL : TITRE_AMBIGU;
		else if (suivante === 'erreur' && erreur) annonce = erreur.message;
		else annonce = '';

		if (suivante === 'saisie') {
			await tick();
			saisieRef?.focaliser();
		} else if (suivante !== 'chargement') {
			await focaliserTitre();
		}
	}

	/** Abandonne tout ce qui est en vol ou affiché : requête, compte à rebours, résultat, erreurs. */
	function abandonner() {
		controleur?.abort();
		controleur = null;
		sequence++;
		enCours = false;
		arreterCompteARebours();
		erreur = null;
		erreurChamp = null;
		message429 = null;
		reponse = null;
		precisions = 0;
		derniere = null;
	}

	/* ---------- Appel de l'API ---------- */

	async function lancer(demande: DemandeVerification) {
		// Une requête plus récente remplace la précédente (jamais deux réponses en concurrence).
		controleur?.abort();
		controleur = new AbortController();
		const { signal } = controleur;
		const id = ++sequence;

		derniere = demande;
		enCours = true;
		erreurChamp = null;
		message429 = null;
		// Parcours QR et nouvel essai depuis un écran d'erreur : écran de chargement. En saisie, le bouton fait foi.
		if (modeQr || vue === 'erreur') await aller('chargement');

		try {
			const r = await verifierDocument(demande, signal);
			if (signal.aborted || id !== sequence) return;
			await recevoir(r, demande);
		} catch (e) {
			if (signal.aborted || id !== sequence) return;
			await gererErreur(e);
		} finally {
			if (id === sequence) enCours = false;
		}
	}

	async function recevoir(r: ReponseVerification, demande: DemandeVerification) {
		if (r.resultat !== 'AMBIGU') {
			reponse = r;
			precisions = 0;
			return aller('resultat');
		}

		// L'AMBIGU n'existe qu'en saisie manuelle (§5). Avec un jeton, c'est une anomalie du serveur.
		if (modeQr) {
			signalerBugVerification({ statut: 200, code: 'AMBIGU_AVEC_JETON' });
			erreur = { genre: 'bug', message: MESSAGE_BUG, reessayable: true };
			return aller('erreur');
		}

		const estUnePrecision = 'etablissement' in demande && !!demande.etablissement;
		precisions = estUnePrecision ? precisions + 1 : 0;
		if (!estUnePrecision) etablissement = '';
		reponse = null;
		return aller('ambigu');
	}

	async function gererErreur(e: unknown) {
		if (!(e instanceof ErreurVerification)) {
			signalerBugVerification({ statut: 0 });
			erreur = { genre: 'bug', message: MESSAGE_BUG, reessayable: true };
			return aller('erreur');
		}

		const vueFormulaire: Vue = formulaireDeLaDemande();

		if (e.genre === 'champ' && !modeQr) {
			// CHAMP_VIDE / FORMAT_INVALIDE : sous le champ désigné, sur l'écran qui le porte.
			const champ = e.champ === 'etablissement' ? 'etablissement' : 'reference';
			erreurChamp = { champ, message: e.message };
			await aller(champ === 'etablissement' ? 'ambigu' : 'saisie');
			if (champ === 'etablissement') ambiguRef?.focaliser();
			return;
		}

		if (e.genre === 'limite') {
			demarrerCompteARebours(e.retryAfterSecondes ?? 60);
			message429 = e.message;
			// En saisie, le message et le décompte s'affichent dans le formulaire ; sinon, écran d'erreur.
			if (!modeQr && vue !== 'chargement' && vue !== 'erreur') return;
			if (!modeQr && vue === 'chargement') return aller(vueFormulaire);
			erreur = { genre: 'limite', message: e.message, reessayable: true };
			return aller('erreur');
		}

		if (e.genre === 'indisponible') {
			erreur = { genre: 'indisponible', message: e.message, reessayable: true };
			return aller('erreur');
		}

		// VALIDATION_ERROR, corps illisible, réponse inattendue : un bug du front, pas de l'utilisateur.
		signalerBugVerification({ statut: e.status, code: e.code });
		erreur = { genre: 'bug', message: MESSAGE_BUG, reessayable: true };
		return aller('erreur');
	}

	/** Écran portant le formulaire correspondant à la dernière demande (saisie ou précision d'établissement). */
	function formulaireDeLaDemande(): Vue {
		return derniere && 'etablissement' in derniere && derniere.etablissement ? 'ambigu' : 'saisie';
	}

	/* ---------- Actions de l'utilisateur ---------- */

	function soumettreReference() {
		if (enCours || restant > 0) return;
		// Contrôle de présence uniquement (pas de normalisation : le serveur tolère casse, accents, « N° »…).
		if (reference.trim() === '') {
			erreurChamp = { champ: 'reference', message: 'Veuillez saisir la référence du document.' };
			saisieRef?.focaliser();
			return;
		}
		precisions = 0;
		etablissement = '';
		void lancer({ reference });
	}

	function soumettreEtablissement() {
		if (enCours || restant > 0) return;
		// Envoyé vide, le serveur répondrait AMBIGU (« non fourni ») et un essai serait gâché.
		if (etablissement.trim() === '') {
			erreurChamp = {
				champ: 'etablissement',
				message: 'Indiquez le nom de l’établissement émetteur.'
			};
			ambiguRef?.focaliser();
			return;
		}
		void lancer({ reference, etablissement });
	}

	function reessayer() {
		if (enCours || restant > 0 || !derniere) return;
		void lancer(derniere);
	}

	/** « Vérifier un autre document » : nouvelle saisie, champs vides. */
	function autreDocument() {
		if (modeQr) {
			void goto(resolve('/verifier'));
			return;
		}
		abandonner();
		reference = '';
		etablissement = '';
		const aRetirer = historiquePousse;
		historiquePousse = false;
		void aller('saisie');
		// L'entrée d'historique du résultat est retirée : « Retour » ne ressuscite pas l'ancien résultat.
		if (aRetirer) history.back();
	}

	/** Écran d'erreur → retour à la saisie (la référence est gardée en mémoire pour être corrigée). */
	function revenirALaSaisie() {
		if (modeQr) {
			void goto(resolve('/verifier'));
			return;
		}
		const gardee = reference;
		abandonner();
		reference = gardee;
		void aller('saisie');
	}

	/* ---------- Parcours QR : vérification automatique ---------- */

	$effect(() => {
		const jeton = token;
		if (jeton === null) return;
		untrack(() => {
			abandonner();
			if (jetonTropLong(jeton)) {
				// Aucun jeton Scoly n'a cette taille : inutile d'interroger le serveur, et surtout pas de faux « Introuvable ».
				erreur = {
					genre: 'bug',
					message:
						'Ce lien de vérification n’est pas valide. Vérifiez qu’il est complet, ou saisissez la référence imprimée en haut du document.',
					reessayable: false
				};
				void aller('erreur');
				return;
			}
			void lancer({ token: jeton });
		});
		// Changement de jeton ou départ de la page : la requête en vol ne doit plus rien afficher.
		return () => {
			controleur?.abort();
			sequence++;
		};
	});

	/* ---------- Bouton « Retour » du navigateur (saisie manuelle) ---------- */

	$effect(() => {
		const marqueur = page.state.verification === true;
		untrack(() => {
			if (marqueur || !historiquePousse) return;
			// L'entrée du résultat a été quittée : retour à la saisie, référence conservée pour la corriger.
			historiquePousse = false;
			const gardee = reference;
			abandonner();
			reference = gardee;
			etablissement = '';
			vue = 'saisie';
			annonce = '';
		});
	});

	/**
	 * Page restaurée depuis le cache arrière/avant du navigateur : un résultat figé pourrait être périmé
	 * (document annulé entre-temps). QR : on revérifie. Saisie : on efface le résultat.
	 */
	function surRestauration(e: PageTransitionEvent) {
		if (!e.persisted) return;
		if (token !== null) {
			abandonner();
			void lancer({ token });
		} else if (vue !== 'saisie') {
			const gardee = reference;
			abandonner();
			reference = gardee;
			historiquePousse = false;
			void aller('saisie');
		}
	}

	onDestroy(() => {
		controleur?.abort();
		clearInterval(minuteur);
	});

	const titrePage = $derived(
		vue === 'resultat' && reponse && reponse.resultat !== 'AMBIGU'
			? TITRES_RESULTAT[reponse.resultat]
			: vue === 'ambigu'
				? TITRE_AMBIGU
				: 'Vérification d’un document'
	);
</script>

<svelte:head>
	<title>{`Scoly – ${titrePage}`}</title>
	<!-- Le jeton du QR est dans l'URL de cette page : ni Referer, ni indexation. -->
	<meta name="referrer" content="no-referrer" />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<svelte:window onpageshow={surRestauration} />

<VerifEntete afficherAutre={vue !== 'saisie'} onautre={autreDocument} />

<main class="v-main">
	<div class="sr-only" role="status" aria-live="polite" aria-atomic="true">{annonce}</div>

	{#key vue}
		{#if vue === 'saisie'}
			<VerifSaisie
				bind:this={saisieRef}
				bind:reference
				{enCours}
				erreur={erreurChamp?.champ === 'reference' ? erreurChamp.message : null}
				{message429}
				{restant}
				onsoumettre={soumettreReference}
				onmodif={() => (erreurChamp = null)}
			/>
		{:else if vue === 'chargement'}
			<VerifChargement />
		{:else if vue === 'resultat' && reponse && reponse.resultat !== 'AMBIGU'}
			<VerifResultat reponse={{ ...reponse, resultat: reponse.resultat }} />
		{:else if vue === 'ambigu'}
			<VerifAmbigu
				bind:this={ambiguRef}
				bind:etablissement
				{precisions}
				{enCours}
				erreur={erreurChamp?.champ === 'etablissement' ? erreurChamp.message : null}
				{message429}
				{restant}
				onsoumettre={soumettreEtablissement}
				onmodif={() => (erreurChamp = null)}
			/>
		{:else if vue === 'erreur' && erreur}
			<VerifErreur
				genre={erreur.genre}
				message={erreur.message}
				{restant}
				reessayable={erreur.reessayable}
				onreessayer={reessayer}
				onsaisir={revenirALaSaisie}
				libelleSaisir={modeQr ? 'Saisir la référence' : 'Modifier la saisie'}
			/>
		{/if}
	{/key}

	<noscript>
		<p class="v-msg-err">La vérification d’un document nécessite JavaScript.</p>
	</noscript>

	<p class="v-pied">Service de vérification fourni par <strong>Scoly</strong>.</p>
</main>
