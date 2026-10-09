<script lang="ts">
	// Le SVG est inliné, pas chargé via une balise image, pour que ses règles
	// CSS internes (bascule clair/sombre via prefers-color-scheme) restent actives.
	import logoMarkup from '$lib/assets/scoly-logo.svg?raw';

	interface Props {
		/** Hauteur du logo en pixels. 40 dans la topbar, 72 sur les pages d'authentification. */
		height?: number;
		class?: string;
	}

	let { height = 40, class: className = '' }: Props = $props();
</script>

<span class={className} style:display="block" style:height="{height}px" style:width="auto">
	{@html logoMarkup}
</span>

<style>
	span :global(svg) {
		display: block;
		height: 100%;
		width: auto;
	}
</style>
