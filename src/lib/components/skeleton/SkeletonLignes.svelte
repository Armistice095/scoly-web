<script lang="ts">
	import Skeleton from './Skeleton.svelte';

	interface Props {
		lignes?: number;
		libelle?: string;
	}

	let { lignes = 3, libelle = 'Chargement…' }: Props = $props();

	const largeurs = [72, 58, 66, 50];
</script>

<div class="skel-pile" aria-busy="true">
	<span class="sr-only" role="status">{libelle}</span>
	{#each [...Array(lignes).keys()] as l (l)}
		<Skeleton largeur={`${largeurs[l % largeurs.length]}%`} hauteur="16px" />
	{/each}
</div>
