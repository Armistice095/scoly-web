<script module lang="ts">
	export type ModeFeuille = 'voir' | 'modifier' | 'ajouter';
</script>

<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { ApiError } from '$lib/api/client';
	import { documentsApi } from '$lib/api/documents';
	import { elevesApi } from '$lib/api/eleves';
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { session } from '$lib/stores/session.svelte';
	import {
		CODE_ELEVE_DOUBLON_POSSIBLE,
		CODE_MATRICULE_DEJA_UTILISE,
		CODE_MATRICULE_EDUCMASTER_DEJA_UTILISE,
		type DocumentEleve,
		type Eleve,
		type EleveDetail
	} from '$lib/types';
	import { erreursParChamp, messageErreur } from '$lib/utils/erreurs-api';
	import {
		ORDRE_CHAMPS,
		nomComplet,
		construirePayload,
		valeursInitiales,
		validerEleve,
		type ErreursEleve
	} from '$lib/utils/eleves';
	import { redirigerSiSessionExpiree } from '$lib/utils/session-expiree';
	import { lancerTelechargement, nomFichierPdf } from '$lib/utils/telechargement';
	import { toast } from '$lib/stores/toast.svelte';
	import ConfirmDoublonDialog from './ConfirmDoublonDialog.svelte';
	import EleveFiche from './EleveFiche.svelte';
	import EleveFormulaire from './EleveFormulaire.svelte';

	interface Props {
		modeInitial: ModeFeuille;
		/** Élève affiché/modifié (`null` en mode « ajouter »). */
		eleve: Eleve | null;
		/** Appelé quand le panneau est fermé (quelle qu'en soit la raison). */
		onferme: () => void;
		/** Appelé après un enregistrement réussi (la page recharge sa liste et affiche le toast). */
		onenregistre: (eleve: Eleve, mode: 'ajouter' | 'modifier') => void;
		/** L'élève n'existe plus côté API (404) : la page doit recharger sa liste. */
		onactualiser: () => void;
		onetablirdocument: (eleve: Eleve) => void;
	}

	let { modeInitial, eleve, onferme, onenregistre, onactualiser, onetablirdocument }: Props =
		$props();

	let modal: ReturnType<typeof Modal>;
	let titre: HTMLHeadingElement;

	// Le panneau est recréé à chaque ouverture : les props ne servent qu'à l'initialisation.
	// svelte-ignore state_referenced_locally
	let mode = $state<ModeFeuille>(modeInitial);
	// svelte-ignore state_referenced_locally
	let valeurs = $state(valeursInitiales(modeInitial === 'ajouter' ? null : eleve));
	let erreurs = $state<ErreursEleve>({});
	let erreurGlobale = $state('');
	let envoi = $state(false);
	let doublonOuvert = $state(false);

	// --- Fiche : les données de la ligne s'affichent tout de suite, puis le détail
	// (documents établis) est chargé via GET /eleves/:id.
	let detail = $state<EleveDetail | null>(null);
	let etatDocuments = $state<'chargement' | 'ok' | 'erreur'>('chargement');
	let erreurDocuments = $state('');
	let controleur: AbortController | null = null;

	const courant = $derived<Eleve | null>(detail ?? eleve);

	async function chargerDetail() {
		if (!eleve) return;
		const id = eleve.id;
		controleur?.abort();
		controleur = new AbortController();
		const signal = controleur.signal;
		etatDocuments = 'chargement';
		try {
			const resultat = await session.requeteAuthentifiee((token) =>
				elevesApi.consulter(token, id, signal)
			);
			if (signal.aborted) return;
			detail = resultat;
			etatDocuments = 'ok';
		} catch (e) {
			if (signal.aborted) return;
			if (await redirigerSiSessionExpiree(e)) return;
			if (e instanceof ApiError && e.status === 404) {
				erreurDocuments = "Cet élève n'existe plus. La liste va être actualisée.";
				onactualiser();
			} else {
				erreurDocuments = messageErreur(e);
			}
			etatDocuments = 'erreur';
		}
	}

	// --- Re-téléchargement d'un document déjà établi : lien signé (1 h) demandé à chaque clic.
	let documentEnCours = $state<string | null>(null);

	async function telechargerDocument(doc: DocumentEleve) {
		if (documentEnCours) return;
		documentEnCours = doc.id;
		try {
			const { url } = await session.requeteAuthentifiee((token) =>
				documentsApi.lienTelechargement(token, doc.id)
			);
			lancerTelechargement(
				url,
				nomFichierPdf(doc.typeDocument.nom, courant ? nomComplet(courant) : '')
			);
		} catch (e) {
			if (await redirigerSiSessionExpiree(e)) return;
			toast.afficher(messageErreur(e));
		} finally {
			documentEnCours = null;
		}
	}

	onMount(() => {
		titre.focus();
		if (modeInitial === 'voir') void chargerDetail();
	});
	onDestroy(() => controleur?.abort());

	const titres: Record<ModeFeuille, string> = {
		voir: "Fiche de l'élève",
		modifier: "Modifier l'élève",
		ajouter: 'Ajouter un élève'
	};

	async function passerEnModification() {
		valeurs = valeursInitiales(courant);
		erreurs = {};
		erreurGlobale = '';
		mode = 'modifier';
		await tick();
		titre.focus();
	}

	function fermer() {
		modal.fermer();
	}

	function focaliserPremiereErreur() {
		const premier = ORDRE_CHAMPS.find((c) => erreurs[c]);
		if (premier) document.getElementById(`f-${premier}`)?.focus();
	}

	async function soumettre(confirmerDoublon = false) {
		if (mode === 'voir' || envoi) return;
		erreurGlobale = '';

		if (!confirmerDoublon) {
			erreurs = validerEleve(valeurs);
			if (ORDRE_CHAMPS.some((c) => erreurs[c])) {
				await tick();
				focaliserPremiereErreur();
				return;
			}
		}

		const source = mode === 'modifier' ? courant : null;
		const payload = construirePayload(valeurs, source);
		if (mode === 'modifier' && Object.keys(payload).length === 0) {
			toast.afficher('Aucune modification à enregistrer.');
			fermer();
			return;
		}

		envoi = true;
		try {
			const corps = confirmerDoublon ? { ...payload, confirmerDoublon: true } : payload;
			const resultat = await session.requeteAuthentifiee((token) =>
				source ? elevesApi.modifier(token, source.id, corps) : elevesApi.creer(token, corps)
			);
			doublonOuvert = false;
			onenregistre(resultat, mode === 'ajouter' ? 'ajouter' : 'modifier');
			fermer();
		} catch (e) {
			doublonOuvert = false;
			if (await redirigerSiSessionExpiree(e)) return;
			await traiterErreur(e);
		} finally {
			envoi = false;
		}
	}

	async function traiterErreur(e: unknown) {
		if (e instanceof ApiError) {
			// Les 409 n'ont pas de `champ` : on s'appuie sur leur `code`.
			if (e.code === CODE_ELEVE_DOUBLON_POSSIBLE) {
				doublonOuvert = true;
				return;
			}
			if (e.code === CODE_MATRICULE_DEJA_UTILISE) {
				erreurs = { ...erreurs, matricule: e.message };
				await tick();
				return focaliserPremiereErreur();
			}
			if (e.code === CODE_MATRICULE_EDUCMASTER_DEJA_UTILISE) {
				erreurs = { ...erreurs, matriculeEducMaster: e.message };
				await tick();
				return focaliserPremiereErreur();
			}

			const parChamp = erreursParChamp(e);
			if (parChamp) {
				const suivantes: ErreursEleve = {};
				const autres: string[] = [];
				for (const { champ, message } of parChamp) {
					if ((ORDRE_CHAMPS as string[]).includes(champ)) {
						suivantes[champ as keyof ErreursEleve] = message;
					} else {
						// Champ hors formulaire (ex. « statut ») : on ne perd pas le message.
						autres.push(message);
					}
				}
				erreurs = suivantes;
				erreurGlobale = autres.join(' ');
				await tick();
				return focaliserPremiereErreur();
			}

			if (e.status === 404) {
				erreurGlobale = "Cet élève n'existe plus.";
				onactualiser();
				return;
			}
		}
		erreurGlobale = messageErreur(e);
	}
