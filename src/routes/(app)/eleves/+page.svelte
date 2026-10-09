<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { ApiError } from '$lib/api/client';
	import { elevesApi } from '$lib/api/eleves';
	import EleveActionsMenu, {
		type ActionEleve
	} from '$lib/components/eleves/EleveActionsMenu.svelte';
	import EleveSheet, { type ModeFeuille } from '$lib/components/eleves/EleveSheet.svelte';
	import EleveTable from '$lib/components/eleves/EleveTable.svelte';
	import ImportElevesDialog from '$lib/components/eleves/ImportElevesDialog.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import SkeletonTable from '$lib/components/skeleton/SkeletonTable.svelte';
	import { session } from '$lib/stores/session.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import type { Eleve, ElevesPage, StatutEleve } from '$lib/types';
	import { messageErreur } from '$lib/utils/erreurs-api';
	import { libellePlage, nomComplet } from '$lib/utils/eleves';
	import { redirigerSiSessionExpiree } from '$lib/utils/session-expiree';

	const PAR_PAGE = 10;
	const DELAI_RECHERCHE_MS = 300;

	/* ---------- État de la liste, porté par l'URL (?q=&statut=&page=) ---------- */

	const q = $derived(page.url.searchParams.get('q')?.trim() ?? '');
	const statut = $derived<StatutEleve | ''>(
		page.url.searchParams.get('statut') === 'ACTIF' ? 'ACTIF' : ''
	);
	const pageCourante = $derived(
		Math.max(1, Number.parseInt(page.url.searchParams.get('page') ?? '', 10) || 1)
	);
	const filtreActif = $derived(q !== '' || statut !== '');

	interface Changements {
		q?: string;
		statut?: StatutEleve | '';
		page?: number;
	}

	function naviguer(
		changements: Changements,
		options: { remplacer?: boolean; defiler?: boolean } = {}
	) {
		const suivant = { q, statut, page: pageCourante, ...changements };
		// Objet local jetable (jamais lu par le template) : pas besoin de SvelteURLSearchParams.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams();
		if (suivant.q) params.set('q', suivant.q);
		if (suivant.statut) params.set('statut', suivant.statut);
		if (suivant.page > 1) params.set('page', String(suivant.page));
		const qs = params.toString();
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() est appliqué à la base
		return goto(`${resolve('/eleves')}${qs ? `?${qs}` : ''}`, {
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
	let champRecherche: HTMLInputElement;

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
		void naviguer({ q: '', statut: '', page: 1 });
		champRecherche?.focus();
	}

	/* ---------- Chargement ---------- */

	let donnees = $state<ElevesPage | null>(null);
	let chargement = $state(true);
	let erreurChargement = $state('');
	let rechargement = $state(0);

	async function charger(
		params: { search: string; statut: StatutEleve | ''; page: number },
		signal: AbortSignal
	) {
		chargement = true;
		erreurChargement = '';
		try {
			const reponse = await session.requeteAuthentifiee((token) =>
				elevesApi.lister(
					token,
					{
						search: params.search || undefined,
						statut: params.statut || undefined,
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
		const params = { search: q, statut, page: pageCourante };
		void rechargement;
		const controleur = new AbortController();
		untrack(() => void charger(params, controleur.signal));
		// Une nouvelle frappe ou un changement de page annule la requête précédente.
		return () => controleur.abort();
	});

	const recharger = () => rechargement++;

	/* ---------- Menu d'actions, panneau, import ---------- */

	let menu = $state<{ eleve: Eleve; ancre: HTMLButtonElement } | null>(null);
	let feuille = $state<{ mode: ModeFeuille; eleve: Eleve | null } | null>(null);
	let importOuvert = $state(false);

	/* ---------- Fiche ouverte depuis une notification (?ouvrir=<id>) ---------- */

	const ouvrirIdUrl = $derived(page.url.searchParams.get('ouvrir'));

	$effect(() => {
		const id = ouvrirIdUrl;
		if (!id) return;
		const controleur = new AbortController();
		untrack(() => {
			void (async () => {
				try {
					const detail = await session.requeteAuthentifiee((token) =>
						elevesApi.consulter(token, id, controleur.signal)
					);
					if (!controleur.signal.aborted) feuille = { mode: 'voir', eleve: detail };
				} catch (e) {
					if (controleur.signal.aborted) return;
					if (await redirigerSiSessionExpiree(e)) return;
					toast.afficher(
						e instanceof ApiError && e.status === 404
							? 'Cet élève est introuvable.'
							: messageErreur(e)
					);
				} finally {
					// Le paramètre a rempli son rôle : on le retire pour qu'un rechargement ne rouvre pas la fiche.
					if (!controleur.signal.aborted) {
						void goto(resolve('/eleves'), { replaceState: true, keepFocus: true, noScroll: true });
					}
				}
			})();
		});
		return () => controleur.abort();
	});

	function basculerMenu(eleve: Eleve, ancre: HTMLButtonElement) {
		menu = menu?.eleve.id === eleve.id ? null : { eleve, ancre };
	}

	function fermerMenu(rendreFocus: boolean) {
		if (rendreFocus) menu?.ancre.focus();
		menu = null;
	}

	/** Ouvre l'écran Documents avec cet élève présélectionné (`?eleve=<id>`). */
	function etablirDocument(eleve: Eleve) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() est appliqué à la base
		void goto(`${resolve('/documents')}?eleve=${encodeURIComponent(eleve.id)}`);
	}

	function choisirAction(action: ActionEleve) {
		if (!menu) return;
		const { eleve } = menu;
		menu = null;
		if (action === 'document') etablirDocument(eleve);
		else feuille = { mode: action, eleve };
	}

	function surEnregistre(eleve: Eleve, mode: 'ajouter' | 'modifier') {
		toast.afficher(
			mode === 'ajouter'
				? `Élève ajouté : ${nomComplet(eleve)}.`
				: `Modifications enregistrées : ${nomComplet(eleve)}.`
		);
		recharger();
	}

	function surImporte(nombre: number) {
		toast.afficher(`${nombre} ${nombre > 1 ? 'élèves importés' : 'élève importé'}.`);
		// Les nouveaux élèves sont triés par ordre alphabétique : on repart d'une liste non filtrée.
		if (filtreActif || pageCourante > 1) reinitialiser();
		else recharger();
	}

	const total = $derived(donnees?.meta.total ?? 0);
	const premierChargement = $derived(chargement && donnees === null);
</script>

<Seo titre="Élèves" noindex />

<div class="head">
	<p class="count" aria-live="polite">
		{#if donnees}{total} {total > 1 ? 'élèves' : 'élève'}{/if}
	</p>
	<div class="hbtns">
		<button type="button" class="btn ghost" onclick={() => (importOuvert = true)}>
			<Icon name="upload" />Importer des élèves
		</button>
		<button type="button" class="btn" onclick={() => (feuille = { mode: 'ajouter', eleve: null })}>
			<Icon name="plus" />Ajouter un élève
		</button>
	</div>
</div>

<div class="tools" role="search">
	<div class="search">
		<Icon name="search" />
		<label class="sr-only" for="recherche">Rechercher par nom ou par matricule</label>
		<input
			id="recherche"
			type="search"
			placeholder="Rechercher un élève ou un matricule"
			autocomplete="off"
			bind:this={champRecherche}
			bind:value={saisie}
			oninput={surSaisie}
			onkeydown={(e) => e.key === 'Enter' && appliquerRecherche()}
		/>
	</div>
	<label class="sr-only" for="filtre-statut">Statut</label>
	<select
		id="filtre-statut"
		value={statut}
		onchange={(e) => naviguer({ statut: e.currentTarget.value as StatutEleve | '', page: 1 })}
	>
		<option value="">Tous les statuts</option>
		<option value="ACTIF">Inscrit</option>
	</select>
	{#if filtreActif}
		<button type="button" class="btn ghost" onclick={reinitialiser}>Réinitialiser</button>
	{/if}
</div>

{#if premierChargement}
	<SkeletonTable
		entetes={['Élève', 'Sexe', 'Date de naissance', 'Lieu de naissance', 'Statut', 'Actions']}
		libelle="Chargement des élèves…"
	/>
{:else if erreurChargement}
	<div class="emptybox" role="alert">
		<p>{erreurChargement}</p>
		<button type="button" class="btn ghost" onclick={recharger}>Réessayer</button>
	</div>
{:else if donnees && donnees.data.length === 0}
	<div class="emptybox">
		{#if filtreActif}
			<p>Aucun élève ne correspond à votre recherche.</p>
			<button type="button" class="btn ghost" onclick={reinitialiser}>Réinitialiser</button>
		{:else}
			<p>Aucun élève pour le moment. Ajoutez un premier élève ou importez une liste Excel.</p>
			<button
				type="button"
				class="btn"
				onclick={() => (feuille = { mode: 'ajouter', eleve: null })}
			>
				<Icon name="plus" />Ajouter un élève
			</button>
		{/if}
	</div>
{:else if donnees}
	<div class="liste" class:occupee={chargement} aria-busy={chargement}>
		<EleveTable
			eleves={donnees.data}
			menuOuvertId={menu?.eleve.id ?? null}
			onmenu={basculerMenu}
			onvoir={(eleve) => (feuille = { mode: 'voir', eleve })}
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
	<EleveActionsMenu ancre={menu.ancre} onchoix={choisirAction} onfermer={fermerMenu} />
{/if}

{#if feuille}
	<EleveSheet
		modeInitial={feuille.mode}
		eleve={feuille.eleve}
		onferme={() => (feuille = null)}
		onenregistre={surEnregistre}
		onactualiser={recharger}
		onetablirdocument={etablirDocument}
	/>
{/if}

{#if importOuvert}
	<ImportElevesDialog onferme={() => (importOuvert = false)} onimporte={surImporte} />
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
