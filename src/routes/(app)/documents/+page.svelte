<script lang="ts">
	import { onDestroy, onMount, tick, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { documentsApi } from '$lib/api/documents';
	import { elevesApi } from '$lib/api/eleves';
	import { etablissementApi } from '$lib/api/etablissement';
	import { ApiError } from '$lib/api/client';
	import ApercuDocumentDialog, {
		type EtatApercu
	} from '$lib/components/documents/ApercuDocumentDialog.svelte';
	import ChampsDocument from '$lib/components/documents/ChampsDocument.svelte';
	import ChoixEleve from '$lib/components/documents/ChoixEleve.svelte';
	import TypeDocumentCarte from '$lib/components/documents/TypeDocumentCarte.svelte';
	import CarteSkeleton from '$lib/components/documents/CarteSkeleton.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { glisser, monter } from '$lib/motion';
	import { session } from '$lib/stores/session.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import {
		CODE_ANNEE_SCOLAIRE_MANQUANTE,
		type Eleve,
		type EleveDetail,
		type TypeDocument
	} from '$lib/types';
	import {
		FILTRES,
		cleChampSaisi,
		construireChampsSaisis,
		filtrerTypes,
		valeursInitialesDocument,
		validerChamps,
		type FiltreCategorie,
		type ValeursDocument
	} from '$lib/utils/documents';
	import { nomComplet } from '$lib/utils/eleves';
	import { erreursParChamp, messageErreur } from '$lib/utils/erreurs-api';
	import { redirigerSiSessionExpiree } from '$lib/utils/session-expiree';
	import { lancerTelechargement, nomFichierPdf } from '$lib/utils/telechargement';

	type Vue = 'liste' | 'etape1' | 'etape2';

	/* ---------- Types de documents (GET /types-documents) ---------- */

	let types = $state<TypeDocument[]>([]);
	let chargementTypes = $state(true);
	let erreurTypes = $state('');
	let categorie = $state<FiltreCategorie>('TOUS');
	let recherche = $state('');

	const typesAffiches = $derived(filtrerTypes(types, categorie, recherche));

	async function chargerTypes() {
		chargementTypes = true;
		erreurTypes = '';
		try {
			types = await session.requeteAuthentifiee((token) => documentsApi.listerTypes(token));
		} catch (e) {
			if (await redirigerSiSessionExpiree(e)) return;
			erreurTypes = messageErreur(e);
		} finally {
			chargementTypes = false;
		}
	}

	/* ---------- Prérequis dans les Paramètres (avertissement non bloquant) ---------- */

	let parametresManquants = $state<string[]>([]);

	async function verifierParametres() {
		try {
			const etablissement = await session.requeteAuthentifiee((token) =>
				etablissementApi.consulter(token)
			);
			const manques: string[] = [];
			if (!etablissement.anneeScolaireActive) {
				manques.push('année scolaire active (indispensable pour numéroter le document)');
			}
			if (!etablissement.nomSignataire?.trim()) manques.push('nom du signataire');
			if (!etablissement.ministereTutelle?.trim()) manques.push('ministère de tutelle');
			parametresManquants = manques;
		} catch {
			// Information facultative : en cas d'échec, on n'affiche simplement pas l'avertissement.
		}
	}

	onMount(() => {
		void chargerTypes();
		void verifierParametres();
	});

	/* ---------- Élève présélectionné (?eleve=<id>, depuis l'écran Élèves) ---------- */

	const eleveIdUrl = $derived(page.url.searchParams.get('eleve'));
	let elevePresel = $state<EleveDetail | null>(null);

	function retirerPresel() {
		void goto(resolve('/documents'), { replaceState: true, keepFocus: true, noScroll: true });
	}

	$effect(() => {
		const id = eleveIdUrl;
		if (!id) {
			elevePresel = null;
			return;
		}
		const controleur = new AbortController();
		untrack(() => {
			void (async () => {
				try {
					const detail = await session.requeteAuthentifiee((token) =>
						elevesApi.consulter(token, id, controleur.signal)
					);
					if (!controleur.signal.aborted) elevePresel = detail;
				} catch (e) {
					if (controleur.signal.aborted) return;
					if (await redirigerSiSessionExpiree(e)) return;
					toast.afficher(
						e instanceof ApiError && e.status === 404
							? 'Cet élève est introuvable.'
							: messageErreur(e)
					);
					retirerPresel();
				}
			})();
		});
		return () => controleur.abort();
	});

	/* ---------- Parcours de génération ---------- */

	let vue = $state<Vue>('liste');
	/** Sens du dernier changement de vue : +1 = on avance dans le parcours, -1 = on revient en arrière. */
	let sens = $state(1);
	const ORDRE_VUES: Record<Vue, number> = { liste: 0, etape1: 1, etape2: 2 };
	let typeCourant = $state<TypeDocument | null>(null);
	let selection = $state<Eleve | null>(null);
	let eleveCourant = $state<EleveDetail | null>(null);
	let erreurEleve = $state('');
	let chargementEleve = $state(false);

	let valeurs = $state<ValeursDocument>({});
	let erreurs = $state<Record<string, string>>({});
	let erreurGlobale = $state('');
	/** UUID généré à l'ouverture de l'étape 2 : un document par intention, jamais de doublon au rejeu. */
	let cleIdempotence = $state(crypto.randomUUID());

	let titre = $state<HTMLHeadingElement>();

	async function afficherVue(suivante: Vue) {
		sens = ORDRE_VUES[suivante] >= ORDRE_VUES[vue] ? 1 : -1;
		vue = suivante;
		window.scrollTo(0, 0);
		await tick();
		if (suivante === 'etape1') document.getElementById('eleve')?.focus();
		else if (suivante === 'etape2')
			document.querySelector<HTMLElement>('#etape2 :is(input,select,textarea)')?.focus();
		else titre?.focus();
	}

	function ouvrirType(type: TypeDocument) {
		typeCourant = type;
		erreurEleve = '';
		erreurGlobale = '';
		if (elevePresel) {
			selection = elevePresel;
			entrerEtape2(elevePresel);
		} else {
			selection = null;
			void afficherVue('etape1');
		}
	}

	function entrerEtape2(detail: EleveDetail) {
		if (!typeCourant) return;
		eleveCourant = detail;
		valeurs = valeursInitialesDocument(typeCourant.champs, detail);
		erreurs = {};
		erreurGlobale = '';
		cleIdempotence = crypto.randomUUID();
		void afficherVue('etape2');
	}

	async function continuer() {
		if (!selection) {
			erreurEleve = 'Choisissez un élève dans la liste des résultats.';
			document.getElementById('eleve')?.focus();
			return;
		}
		// L'élève présélectionné est déjà chargé (avec classe et date d'inscription).
		if (elevePresel && elevePresel.id === selection.id) return entrerEtape2(elevePresel);

		chargementEleve = true;
		erreurEleve = '';
		const id = selection.id;
		try {
			const detail = await session.requeteAuthentifiee((token) => elevesApi.consulter(token, id));
			entrerEtape2(detail);
		} catch (e) {
			if (await redirigerSiSessionExpiree(e)) return;
			if (e instanceof ApiError && e.status === 404) {
				selection = null;
				erreurEleve = 'Cet élève est introuvable. Choisissez-en un autre.';
			} else {
				erreurEleve = messageErreur(e);
			}
		} finally {
			chargementEleve = false;
		}
	}

	function retourListe() {
		typeCourant = null;
		selection = null;
		eleveCourant = null;
		void afficherVue('liste');
	}

	/* ---------- Aperçu (POST /documents/apercu) et génération (POST /documents) ---------- */

	interface EtatDialogue {
		etat: EtatApercu;
		urlPdf: string | null;
		messageApercu: string;
		erreurEnvoi: string;
		lienParametres: boolean;
	}

	let apercu = $state<EtatDialogue | null>(null);
	let dialogueApercu: ReturnType<typeof ApercuDocumentDialog> | undefined = $state();
	let envoi = $state(false);

	function revoquerUrl() {
		if (apercu?.urlPdf) URL.revokeObjectURL(apercu.urlPdf);
	}
	onDestroy(revoquerUrl);

	function fermerApercu() {
		revoquerUrl();
		apercu = null;
	}

	function corpsDocument() {
		if (!typeCourant || !eleveCourant) return null;
		return {
			eleveId: eleveCourant.id,
			typeDocumentId: typeCourant.id,
			champsSaisis: construireChampsSaisis(typeCourant.champs, valeurs)
		};
	}

	async function focaliserPremiereErreur() {
		await tick();
		document.querySelector<HTMLElement>('#etape2 [aria-invalid="true"]')?.focus();
	}

	async function demanderApercu() {
		if (!typeCourant || !eleveCourant) return;
		// Aperçu en cours de fermeture (animation) : on ignore, l'utilisateur recliquera.
		if (apercu && dialogueApercu && !dialogueApercu.estOuvert()) return;
		erreurGlobale = '';
		erreurs = validerChamps(typeCourant.champs, valeurs, eleveCourant);
		if (Object.keys(erreurs).length > 0) return focaliserPremiereErreur();

		const corps = corpsDocument();
		if (!corps) return;
		revoquerUrl();
		apercu = {
			etat: 'chargement',
			urlPdf: null,
			messageApercu: '',
			erreurEnvoi: '',
			lienParametres: false
		};
		try {
			const { blob } = await session.requeteAuthentifiee((token) =>
				documentsApi.apercu(token, corps)
			);
			apercu = {
				etat: 'pret',
				urlPdf: URL.createObjectURL(blob),
				messageApercu: '',
				erreurEnvoi: '',
				lienParametres: false
			};
		} catch (e) {
			if (await redirigerSiSessionExpiree(e)) return;
			await traiterErreur(e, 'apercu');
		}
	}

	async function genererDocument() {
		const corps = corpsDocument();
		if (!corps || !apercu || envoi) return;
		envoi = true;
		apercu = { ...apercu, erreurEnvoi: '', lienParametres: false };
		try {
			const document = await session.requeteAuthentifiee((token) =>
				documentsApi.generer(token, corps, cleIdempotence)
			);
			// Lien signé (1 h) : à utiliser tout de suite, jamais conservé.
			lancerTelechargement(
				document.urlTelechargement,
				nomFichierPdf(typeCourant?.nom ?? 'Document', eleveCourant ? nomComplet(eleveCourant) : '')
			);
			dialogueApercu?.fermer();
			toast.afficher(`Document établi : ${document.numeroUnique}`);
			// Nouvelle intention : nouvelle clé, et retour à la liste (évite un second clic accidentel).
			cleIdempotence = crypto.randomUUID();
			if (eleveIdUrl) retirerPresel();
			retourListe();
		} catch (e) {
			if (await redirigerSiSessionExpiree(e)) return;
			await traiterErreur(e, 'generation');
		} finally {
			envoi = false;
		}
	}

	/**
	 * Erreurs métier (voir API_DOCUMENTS.md §10). Les erreurs de champ retournent
	 * dans le formulaire ; une panne ou une collision de numéro reste dans la fenêtre,
	 * où « Télécharger » peut être relancé avec la même `Idempotency-Key`.
	 */
	async function traiterErreur(e: unknown, contexte: 'apercu' | 'generation') {
		const anneeManquante = e instanceof ApiError && e.code === CODE_ANNEE_SCOLAIRE_MANQUANTE;

		const parChamp = erreursParChamp(e);
		if (parChamp) {
			const prochaines: Record<string, string> = {};
			const autres: string[] = [];
			let eleveEnCause = '';
			for (const { champ, message } of parChamp) {
				const cle = cleChampSaisi(champ);
				if (cle && typeCourant?.champs.some((c) => c.cle === cle)) prochaines[cle] = message;
				else if (champ === 'eleveId') eleveEnCause = message;
				else autres.push(message);
			}
			dialogueApercu?.fermer();
			if (eleveEnCause) {
				erreurEleve = eleveEnCause;
				selection = null;
				return afficherVue('etape1');
			}
			erreurs = prochaines;
			erreurGlobale = autres.join(' ');
			return focaliserPremiereErreur();
		}

		if (e instanceof ApiError && e.status === 404 && /élève/i.test(e.message)) {
			dialogueApercu?.fermer();
			selection = null;
			erreurEleve = 'Cet élève est introuvable. Choisissez-en un autre.';
			return afficherVue('etape1');
		}
		if (e instanceof ApiError && e.status === 404 && /type/i.test(e.message)) {
			dialogueApercu?.fermer();
			toast.afficher(e.message);
			void chargerTypes();
			return retourListe();
		}

		const message = messageErreur(e);
		if (!apercu) return;
		apercu =
			contexte === 'apercu'
				? { ...apercu, etat: 'erreur', messageApercu: message, lienParametres: anneeManquante }
				: { ...apercu, erreurEnvoi: message, lienParametres: anneeManquante };
	}

	const progression = $derived(vue === 'etape2' ? 100 : 50);
