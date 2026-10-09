<script lang="ts">
	import { tick } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import Skeleton from '$lib/components/skeleton/Skeleton.svelte';
	import NotificationLigne from '$lib/components/notifications/NotificationLigne.svelte';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { libelleBadge, libelleCloche } from '$lib/utils/notifications';
	import { ouvrirNotification } from '$lib/utils/ouvrir-notification';

	const PANNEAU_ID = 'notif-panneau';

	let ouvert = $state(false);
	let maintenant = $state(new Date());
	let conteneur: HTMLDivElement;
	let bouton: HTMLButtonElement;
	let panneau = $state<HTMLDivElement>();

	const menu = notifications.menu;
	const badge = $derived(libelleBadge(notifications.nonLues));

	async function ouvrir() {
		ouvert = true;
		maintenant = new Date();
		void notifications.chargerMenu();
		await tick();
		focaliserPremier();
	}

	function fermer(rendreFocus = false) {
		if (!ouvert) return;
		ouvert = false;
		if (rendreFocus) bouton?.focus();
	}

	function basculer() {
		if (ouvert) fermer(true);
		else void ouvrir();
	}

	/** Éléments atteignables au clavier dans le panneau (lignes, « Réessayer », lien du pied). */
	const focalisables = () =>
		panneau ? Array.from(panneau.querySelectorAll<HTMLElement>('button, a[href]')) : [];

	function focaliserPremier() {
		focalisables()[0]?.focus();
	}

	function clavier(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			fermer(true);
			return;
		}
		if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
		const liste = focalisables();
		if (liste.length === 0) return;
		e.preventDefault();
		const i = liste.indexOf(document.activeElement as HTMLElement);
		const cible =
			e.key === 'Home'
				? 0
				: e.key === 'End'
					? liste.length - 1
					: (i + (e.key === 'ArrowDown' ? 1 : -1) + liste.length) % liste.length;
		liste[cible]?.focus();
	}

	function clicExterieur(e: PointerEvent) {
		if (ouvert && !conteneur.contains(e.target as Node)) fermer(false);
	}

	/** Le focus quitte la cloche et son panneau (Tab) : on referme sans lui voler le focus. */
	function focusPerdu(e: FocusEvent) {
		const suivant = e.relatedTarget as Node | null;
		if (ouvert && suivant && !conteneur.contains(suivant)) fermer(false);
	}

	async function choisir(id: string) {
		const notification = menu.elements.find((n) => n.id === id);
		if (!notification) return;
		fermer(false);
		await ouvrirNotification(notification);
	}

	// Un changement de page referme le panneau.
	$effect(() => {
		void page.url.pathname;
		ouvert = false;
	});
</script>

<svelte:window onpointerdown={clicExterieur} onresize={() => fermer(false)} />

<div class="notif" bind:this={conteneur} onfocusout={focusPerdu}>
	<button
		bind:this={bouton}
		class="round"
		type="button"
		aria-haspopup="dialog"
		aria-expanded={ouvert}
		aria-controls={PANNEAU_ID}
		aria-label={libelleCloche(notifications.nonLues)}
		onclick={basculer}
	>
		<Icon name="bell" />
		{#if badge}
			<span class="nbadge" aria-hidden="true">{badge}</span>
		{/if}
	</button>

	{#if ouvert}
		<div
			bind:this={panneau}
			id={PANNEAU_ID}
			class="notif-panel"
			role="dialog"
			aria-label="Notifications"
			tabindex="-1"
			onkeydown={clavier}
		>
			{#if menu.etat === 'chargement' || menu.etat === 'initial'}
				<div class="np-etat" aria-busy="true">
					<span class="sr-only" role="status">Chargement des notifications…</span>
					<ul class="np-list" aria-hidden="true">
						{#each [0, 1, 2] as l (l)}
							<li class="nt">
								<Skeleton largeur="36px" hauteur="36px" rond />
								<span class="nt-tx">
									<Skeleton largeur="55%" hauteur="14px" />
									<Skeleton largeur="90%" hauteur="14px" classe="mt-s" />
								</span>
							</li>
						{/each}
					</ul>
				</div>
			{:else if menu.etat === 'erreur'}
				<div class="np-etat" role="alert">
					<p>{menu.erreur}</p>
					<button type="button" class="btn ghost sm" onclick={() => notifications.chargerMenu()}>
						Réessayer
					</button>
				</div>
			{:else if menu.elements.length === 0}
				<p class="np-etat">Aucune notification pour le moment.</p>
			{:else}
				<ul class="np-list">
					{#each menu.elements as notification (notification.id)}
						<li>
							<NotificationLigne
								{notification}
								{maintenant}
								onclick={() => choisir(notification.id)}
							/>
						</li>
					{/each}
				</ul>
			{/if}
			<a class="np-foot" href={resolve('/notifications')} onclick={() => fermer(false)}>
				Ouvrir le centre de notifications
			</a>
		</div>
	{/if}
</div>

<style>
	:global(.mt-s) {
		margin-top: 6px;
	}
</style>
