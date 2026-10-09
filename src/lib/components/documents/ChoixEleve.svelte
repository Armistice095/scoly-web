<script lang="ts">
	import { onDestroy } from 'svelte';
	import { elevesApi } from '$lib/api/eleves';
	import Icon from '$lib/components/Icon.svelte';
	import SkeletonLignes from '$lib/components/skeleton/SkeletonLignes.svelte';
	import { session } from '$lib/stores/session.svelte';
	import type { Eleve } from '$lib/types';
	import { segmentsSurlignes } from '$lib/utils/documents';
	import { nomComplet } from '$lib/utils/eleves';
	import { messageErreur } from '$lib/utils/erreurs-api';
	import { redirigerSiSessionExpiree } from '$lib/utils/session-expiree';

	interface Props {
		id: string;
		selection: Eleve | null;
		/** Message d'erreur affiché sous le champ (porté par le parent). */
		erreur: string;
		/** Effacer l'erreur dès que l'utilisateur agit. */
		onsaisie?: () => void;
	}

	let { id, selection = $bindable(), erreur, onsaisie }: Props = $props();

	const DELAI_MS = 250;
	const MAX_RESULTATS = 8;

	let saisie = $state(selection ? nomComplet(selection) : '');
	let resultats = $state<Eleve[]>([]);
	let ouvert = $state(false);
	let actif = $state(0);
	let chargement = $state(false);
	let erreurRecherche = $state('');
	let minuteur: ReturnType<typeof setTimeout> | undefined;
	let controleur: AbortController | null = null;

	onDestroy(() => {
		clearTimeout(minuteur);
		controleur?.abort();
	});

	async function rechercher(q: string) {
		controleur?.abort();
		controleur = new AbortController();
		const signal = controleur.signal;
		chargement = true;
		erreurRecherche = '';
		try {
			const reponse = await session.requeteAuthentifiee((token) =>
				elevesApi.lister(token, { search: q.trim() || undefined, limit: MAX_RESULTATS }, signal)
			);
			if (signal.aborted) return;
			resultats = reponse.data;
			actif = 0;
		} catch (e) {
			if (signal.aborted) return;
			if (await redirigerSiSessionExpiree(e)) return;
			resultats = [];
			erreurRecherche = messageErreur(e);
		} finally {
			if (!signal.aborted) chargement = false;
		}
	}

	function surSaisie() {
		selection = null;
		onsaisie?.();
		ouvert = true;
		clearTimeout(minuteur);
		minuteur = setTimeout(() => void rechercher(saisie), DELAI_MS);
	}

	function ouvrir() {
		if (ouvert) return;
		ouvert = true;
		void rechercher(saisie);
	}

	function choisir(eleve: Eleve) {
		clearTimeout(minuteur);
		controleur?.abort();
		selection = eleve;
		saisie = nomComplet(eleve);
		ouvert = false;
		chargement = false;
		onsaisie?.();
	}

	function clavier(e: KeyboardEvent) {
		if (!ouvert) {
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault();
				ouvrir();
			}
			return;
		}
		if (e.key === 'ArrowDown' && resultats.length) {
			e.preventDefault();
			actif = (actif + 1) % resultats.length;
		} else if (e.key === 'ArrowUp' && resultats.length) {
			e.preventDefault();
			actif = (actif - 1 + resultats.length) % resultats.length;
		} else if (e.key === 'Enter') {
			if (resultats[actif]) {
				e.preventDefault();
				choisir(resultats[actif]);
			}
		} else if (e.key === 'Escape') {
			ouvert = false;
		}
	}

	$effect(() => {
		// Garde l'option active visible lors de la navigation au clavier.
		if (ouvert) document.getElementById(`${id}-opt-${actif}`)?.scrollIntoView({ block: 'nearest' });
	});
</script>

