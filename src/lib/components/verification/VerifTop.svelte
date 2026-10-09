<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	interface Props {
		/** Icône ronde en tête de carte (voir Icon.svelte). */
		icone: string;
		titre: string;
		/** Texte explicatif sous le titre. */
		children?: Snippet;
	}

	let { icone, titre, children }: Props = $props();
</script>

<div class="v-top">
	<div class="v-ic"><Icon name={icone} /></div>
	<!-- `tabindex=-1` + id fixe : la page y déplace le focus à chaque nouveau résultat. -->
	<h1 id="v-titre" tabindex="-1">{titre}</h1>
	{@render children?.()}
</div>
