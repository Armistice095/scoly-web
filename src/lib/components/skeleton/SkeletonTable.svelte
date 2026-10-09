<script lang="ts">
	import Skeleton from './Skeleton.svelte';

	interface Props {
		/** Mêmes intitulés que le vrai tableau : les colonnes ne « sautent » pas à l'arrivée des données. */
		entetes: string[];
		lignes?: number;
		/** Annoncé aux lecteurs d'écran. */
		libelle?: string;
	}

	let { entetes, lignes = 6, libelle = 'Chargement…' }: Props = $props();

	// Largeurs variées : une colonne de blocs identiques ferait « grille », pas « texte ».
	const largeurs = [70, 55, 80, 62, 75, 50];
	const derniere = $derived(entetes.length - 1);
</script>

<div class="tw" aria-busy="true">
	<span class="sr-only" role="status">{libelle}</span>
	<table class="tbl" aria-hidden="true">
		<thead>
			<tr>
				{#each entetes as entete, c (entete)}
					<th scope="col" class:r={c === derniere}>{entete}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each [...Array(lignes).keys()] as l (l)}
				<tr>
					{#each entetes as entete, c (entete)}
						<td
							data-l={entete}
							class:nom={c === 0}
							class:act={c === derniere}
							class:act-kebab={c === derniere}
						>
							{#if c === 0}
								<div class="skel-pile">
									<Skeleton largeur={`${largeurs[l % largeurs.length]}%`} hauteur="14px" />
									<Skeleton largeur="30%" hauteur="11px" />
								</div>
							{:else if c === derniere}
								<Skeleton rond largeur="28px" hauteur="28px" />
							{:else}
								<Skeleton largeur={`${largeurs[(l + c) % largeurs.length]}%`} hauteur="14px" />
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
