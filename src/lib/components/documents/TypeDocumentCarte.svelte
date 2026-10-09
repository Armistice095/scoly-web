<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { TypeDocument } from '$lib/types';
	import { monter } from '$lib/motion';
	import { iconeType } from '$lib/utils/documents';

	interface Props {
		type: TypeDocument;
		onetablir: (type: TypeDocument) => void;
		/** Rang dans la grille : décale légèrement l'apparition (cascade). */
		indice?: number;
	}

	let { type, onetablir, indice = 0 }: Props = $props();
</script>

<button
	type="button"
	class="carte"
	disabled={!type.disponible}
	aria-label={type.disponible ? `Établir : ${type.nom}` : `${type.nom} : bientôt disponible`}
	onclick={() => onetablir(type)}
	in:monter|global={{ y: 8, delay: Math.min(indice, 7) * 30 }}
>
	<span class="ic"><Icon name={iconeType(type.code)} /></span>
	<h2>{type.nom}</h2>
	<p>{type.description}</p>
	{#if type.disponible}
		<span class="go">Établir <Icon name="arrow" /></span>
	{:else}
		<span class="badge b-wait">Bientôt disponible</span>
	{/if}
</button>

<style>
	.carte {
		all: unset;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: var(--s3);
		align-items: flex-start;
		padding: var(--s5);
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: var(--r-lg);
		box-shadow: var(--shadow-1);
		cursor: pointer;
		transition:
			border-color var(--dur-1) var(--ease-out),
			box-shadow var(--dur-1) var(--ease-out),
			transform var(--dur-1) var(--ease-out);
	}
	.carte:hover:not(:disabled) {
		border-color: var(--brand-2);
		box-shadow: var(--shadow-2);
		transform: translateY(-2px);
	}
	.carte:active:not(:disabled) {
		transform: none;
	}
	.carte:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.carte:disabled {
		cursor: not-allowed;
		opacity: 0.7;
	}
	.ic {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: var(--accent-soft);
		color: var(--accent);
		display: grid;
		place-items: center;
	}
	h2 {
		font: 500 20px/1.25 var(--font-serif);
		margin: 0;
	}
	p {
		margin: 0;
		color: var(--ink-2);
		font-size: 14px;
		flex: 1;
	}
	.go {
		font-size: 14px;
		font-weight: 500;
		color: var(--brand-2);
		display: flex;
		align-items: center;
		gap: 6px;
	}
</style>
