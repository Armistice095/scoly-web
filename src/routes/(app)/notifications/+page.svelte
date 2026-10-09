<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import NotificationLigne from '$lib/components/notifications/NotificationLigne.svelte';
	import Skeleton from '$lib/components/skeleton/Skeleton.svelte';
	import { notifications, type FiltreCentre } from '$lib/stores/notifications.svelte';
	import type { CategorieNotification, GroupeNotification, Notification } from '$lib/types';
	import { CATEGORIES, GROUPES, libelleNonLues } from '$lib/utils/notifications';
	import { ouvrirNotification } from '$lib/utils/ouvrir-notification';

	const centre = notifications.centre;

	let statut = $state<FiltreCentre['statut']>('toutes');
	let categorie = $state<CategorieNotification | ''>('');
	let maintenant = $state(new Date());
	let titreListe = $state<HTMLElement>();
	let horloge: ReturnType<typeof setInterval> | undefined;

	const filtre = $derived<FiltreCentre>({ statut, categorie });
	const nonLues = $derived(notifications.nonLues);

	/**
	 * Sur « Non lues », une notification marquée comme lue disparaît tout de suite de la liste
	 * (comme dans la maquette), sans attendre un rechargement.
	 */
	const visibles = $derived(
		statut === 'non_lues' ? centre.elements.filter((n) => !n.lue) : centre.elements
	);
	const parGroupe = $derived(
		GROUPES.map((g) => ({
			...g,
			elements: visibles.filter((n) => n.groupe === g.valeur)
		})).filter((g) => g.elements.length > 0)
	);

	const messageVide = $derived(
		statut === 'non_lues'
			? 'Tout est à jour, aucune notification non lue.'
			: categorie
				? 'Aucune notification dans cette catégorie.'
				: 'Aucune notification pour le moment.'
	);

	function charger() {
		maintenant = new Date();
		void notifications.chargerCentre(filtre);
	}

	onMount(() => {
		charger();
		// Les temps relatifs (« Il y a 12 min ») se rafraîchissent chaque minute.
		horloge = setInterval(() => (maintenant = new Date()), 60_000);
	});
	onDestroy(() => clearInterval(horloge));

	function choisirStatut(valeur: FiltreCentre['statut']) {
		if (statut === valeur) return;
		statut = valeur;
		charger();
	}

	function surCategorie(e: Event) {
		categorie = (e.currentTarget as HTMLSelectElement).value as CategorieNotification | '';
		charger();
	}

	async function basculer(notification: Notification) {
		// Voisine à qui rendre le focus si la ligne disparaît (onglet « Non lues »).
		const i = visibles.findIndex((n) => n.id === notification.id);
		const voisine = visibles[i + 1] ?? visibles[i - 1];
		const disparait = statut === 'non_lues' && !notification.lue;

		await notifications.definirLecture(notification.id, !notification.lue);
		await tick();
		const bouton =
			document.querySelector<HTMLElement>(`[data-marquer="${notification.id}"]`) ??
			(disparait && voisine
				? document.querySelector<HTMLElement>(`[data-marquer="${voisine.id}"]`)
				: null);
		(bouton ?? titreListe)?.focus();
	}

	async function toutLire() {
		await notifications.toutLire();
		await tick();
		titreListe?.focus();
	}

	const libelleGroupe = (g: GroupeNotification) => GROUPES.find((x) => x.valeur === g)?.libelle;
</script>

<svelte:head><title>Centre de notifications – Scoly</title></svelte:head>

<div class="nc-head">
	<div>
		<h1>Centre de notifications</h1>
		<p class="nc-sub" role="status" aria-live="polite">{libelleNonLues(nonLues)}</p>
	</div>
	<button type="button" class="btn ghost" disabled={nonLues === 0} onclick={toutLire}>
		Tout marquer comme lu
	</button>
</div>

<div class="nc-tools">
	<div class="chips" role="group" aria-label="Filtrer les notifications">
		<button
			type="button"
			class="chip"
			aria-pressed={statut === 'toutes'}
			onclick={() => choisirStatut('toutes')}
		>
			Toutes
		</button>
		<button
			type="button"
			class="chip"
			aria-pressed={statut === 'non_lues'}
			onclick={() => choisirStatut('non_lues')}
		>
			Non lues{nonLues > 0 ? ` (${nonLues})` : ''}
		</button>
	</div>
	<label class="sr-only" for="nc-type">Type de notification</label>
	<select id="nc-type" value={categorie} onchange={surCategorie}>
		<option value="">Tous les types</option>
		{#each CATEGORIES as c (c.valeur)}
			<option value={c.valeur}>{c.libelle}</option>
		{/each}
	</select>
</div>

<div class="sr-only" tabindex="-1" bind:this={titreListe}>Liste des notifications</div>

{#if centre.etat === 'chargement' || centre.etat === 'initial'}
	<div aria-busy="true">
		<span class="sr-only" role="status">Chargement des notifications…</span>
		<div class="nc-g" aria-hidden="true">Chargement</div>
		<ul class="nc-ul" aria-hidden="true">
			{#each [0, 1, 2, 3] as l (l)}
				<li class="nc-row">
					<div class="nt">
						<Skeleton largeur="36px" hauteur="36px" rond />
						<span class="nt-tx">
							<Skeleton largeur="30%" hauteur="14px" />
							<Skeleton largeur="70%" hauteur="14px" classe="mt-s" />
						</span>
					</div>
				</li>
			{/each}
		</ul>
	</div>
{:else if centre.etat === 'erreur'}
	<div class="emptybox" role="alert">
		<p>{centre.erreur}</p>
		<button type="button" class="btn ghost" onclick={charger}>Réessayer</button>
	</div>
{:else if visibles.length === 0}
	<div class="emptybox">
		<p>{messageVide}</p>
	</div>
{:else}
	{#each parGroupe as groupe (groupe.valeur)}
		<section aria-labelledby={`nc-g-${groupe.valeur}`}>
			<h2 class="nc-g" id={`nc-g-${groupe.valeur}`}>{libelleGroupe(groupe.valeur)}</h2>
			<ul class="nc-ul">
				{#each groupe.elements as notification (notification.id)}
					<li class="nc-row">
						<NotificationLigne
							{notification}
							{maintenant}
							onclick={() => ouvrirNotification(notification)}
						/>
						<button
							type="button"
							class="nc-mark"
							data-marquer={notification.id}
							onclick={() => basculer(notification)}
						>
							{notification.lue ? 'Marquer comme non lue' : 'Marquer comme lue'}
						</button>
					</li>
				{/each}
			</ul>
		</section>
	{/each}

	{#if centre.curseur}
		<div class="nc-more">
			{#if centre.erreurPlus}
				<p class="err" role="alert">{centre.erreurPlus}</p>
			{/if}
			<button
				type="button"
				class="btn ghost"
				disabled={centre.chargementPlus}
				aria-busy={centre.chargementPlus}
				onclick={() => notifications.chargerPlusCentre(filtre)}
			>
				{centre.chargementPlus ? 'Chargement…' : centre.erreurPlus ? 'Réessayer' : 'Afficher plus'}
			</button>
		</div>
	{/if}
{/if}
