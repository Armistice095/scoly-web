<script module lang="ts">
	export type ActionArchive = 'voir' | 'telecharger' | 'annuler';
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	interface Props {
		/** Bouton « … » auquel le menu est ancré. */
		ancre: HTMLElement;
		reference: string;
		/** Document annulé : ni téléchargement, ni nouvelle annulation. */
		annule: boolean;
		onchoix: (action: ActionArchive) => void;
		/** `rendreFocus` : remettre le focus sur le bouton d'ancrage (Échap), sinon laisser Tab continuer. */
		onfermer: (rendreFocus: boolean) => void;
	}

	let { ancre, reference, annule, onchoix, onfermer }: Props = $props();

	let menu: HTMLDivElement;

	const elements = () => Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));

	function positionner() {
		const r = ancre.getBoundingClientRect();
		const { offsetWidth: largeur, offsetHeight: hauteur } = menu;
		const gauche = Math.max(8, Math.min(r.right - largeur, window.innerWidth - largeur - 8));
		let haut = r.bottom + 4;
		// Pas la place en dessous : on ouvre vers le haut.
		const versLeHaut = haut + hauteur > window.innerHeight - 8;
		if (versLeHaut) haut = Math.max(8, r.top - hauteur - 4);
		// Le zoom part du bouton : coin haut-droit, ou bas-droit si le menu s'ouvre vers le haut.
		menu.style.setProperty('--origine', versLeHaut ? 'bottom right' : 'top right');
		menu.style.left = `${gauche}px`;
		menu.style.top = `${haut}px`;
	}

	onMount(() => {
		positionner();
		elements()[0]?.focus();
	});

	function choisir(action: ActionArchive) {
		// `aria-disabled` : l'entrée reste atteignable au clavier (et lue), mais inactive.
		if (action === 'telecharger' && annule) return;
		onchoix(action);
	}

	function clavier(e: KeyboardEvent) {
		const liste = elements();
		const i = liste.indexOf(document.activeElement as HTMLButtonElement);
		if (e.key === 'Escape') {
			e.preventDefault();
			onfermer(true);
		} else if (e.key === 'Tab') {
			onfermer(false);
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			liste[(i + 1) % liste.length]?.focus();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			liste[(i - 1 + liste.length) % liste.length]?.focus();
		} else if (e.key === 'Home') {
			e.preventDefault();
			liste[0]?.focus();
		} else if (e.key === 'End') {
			e.preventDefault();
			liste[liste.length - 1]?.focus();
		}
	}

	function clicExterieur(e: PointerEvent) {
		const cible = e.target as Node;
		// Le clic sur le bouton d'ancrage est géré par la page (bascule ouvert/fermé).
		if (!menu.contains(cible) && !ancre.contains(cible)) onfermer(false);
	}
</script>

<svelte:window
	onpointerdown={clicExterieur}
	onresize={() => onfermer(false)}
	onscroll={() => onfermer(false)}
/>

<div
	class="menu"
	role="menu"
	tabindex="-1"
	aria-label={`Actions pour ${reference}`}
	bind:this={menu}
	onkeydown={clavier}
>
	<button type="button" role="menuitem" onclick={() => choisir('voir')}>
		<Icon name="eye" />Voir
	</button>
	<button
		type="button"
		role="menuitem"
		aria-disabled={annule}
		aria-describedby={annule ? 'menu-hint-annule' : undefined}
		onclick={() => choisir('telecharger')}
	>
		<Icon name="download" />Télécharger
	</button>
	{#if annule}
		<p class="hint" id="menu-hint-annule">Un document annulé ne peut pas être téléchargé.</p>
	{:else}
		<button type="button" role="menuitem" class="danger" onclick={() => choisir('annuler')}>
			<Icon name="cancel" />Annuler le document
		</button>
	{/if}
</div>

<style>
	/* Entrée inactive mais focalisable : atténuée, sans pointeur « actif ». */
	button[aria-disabled='true'] {
		opacity: 0.55;
		cursor: not-allowed;
	}
</style>