</script>

<Modal
	bind:this={modal}
	variante="panneau"
	labelledby="sheet-titre"
	verrouille={envoi || doublonOuvert}
	onfermer={onferme}
>
	<form
		novalidate
		onsubmit={(e) => {
			e.preventDefault();
			void soumettre();
		}}
	>
		<div class="sh">
			<h2 id="sheet-titre" tabindex="-1" bind:this={titre}>{titres[mode]}</h2>
			<button type="button" class="kebab" aria-label="Fermer" onclick={fermer}>
				<Icon name="close" />
			</button>
		</div>

		<div class="sb">
			{#if erreurGlobale}
				<p class="banner" role="alert">{erreurGlobale}</p>
			{/if}

			{#if mode === 'voir' && courant}
				<EleveFiche
					eleve={courant}
					documents={detail?.documents ?? []}
					{etatDocuments}
					{erreurDocuments}
					onreessayer={chargerDetail}
					ontelecharger={telechargerDocument}
					{documentEnCours}
				/>
			{:else if mode !== 'voir'}
				<EleveFormulaire bind:valeurs bind:erreurs desactive={envoi} />
			{/if}
		</div>

		<div class="sf">
			{#if mode === 'voir' && courant}
				<button type="button" class="btn ghost" onclick={passerEnModification}>Modifier</button>
				<button type="button" class="btn" onclick={() => courant && onetablirdocument(courant)}>
					Établir un document
				</button>
			{:else}
				<button type="button" class="btn ghost" disabled={envoi} onclick={fermer}>Annuler</button>
				<button type="submit" class="btn" disabled={envoi} aria-busy={envoi && !doublonOuvert}>
					{envoi && !doublonOuvert ? 'Enregistrement…' : 'Enregistrer'}
				</button>
			{/if}
		</div>
	</form>
</Modal>

{#if doublonOuvert}
	<ConfirmDoublonDialog
		{envoi}
		onconfirmer={() => soumettre(true)}
		onannuler={() => (doublonOuvert = false)}
	/>
{/if}
