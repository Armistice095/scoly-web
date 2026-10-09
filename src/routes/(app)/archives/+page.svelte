<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { archivesApi } from '$lib/api/archives';
	import { ApiError } from '$lib/api/client';
	import { documentsApi } from '$lib/api/documents';
	import AnnulerDocumentDialog from '$lib/components/archives/AnnulerDocumentDialog.svelte';
	import ApercuArchiveDialog from '$lib/components/archives/ApercuArchiveDialog.svelte';
	import ArchiveActionsMenu, {
		type ActionArchive
	} from '$lib/components/archives/ArchiveActionsMenu.svelte';
	import ArchiveFiltres from '$lib/components/archives/ArchiveFiltres.svelte';
	import ArchiveSheet from '$lib/components/archives/ArchiveSheet.svelte';
	import ArchiveTable from '$lib/components/archives/ArchiveTable.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import SkeletonTable from '$lib/components/skeleton/SkeletonTable.svelte';
	import { session } from '$lib/stores/session.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import {
		CODE_DOCUMENT_ANNULE,
		type ArchiveFiche,
		type ArchiveListe,
		type ArchivesPage,
		type StatutArchive,
		type TriArchives,
		type TypeDocument
	} from '$lib/types';
	import {
		LIBELLE_TRI,
		cibleDepuisLigne,
		libelleTotal,
		lirePage,
		lireStatut,
		lireTri,
		lireUuid,
		nomFichierDocument,
		type CibleDocument
	} from '$lib/utils/archives';
	import { messageErreur } from '$lib/utils/erreurs-api';
	import { libellePlage } from '$lib/utils/eleves';
	import { redirigerSiSessionExpiree } from '$lib/utils/session-expiree';
	import { lancerTelechargement } from '$lib/utils/telechargement';

	const PAR_PAGE = 10;
	const DELAI_RECHERCHE_MS = 300;
	const DUREE_ECLAIR_MS = 1500;

	/* ---------- État de la liste, porté par l'URL (?q=&type=&statut=&tri=&page=) ---------- */

	const q = $derived(page.url.searchParams.get('q')?.trim() ?? '');
	const typeId = $derived(lireUuid(page.url.searchParams.get('type')));
	const statut = $derived(lireStatut(page.url.searchParams.get('statut')));
	const tri = $derived(lireTri(page.url.searchParams.get('tri')));
	const pageCourante = $derived(lirePage(page.url.searchParams.get('page')));
	// Le tri n'est pas un filtre : « Réinitialiser » ne le touche pas.
	const filtreActif = $derived(q !== '' || typeId !== '' || statut !== '');

	interface Changements {
		q?: string;
		type?: string;
		statut?: StatutArchive | '';
		tri?: TriArchives;
		page?: number;
	}

	function naviguer(
		changements: Changements,
		options: { remplacer?: boolean; defiler?: boolean } = {}
	) {
		const suivant = { q, type: typeId, statut, tri, page: pageCourante, ...changements };
		// Objet local jetable (jamais lu par le template) : pas besoin de SvelteURLSearchParams.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams();
		if (suivant.q) params.set('q', suivant.q);
		if (suivant.type) params.set('type', suivant.type);
		if (suivant.statut) params.set('statut', suivant.statut);
		if (suivant.tri !== 'recent') params.set('tri', suivant.tri);
		if (suivant.page > 1) params.set('page', String(suivant.page));
		const qs = params.toString();
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() est appliqué à la base
		return goto(`${resolve('/archives')}${qs ? `?${qs}` : ''}`, {
			replaceState: options.remplacer ?? false,
			keepFocus: true,
			noScroll: !(options.defiler ?? false)
		});
	}

	/* ---------- Recherche avec debounce ---------- */

	// svelte-ignore state_referenced_locally
	let saisie = $state(q);
	let derniereRecherche = untrack(() => q);
	let minuteur: ReturnType<typeof setTimeout> | undefined;
	let filtres: ReturnType<typeof ArchiveFiltres>;

	function appliquerRecherche() {
		clearTimeout(minuteur);
		const valeur = saisie.trim();
		if (valeur === q) return;
		derniereRecherche = valeur;
		void naviguer({ q: valeur, page: 1 }, { remplacer: true });
	}

	function surSaisie() {
		clearTimeout(minuteur);
		minuteur = setTimeout(appliquerRecherche, DELAI_RECHERCHE_MS);
	}

	// Retour arrière / « Réinitialiser » : l'URL change sans que l'utilisateur ait tapé.
	$effect(() => {
		const dansUrl = q;
		untrack(() => {
			if (dansUrl !== derniereRecherche) {
				derniereRecherche = dansUrl;
				saisie = dansUrl;
			}
		});
	});

	function reinitialiser() {
		clearTimeout(minuteur);
		saisie = '';
		derniereRecherche = '';
		void naviguer({ q: '', type: '', statut: '', page: 1 });
		filtres?.focaliser();
	}

	/* ---------- Types de document (filtre) ---------- */

	let types = $state<TypeDocument[]>([]);
	let minuteurEclair: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		const controleur = new AbortController();
		void (async () => {
			try {
				const liste = await session.requeteAuthentifiee((token) =>
					documentsApi.listerTypes(token, controleur.signal)
				);
				if (!controleur.signal.aborted) types = liste;
			} catch (e) {
				if (controleur.signal.aborted) return;
				if (await redirigerSiSessionExpiree(e)) return;
				// La liste reste utilisable sans ce filtre : on prévient simplement.
				toast.afficher('Impossible de charger les types de document pour le filtre.');
			}
		})();
		return () => {
			controleur.abort();
			clearTimeout(minuteur);
			clearTimeout(minuteurEclair);
		};
	});

	// Un type inconnu dans l'URL (lien périmé) est retiré plutôt que de montrer une liste vide.
	$effect(() => {
		if (types.length > 0 && typeId && !types.some((t) => t.id === typeId)) {
			void naviguer({ type: '', page: 1 }, { remplacer: true });
		}
	});

	/* ---------- Chargement de la liste ---------- */

	let donnees = $state<ArchivesPage | null>(null);
	let chargement = $state(true);
	let erreurChargement = $state('');
	let rechargement = $state(0);

	async function charger(
		params: {
			search: string;
			type: string;
			statut: StatutArchive | '';
			tri: TriArchives;
			page: number;
		},
		signal: AbortSignal
	) {
		chargement = true;
		erreurChargement = '';
		try {
			const reponse = await session.requeteAuthentifiee((token) =>
				archivesApi.lister(
					token,
					{
						search: params.search || undefined,
						typeDocumentId: params.type || undefined,
						statut: params.statut || undefined,
						tri: params.tri,
						page: params.page,
						limit: PAR_PAGE
					},
					signal
				)
			);
			if (signal.aborted) return;
			// Page hors bornes (URL modifiée, dernière page vidée) : on se replace sur la dernière.
			if (
				reponse.data.length === 0 &&
				reponse.meta.total > 0 &&
				params.page > reponse.meta.totalPages
			) {
				void naviguer({ page: reponse.meta.totalPages }, { remplacer: true });
				return;
			}
			donnees = reponse;
		} catch (e) {
			if (signal.aborted) return;
			if (await redirigerSiSessionExpiree(e)) return;
			erreurChargement = messageErreur(e);
		} finally {
			if (!signal.aborted) chargement = false;
		}
	}

	$effect(() => {
		const params = { search: q, type: typeId, statut, tri, page: pageCourante };
		void rechargement;
		const controleur = new AbortController();
		untrack(() => void charger(params, controleur.signal));
		// Une nouvelle frappe, un filtre ou un changement de page annule la requête précédente.
		return () => controleur.abort();
	});

	const recharger = () => rechargement++;

	/* ---------- Menu d'actions ---------- */

	let menu = $state<{ archive: ArchiveListe; ancre: HTMLButtonElement } | null>(null);

	function basculerMenu(archive: ArchiveListe, ancre: HTMLButtonElement) {
		menu = menu?.archive.id === archive.id ? null : { archive, ancre };
	}

	function fermerMenu(rendreFocus: boolean) {
		if (rendreFocus) menu?.ancre.focus();
		menu = null;
	}

	function choisirAction(action: ActionArchive) {
		if (!menu) return;
		const { archive } = menu;
		fermerMenu(true);
		if (action === 'voir') ouvrirFiche(archive);
		else if (action === 'telecharger') void telecharger(cibleDepuisLigne(archive));
		else demanderAnnulation(cibleDepuisLigne(archive));
	}

	/* ---------- Fiche du document ---------- */

	let feuille = $state<{ ligne: ArchiveListe } | null>(null);
	let feuilleRef = $state<ReturnType<typeof ArchiveSheet>>();

	function ouvrirFiche(archive: ArchiveListe) {
		feuille = { ligne: archive };
	}

	/* ---------- Fiche ouverte depuis une notification (?ouvrir=<id>) ---------- */

	const ouvrirIdUrl = $derived(page.url.searchParams.get('ouvrir'));

	$effect(() => {
		const id = ouvrirIdUrl;
		if (!id) return;
		const controleur = new AbortController();
		untrack(() => {
			void (async () => {
				try {
					const fiche = await session.requeteAuthentifiee((token) =>
						archivesApi.consulter(token, id, controleur.signal)
					);
					if (controleur.signal.aborted) return;
					// Le panneau s'ouvre sur une « ligne » de liste ; la fiche en contient tous les champs.
					feuille = {
						ligne: {
							id: fiche.id,
							reference: fiche.reference,
							statut: fiche.statut,
							createdAt: fiche.createdAt,
							dateEmission: fiche.dateEmission,
							typeDocument: fiche.typeDocument,
							eleve: { id: fiche.eleve.id, nomComplet: fiche.eleve.nomComplet },
							annulation: fiche.annulation
								? { motif: fiche.annulation.motif, le: fiche.annulation.le }
								: null,
							telechargeable: fiche.telechargeable
						}
					};
				} catch (e) {
					if (controleur.signal.aborted) return;
					if (await redirigerSiSessionExpiree(e)) return;
					toast.afficher(
						e instanceof ApiError && e.status === 404
							? 'Ce document est introuvable.'
							: messageErreur(e)
					);
				} finally {
					if (!controleur.signal.aborted) {
						void goto(resolve('/archives'), {
							replaceState: true,
							keepFocus: true,
							noScroll: true
						});
					}
				}
			})();
		});
		return () => controleur.abort();
	});

	/** « Voir la fiche élève » : on quitte les Archives pour l'écran Élèves, filtré sur cet élève. */
	function voirEleve(matricule: string | null) {
		const ligne = feuille?.ligne;
		if (!ligne) return;
		const recherche = matricule ?? ligne.eleve.nomComplet;
		feuille = null;
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() est appliqué à la base
		void goto(`${resolve('/eleves')}?q=${encodeURIComponent(recherche)}`);
	}

	/* ---------- Téléchargement (un seul à la fois, lien signé demandé à chaque clic) ---------- */

	let telechargementId = $state<string | null>(null);

	async function telecharger(cible: CibleDocument): Promise<boolean> {
		if (telechargementId) return false;
		telechargementId = cible.id;
		try {
			const { url } = await session.requeteAuthentifiee((token) =>
				archivesApi.lienTelechargement(token, cible.id)
			);
			lancerTelechargement(url, nomFichierDocument(cible));
			toast.afficher(`Téléchargement lancé : ${cible.reference}`);
			// Le téléchargement est journalisé : l'historique de la fiche ouverte a une ligne de plus.
			void feuilleRef?.actualiser();
			return true;
		} catch (e) {
			if (await redirigerSiSessionExpiree(e)) return false;
			if (e instanceof ApiError && e.code === CODE_DOCUMENT_ANNULE) {
				toast.afficher('Ce document a été annulé : il ne peut plus être téléchargé.');
				recharger();
				void feuilleRef?.actualiser();
			} else if (e instanceof ApiError && e.status === 404) {
				// « Le fichier PDF de ce document est introuvable. » / « Document introuvable. »
				toast.afficher(e.message);
				recharger();
			} else {
				toast.afficher(messageErreur(e));
			}
			return false;
		} finally {
			telechargementId = null;
		}
	}

	/* ---------- Aperçu PDF ---------- */

	let apercu = $state<{ cible: CibleDocument; motif: string | null } | null>(null);

	/* ---------- Annulation ---------- */

	let annulation = $state<CibleDocument | null>(null);
	let annulationReussie = false;
	let eclairId = $state<string | null>(null);

	function demanderAnnulation(cible: CibleDocument) {
		annulationReussie = false;
		annulation = cible;
	}

	function surAnnule(fiche: ArchiveFiche) {
		annulationReussie = true;
		toast.afficher(`Document annulé : ${fiche.reference}`);

		// La ligne passe à « Annulé » tout de suite, sans attendre un rechargement.
		if (donnees) {
			donnees = {
				...donnees,
				data: donnees.data.map((l) =>
					l.id === fiche.id
						? {
								...l,
								statut: fiche.statut,
								telechargeable: fiche.telechargeable,
								annulation: fiche.annulation
									? { motif: fiche.annulation.motif, le: fiche.annulation.le }
									: null
							}
						: l
				)
			};
		}
		feuilleRef?.appliquerFiche(fiche);

		eclairId = fiche.id;
		clearTimeout(minuteurEclair);
		minuteurEclair = setTimeout(() => (eclairId = null), DUREE_ECLAIR_MS);

		// Sous le filtre « Actifs », le document ne correspond plus : total et lignes sont à refaire.
		if (statut === 'ACTIF') recharger();
	}

	/** Quelqu'un d'autre l'a annulé entre-temps : on se met à jour. */
	function surDejaAnnule() {
		toast.afficher('Ce document a déjà été annulé par un autre utilisateur.');
		recharger();
		void feuilleRef?.actualiser();
	}

	function surIntrouvable() {
		toast.afficher('Ce document est introuvable.');
		feuilleRef?.fermer();
		recharger();
	}

	async function surFermetureAnnulation() {
		annulation = null;
		// Le bouton « Annuler le document » de la fiche a disparu : le focus ne doit pas se perdre.
		if (annulationReussie) {
			await tick();
			void feuilleRef?.reprendreFocusSiPerdu();
		}
	}

	const total = $derived(donnees?.meta.total ?? 0);
	const premierChargement = $derived(chargement && donnees === null);