<div class="combo">
	<span class="ic"><Icon name="search" /></span>
	<input
		{id}
		type="text"
		role="combobox"
		aria-expanded={ouvert}
		aria-controls={`${id}-liste`}
		aria-autocomplete="list"
		aria-haspopup="listbox"
		aria-activedescendant={ouvert && resultats[actif] ? `${id}-opt-${actif}` : undefined}
		aria-invalid={erreur ? 'true' : undefined}
		aria-describedby={erreur ? `${id}-erreur` : undefined}
		aria-required="true"
		autocomplete="off"
		placeholder="Rechercher par nom"
		bind:value={saisie}
		oninput={surSaisie}
		onfocus={ouvrir}
		onblur={() => (ouvert = false)}
		onkeydown={clavier}
	/>
	{#if selection}
		<span class="coche" aria-hidden="true"><Icon name="checkmark" /></span>
	{/if}
	{#if ouvert}
		<ul class="liste" id={`${id}-liste`} role="listbox" aria-label="Élèves correspondants">
			{#if erreurRecherche}
				<li class="info" role="presentation">{erreurRecherche}</li>
			{:else if chargement && resultats.length === 0}
				<li class="info" role="presentation">
					<SkeletonLignes lignes={3} libelle="Recherche en cours…" />
				</li>
			{:else if resultats.length === 0}
				<li class="info" role="presentation">Aucun élève ne correspond à « {saisie.trim()} ».</li>
			{:else}
				{#each resultats as eleve, i (eleve.id)}
					<!-- Le clavier est géré par le champ (aria-activedescendant) : l'option n'est pas focalisable. -->
					<li
						id={`${id}-opt-${i}`}
						role="option"
						aria-selected={i === actif}
						class:actif={i === actif}
						onmousedown={(e) => {
							// Garde le focus dans le champ : sinon le blur ferme la liste avant le clic.
							e.preventDefault();
							choisir(eleve);
						}}
						onmouseenter={() => (actif = i)}
					>
						<span class="nom">
							{#each segmentsSurlignes(nomComplet(eleve), saisie) as seg, k (k)}
								{#if seg.surligne}<mark>{seg.texte}</mark>{:else}{seg.texte}{/if}
							{/each}
						</span>
						{#if eleve.classe ?? eleve.matricule}
							<span class="meta">{eleve.classe ?? eleve.matricule}</span>
						{/if}
					</li>
				{/each}
			{/if}
		</ul>
	{/if}
</div>

<style>
	.combo {
		position: relative;
	}
	.ic {
		position: absolute;
		left: 12px;
		top: 12px;
		color: var(--ink-3);
		pointer-events: none;
		display: flex;
	}
	.coche {
		position: absolute;
		right: 12px;
		top: 12px;
		display: flex;
		color: var(--brand-2);
		pointer-events: none;
		animation: pop-coche var(--dur-2) var(--ease-out);
	}
	.coche :global(path) {
		stroke-dasharray: 30;
		animation: trace var(--dur-3) var(--ease-out) 80ms backwards;
	}
	.combo input {
		padding-right: 38px;
		padding-left: 38px;
	}
	.liste {
		animation: pop-in var(--dur-1) var(--ease-out);
		transform-origin: top center;
		position: absolute;
		z-index: 5;
		left: 0;
		right: 0;
		top: calc(100% + 4px);
		margin: 0;
		padding: 6px;
		list-style: none;
		max-height: 264px;
		overflow-y: auto;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: var(--r-md);
		box-shadow: var(--shadow-2);
	}
	li {
		display: flex;
		justify-content: space-between;
		gap: var(--s3);
		padding: 10px 12px;
		border-radius: var(--r-sm);
		cursor: pointer;
		font-size: 14.5px;
		color: var(--ink);
	}
	li.actif {
		background: var(--sunken);
	}
	li.info {
		color: var(--ink-3);
		cursor: default;
	}
	li.info :global(.skel-pile) {
		width: 100%;
	}
	.meta {
		flex: none;
		font-size: 13px;
		color: var(--ink-3);
	}
	mark {
		background: none;
		color: var(--brand-2);
		font-weight: 600;
	}
</style>