</script>

<svelte:head>
	<title>Documents · Scoly</title>
</svelte:head>

{#if vue === 'liste'}
	<div in:glisser={{ x: sens * 16 }}>
		<h1 class="sr-only" bind:this={titre} tabindex="-1">Documents</h1>

		{#if elevePresel}
			<div class="picked presel" in:monter={{ y: -6 }}>
				<span class="ic"><Icon name="checkmark" /></span>
				<span class="tx">
					<span>Élève sélectionné</span>
					<b>{nomComplet(elevePresel)}</b>
				</span>
				<button type="button" onclick={retirerPresel}>Retirer</button>
			</div>
		{/if}

		<div class="tools">
			<div class="search">
				<Icon name="search" />
				<label class="sr-only" for="recherche-document">Rechercher un document</label>
				<input
					id="recherche-document"
					type="search"
					placeholder="Rechercher un document"
					autocomplete="off"
					bind:value={recherche}
				/>
			</div>
			<div class="chips" role="group" aria-label="Filtrer par catégorie">
				{#each FILTRES as filtre (filtre.valeur)}
					<button
						type="button"
						class="chip"
						aria-pressed={categorie === filtre.valeur}
						onclick={() => (categorie = filtre.valeur)}
					>
						{filtre.libelle}
					</button>
				{/each}
			</div>
		</div>

		{#if chargementTypes}
			<div class="grille" aria-busy="true">
				<span class="sr-only" role="status">Chargement des documents…</span>
				{#each [0, 1, 2, 3] as n (n)}
					<CarteSkeleton />
				{/each}
			</div>
		{:else if erreurTypes}
			<div class="emptybox" role="alert">
				<p>{erreurTypes}</p>
				<button type="button" class="btn ghost" onclick={chargerTypes}>Réessayer</button>
			</div>
		{:else if types.length === 0}
			<!-- Liste vide côté API (types non configurés) : différent d'une recherche sans résultat. -->
			<div class="emptybox" role="status">
				<p>Aucun type de document n'est disponible pour le moment.</p>
				<button type="button" class="btn ghost" onclick={chargerTypes}>Réessayer</button>
			</div>
		{:else if typesAffiches.length === 0}
			<p class="vide">Aucun document ne correspond à votre recherche. Essayez un autre mot.</p>
		{:else}
			<div class="grille">
				{#each typesAffiches as type, i (type.id)}
					<TypeDocumentCarte {type} indice={i} onetablir={ouvrirType} />
				{/each}
			</div>
		{/if}
	</div>
{:else if typeCourant}
	<div in:glisser={{ x: sens * 16 }}>
		<button type="button" class="retour" onclick={retourListe}>
			<Icon name="back" />Tous les documents
		</button>

		<div class="gen-wrap">
			<h1 class="gen-title" bind:this={titre} tabindex="-1">{typeCourant.nom}</h1>
			<p class="stp">Étape {vue === 'etape1' ? 1 : 2} sur 2</p>
			<div class="prog" aria-hidden="true"><i style:width={`${progression}%`}></i></div>

			{#if parametresManquants.length > 0}
				<div class="avertissement" role="status">
					<p>
						À compléter dans les Paramètres pour un document complet : {parametresManquants.join(
							', '
						)}.
					</p>
					<a href={resolve('/parametres')}>Ouvrir les Paramètres</a>
				</div>
			{/if}

			{#if vue === 'etape1'}
				<form
					class="panel"
					id="etape1"
					in:glisser={{ x: sens * 16 }}
					novalidate
					onsubmit={(e) => {
						e.preventDefault();
						void continuer();
					}}
				>
					<div class="field">
						<label for="eleve">Élève *</label>
						<ChoixEleve
							id="eleve"
							bind:selection
							erreur={erreurEleve}
							onsaisie={() => (erreurEleve = '')}
						/>
						{#if erreurEleve}
							<p class="err" id="eleve-erreur" role="alert">{erreurEleve}</p>
						{/if}
					</div>
					<button
						type="submit"
						class="btn pleine"
						disabled={chargementEleve}
						aria-busy={chargementEleve}
					>
						{chargementEleve ? 'Chargement…' : 'Continuer'}
					</button>
				</form>
			{:else if eleveCourant}
				<form
					id="etape2"
					novalidate
					in:glisser={{ x: sens * 16 }}
					onsubmit={(e) => {
						e.preventDefault();
						void demanderApercu();
					}}
				>
					<div class="panel">
						<div class="picked">
							<span class="ic"><Icon name="checkmark" /></span>
							<span class="tx">
								<span>Élève sélectionné</span>
								<b>{nomComplet(eleveCourant)}</b>
							</span>
							<button type="button" onclick={() => afficherVue('etape1')}>Changer</button>
						</div>

						{#if erreurGlobale}
							<p class="banner" role="alert">{erreurGlobale}</p>
						{/if}

						<ChampsDocument champs={typeCourant.champs} bind:valeurs bind:erreurs />

						<div class="acts">
							<button type="button" class="btn ghost" onclick={() => afficherVue('etape1')}>
								Retour
							</button>
							<button type="submit" class="btn">Voir l'aperçu</button>
						</div>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}

{#if apercu}
	<ApercuDocumentDialog
		bind:this={dialogueApercu}
		etat={apercu.etat}
		urlPdf={apercu.urlPdf}
		messageApercu={apercu.messageApercu}
		erreurEnvoi={apercu.erreurEnvoi}
		lienParametres={apercu.lienParametres}
		{envoi}
		onfermer={fermerApercu}
		ontelecharger={genererDocument}
		onreessayer={demanderApercu}
	/>
{/if}

<style>
	h1:focus {
		outline: none;
	}
	.grille {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: var(--s4);
	}
	.chips {
		display: flex;
		gap: var(--s2);
		flex-wrap: wrap;
	}
	.chip {
		height: 36px;
		padding: 0 14px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: transparent;
		cursor: pointer;
		color: var(--ink-2);
		font-size: 14px;
		transition:
			background-color var(--dur-1) var(--ease-out),
			color var(--dur-1) var(--ease-out),
			border-color var(--dur-1) var(--ease-out),
			transform var(--dur-1) var(--ease-out);
	}
	.chip:active {
		transform: scale(0.96);
	}
	.chip:hover {
		background: var(--sunken);
	}
	.chip[aria-pressed='true'] {
		background: var(--ink);
		color: var(--bg);
		border-color: var(--ink);
	}
	.vide {
		padding: var(--s7) 0;
		color: var(--ink-2);
		text-align: center;
	}

	.retour {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-bottom: var(--s4);
		padding: 4px 0;
		border: 0;
		background: none;
		color: var(--ink-2);
		font-size: 15px;
		font-weight: 500;
		cursor: pointer;
		transition: color var(--dur-1) var(--ease-out);
	}
	.retour:hover {
		color: var(--ink);
	}
	.gen-wrap {
		max-width: 480px;
		margin: 0 auto;
	}
	.gen-title {
		font-size: 30px;
		text-align: center;
		margin: 0 0 var(--s4);
		font-family: var(--font-serif);
		font-weight: 500;
	}
	.pleine {
		width: 100%;
	}
	.acts {
		display: flex;
		gap: var(--s2);
	}
	.acts :global(.btn:not(.ghost)) {
		flex: 1;
	}

	.picked {
		display: flex;
		align-items: center;
		gap: var(--s3);
		padding: var(--s4);
		margin-bottom: var(--s5);
		background: var(--brand-2-soft);
		border: 1px solid var(--line);
		border-radius: var(--r-md);
	}
	.picked.presel {
		max-width: 480px;
	}
	.picked .ic {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--surface);
		color: var(--brand-2);
		display: grid;
		place-items: center;
		flex: none;
	}
	.picked .ic {
		animation: pop-coche var(--dur-2) var(--ease-out);
	}
	.picked .ic :global(path) {
		stroke-dasharray: 30;
		animation: trace var(--dur-3) var(--ease-out) 80ms backwards;
	}
	.picked .tx {
		flex: 1;
		min-width: 0;
	}
	.picked .tx span {
		display: block;
		font-size: 13px;
		color: var(--ink-2);
	}
	.picked .tx b {
		font-size: 15.5px;
	}
	.picked button {
		flex: none;
		border: 0;
		background: none;
		color: var(--brand-2);
		font-weight: 500;
		font-size: 14px;
		cursor: pointer;
		padding: 4px;
	}
	.picked button:hover {
		text-decoration: underline;
	}

	.avertissement {
		margin: 0 0 var(--s4);
		padding: 10px 14px;
		border: 1px solid var(--line);
		border-radius: var(--r-md);
		background: var(--sunken);
		color: var(--ink-2);
		font-size: 14px;
	}
	.avertissement p {
		margin: 0 0 4px;
	}
	.avertissement a {
		color: var(--brand-2);
		font-weight: 500;
	}
</style>