</script>

<svelte:head>
	<title>Archives · Scoly</title>
</svelte:head>

<ArchiveFiltres
	bind:this={filtres}
	bind:saisie
	{types}
	{typeId}
	{statut}
	{filtreActif}
	onsaisie={surSaisie}
	onvalider={appliquerRecherche}
	ontype={(id) => naviguer({ type: id, page: 1 })}
	onstatut={(s) => naviguer({ statut: s, page: 1 })}
	onreinitialiser={reinitialiser}
/>

<div class="meta">
	<p class="count" aria-live="polite">
		{#if donnees}{libelleTotal(total)}{/if}
	</p>
	<button
		type="button"
		class="btn ghost sm"
		aria-label={`Tri : ${LIBELLE_TRI[tri].toLowerCase()}. Activer pour inverser l’ordre.`}
		onclick={() => naviguer({ tri: tri === 'recent' ? 'ancien' : 'recent', page: 1 })}
	>
		<Icon name="sort" class={tri === 'ancien' ? 'i tourne inverse' : 'i tourne'} />
		{LIBELLE_TRI[tri]}
	</button>
</div>

{#if premierChargement}
	<SkeletonTable
		entetes={['Référence', 'Élève', 'Document', 'Créé le', 'Statut', 'Actions']}
		libelle="Chargement des documents…"
	/>
{:else if erreurChargement}
	<div class="emptybox" role="alert">
		<p>{erreurChargement}</p>
		<button type="button" class="btn ghost" onclick={recharger}>Réessayer</button>
		{#if filtreActif}
			<button type="button" class="btn ghost" onclick={reinitialiser}>
				Réinitialiser les filtres
			</button>
		{/if}
	</div>
{:else if donnees && donnees.data.length === 0}
	<div class="emptybox">
		{#if filtreActif}
			<p>
				Aucun document ne correspond à votre recherche. Modifiez les mots saisis ou réinitialisez
				les filtres.
			</p>
			<button type="button" class="btn ghost" onclick={reinitialiser}>
				Réinitialiser les filtres
			</button>
		{:else}
			<p>
				Aucun document archivé pour le moment. Les documents que vous établissez apparaissent ici.
			</p>
			<a href={resolve('/documents')}>Établir un document</a>
		{/if}
	</div>
{:else if donnees}
	<div class="liste" class:occupee={chargement} aria-busy={chargement}>
		<ArchiveTable
			archives={donnees.data}
			recherche={q}
			menuOuvertId={menu?.archive.id ?? null}
			{eclairId}
			onmenu={basculerMenu}
			onvoir={ouvrirFiche}
		/>
	</div>

	<div class="pager">
		<span>{libellePlage(donnees.meta.page, donnees.meta.limit, donnees.meta.total)}</span>
		{#if donnees.meta.totalPages > 1}
			<nav aria-label="Pagination">
				<div>
					<button
						type="button"
						class="btn ghost sm"
						disabled={donnees.meta.page <= 1}
						onclick={() => naviguer({ page: donnees!.meta.page - 1 }, { defiler: true })}
					>
						Précédent
					</button>
					<button
						type="button"
						class="btn ghost sm"
						disabled={donnees.meta.page >= donnees.meta.totalPages}
						onclick={() => naviguer({ page: donnees!.meta.page + 1 }, { defiler: true })}
					>
						Suivant
					</button>
				</div>
			</nav>
		{/if}
	</div>
{/if}

{#if menu}
	<ArchiveActionsMenu
		ancre={menu.ancre}
		reference={menu.archive.reference}
		annule={menu.archive.statut === 'ANNULE'}
		onchoix={choisirAction}
		onfermer={fermerMenu}
	/>
{/if}

{#if feuille}
	{@const ligne = feuille.ligne}
	<ArchiveSheet
		bind:this={feuilleRef}
		{ligne}
		{telechargementId}
		onferme={() => (feuille = null)}
		ontelecharger={() => telecharger(cibleDepuisLigne(ligne))}
		onapercu={(motif) => (apercu = { cible: cibleDepuisLigne(ligne), motif })}
		onannuler={() => demanderAnnulation(cibleDepuisLigne(ligne))}
		onvoireleve={voirEleve}
		onactualiser={recharger}
	/>
{/if}

{#if apercu}
	{@const courant = apercu}
	<ApercuArchiveDialog
		id={courant.cible.id}
		reference={courant.cible.reference}
		motifAnnulation={courant.motif}
		{telechargementId}
		ontelecharger={() => telecharger(courant.cible)}
		onferme={() => (apercu = null)}
	/>
{/if}

{#if annulation}
	<AnnulerDocumentDialog
		cible={annulation}
		onferme={surFermetureAnnulation}
		onannule={surAnnule}
		ondejaannule={surDejaAnnule}
		onintrouvable={surIntrouvable}
	/>
{/if}

<style>
	/* Rechargement (page suivante, recherche) : on garde l'ancienne liste, atténuée, sans clignotement. */
	.liste {
		transition: opacity 0.15s;
	}
	.liste.occupee {
		opacity: 0.55;
	}
</style>
