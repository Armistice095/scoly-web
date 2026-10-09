<script module lang="ts">
	export type ActionEleve = 'voir' | 'modifier' | 'document';
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	interface Props {
		/** Bouton « … » auquel le menu est ancré. */
		ancre: HTMLElement;
		onchoix: (action: ActionEleve) => void;
		/** `rendreFocus` : remettre le focus sur le bouton d'ancrage (Échap), sinon laisser Tab continuer. */
		onfermer: (rendreFocus: boolean) => void;
	}

	let { ancre, onchoix, onfermer }: Props = $props();

	let menu: HTMLDivElement;

	const actions: { id: ActionEleve; libelle: string; icone: 'eye' | 'edit' | 'doc' }[] = [
		{ id: 'voir', libelle: 'Voir la fiche', icone: 'eye' },
		{ id: 'modifier', libelle: 'Modifier', icone: 'edit' },
		{ id: 'document', libelle: 'Établir un document', icone: 'doc' }
	];

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
	aria-label="Actions de l'élève"
	bind:this={menu}
	onkeydown={clavier}
>
	{#each actions as action (action.id)}
		<button type="button" role="menuitem" onclick={() => onchoix(action.id)}>
			<Icon name={action.icone} />{action.libelle}
		</button>
	{/each}
</div>
