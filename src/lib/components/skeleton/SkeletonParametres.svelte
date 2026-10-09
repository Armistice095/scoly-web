<script lang="ts">
	import Skeleton from './Skeleton.svelte';
</script>

<!-- Silhouette de la page Paramètres : onglets + un panneau de formulaire. -->
<div aria-busy="true">
	<span class="sr-only" role="status">Chargement des paramètres…</span>
	<div class="onglets" aria-hidden="true">
		<Skeleton largeur="120px" hauteur="38px" />
		<Skeleton largeur="96px" hauteur="38px" />
		<Skeleton largeur="140px" hauteur="38px" />
	</div>
	<section class="panel" aria-hidden="true">
		<Skeleton largeur="180px" hauteur="24px" />
		<div class="intro"><Skeleton largeur="min(420px, 80%)" hauteur="13px" /></div>
		<div class="fgrid">
			{#each [true, false, false, true, true] as pleine, n (n)}
				<div class="field" class:full={pleine}>
					<div class="skel-pile">
						<Skeleton largeur="30%" hauteur="13px" />
						<Skeleton hauteur="42px" />
					</div>
				</div>
			{/each}
		</div>
	</section>
</div>

<style>
	.onglets {
		display: flex;
		gap: var(--s2);
		margin-bottom: var(--s5);
	}
	.intro {
		margin: 10px 0 var(--s5);
	}
</style>
