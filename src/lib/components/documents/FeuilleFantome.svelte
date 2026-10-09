<script lang="ts">
	import Skeleton from '$lib/components/skeleton/Skeleton.svelte';
	import Spinner from '$lib/components/Spinner.svelte';

	interface Props {
		libelle?: string;
	}

	let { libelle = "Génération de l'aperçu…" }: Props = $props();
</script>

<!-- Silhouette d'une page A4 pendant que l'aperçu se prépare (même hauteur que la feuille finale). -->
<div class="scene">
	<div class="feuille" aria-hidden="true">
		<Skeleton largeur="55%" hauteur="12px" classe="centre" />
		<Skeleton largeur="35%" hauteur="10px" classe="centre" />
		<Skeleton largeur="70%" hauteur="22px" classe="titre centre" />
		<div class="skel-pile corps">
			<Skeleton hauteur="11px" />
			<Skeleton hauteur="11px" />
			<Skeleton largeur="80%" hauteur="11px" />
			<Skeleton hauteur="11px" />
			<Skeleton largeur="60%" hauteur="11px" />
		</div>
		<div class="trio">
			<Skeleton hauteur="38px" />
			<Skeleton hauteur="38px" />
			<Skeleton hauteur="38px" />
		</div>
	</div>
	<p class="legende">
		<Spinner {libelle} />
		<span aria-hidden="true">{libelle}</span>
	</p>
</div>

<style>
	.scene {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--s3);
		height: clamp(320px, calc(100dvh - 300px), 820px);
		padding: 16px 16px 12px;
		background: var(--sunken);
		border: 1px solid var(--line);
		border-radius: var(--r-md);
	}
	.feuille {
		display: flex;
		flex-direction: column;
		gap: 12px;
		flex: 1;
		min-height: 0;
		aspect-ratio: 210 / 297;
		max-width: 100%;
		padding: 7% 8%;
		overflow: hidden;
		background: #fff;
		border-radius: 2px;
		box-shadow: var(--shadow-2);
	}
	.feuille :global(.centre) {
		align-self: center;
	}
	.feuille :global(.titre) {
		margin: 8px 0;
	}
	.corps {
		margin: 4px 0 8px;
	}
	.trio {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}
	.legende {
		display: flex;
		align-items: center;
		gap: var(--s2);
		margin: 0;
		font-size: 13px;
		color: var(--ink-2);
	}
	.legende :global(.spinner) {
		width: 14px;
		height: 14px;
	}
</style>
