<script lang="ts">
	import Skeleton from '$lib/components/skeleton/Skeleton.svelte';
</script>

<!-- Même gabarit que TypeDocumentCarte : la grille ne bouge pas quand les vraies cartes arrivent. -->
<div class="carte" aria-hidden="true">
	<Skeleton largeur="40px" hauteur="40px" classe="pastille" />
	<Skeleton largeur="70%" hauteur="22px" />
	<div class="skel-pile">
		<Skeleton largeur="100%" hauteur="13px" />
		<Skeleton largeur="85%" hauteur="13px" />
	</div>
	<Skeleton largeur="30%" hauteur="14px" />
</div>

<style>
	.carte {
		display: flex;
		flex-direction: column;
		gap: var(--s3);
		align-items: flex-start;
		min-height: 220px;
		padding: var(--s5);
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: var(--r-lg);
		box-shadow: var(--shadow-1);
	}
	.carte :global(.pastille) {
		border-radius: 10px;
	}
	.carte .skel-pile {
		width: 100%;
		flex: 1;
	}
</style>
