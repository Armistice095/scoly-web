<script lang="ts">
	import { resolve } from '$app/paths';
	import Logo from '$lib/components/Logo.svelte';

	interface Props {
		/** « Vérifier un autre document » : masqué sur l'écran de saisie. */
		afficherAutre: boolean;
		onautre: () => void;
	}

	let { afficherAutre, onautre }: Props = $props();
</script>

<header class="v-head">
	<a class="v-brand" href={resolve('/verifier')} aria-label="Scoly, nouvelle vérification">
		<Logo height={40} />
	</a>
	<div class="v-head-r">
		{#if afficherAutre}
			<button type="button" class="v-lnk" onclick={onautre}>Vérifier un autre document</button>
		{/if}
		<span class="v-head-titre">Vérification de document</span>
	</div>
</header>
