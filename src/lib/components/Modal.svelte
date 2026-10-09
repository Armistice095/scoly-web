<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { DUREE, mouvementReduit } from '$lib/motion';

	interface Props {
		/** `centre` : fenêtre centrée ; `panneau` : panneau latéral (fiche, formulaire). */
		variante?: 'centre' | 'panneau';
		/** `id` du titre de la fenêtre (`aria-labelledby`). */
		labelledby: string;
		/** Classe(s) supplémentaire(s) sur le `<dialog>` (ex. largeur spécifique). */
		classe?: string;
		/** `true` : Échap est ignoré (requête en cours). */
		verrouille?: boolean;
		/**
		 * Appelé quand la fenêtre est fermée ET que son animation de sortie est terminée :
		 * c'est ici que le parent peut démonter le composant sans couper l'animation.
		 */
		onfermer: () => void;
		children: Snippet;
	}

	let {
		variante = 'centre',
		labelledby,
		classe,
		verrouille = false,
		onfermer,
		children
	}: Props = $props();

	let dialog: HTMLDialogElement;

	onMount(() => dialog.showModal());

	/** `false` pendant l'animation de sortie : permet au parent d'ignorer une réouverture trop rapide. */
	export function estOuvert() {
		return dialog.open;
	}

	/** Ferme avec animation (le démontage est différé jusqu'à la fin de la transition CSS). */
	export function fermer() {
		if (dialog.open) dialog.close();
	}

	// Événement `close` : l'attribut `open` vient d'être retiré, la transition de sortie démarre.
	function surFermeture() {
		if (mouvementReduit()) return onfermer();
		let termine = false;
		const finir = () => {
			if (termine) return;
			termine = true;
			onfermer();
		};
		dialog.addEventListener('transitionend', (e) => {
			if (e.target === dialog && e.propertyName === 'opacity') finir();
		});
		// Filet de sécurité : navigateur sans transition de `display`, ou transition interrompue.
		setTimeout(finir, DUREE.normal + 80);
	}
</script>

<dialog
	class={[variante === 'panneau' && 'sheet', classe]}
	bind:this={dialog}
	aria-labelledby={labelledby}
	onclose={surFermeture}
	oncancel={(e) => {
		if (verrouille) e.preventDefault();
	}}
>
	{@render children()}
</dialog>
