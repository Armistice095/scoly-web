<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import Icon from '$lib/components/Icon.svelte';
	import { monter } from '$lib/motion';
	import type { ArchiveListe } from '$lib/types';
	import { formaterDate } from '$lib/utils/archives';
	import { segmentsSurlignes } from '$lib/utils/documents';
	import StatutBadge from './StatutBadge.svelte';

	interface Props {
		archives: ArchiveListe[];
		/** Recherche en cours : ses mots sont surlignés dans la référence et le nom. */
		recherche: string;
		/** Document dont le menu d'actions est ouvert (pour `aria-expanded`). */
		menuOuvertId: string | null;
		/** Document qui vient de changer d'état : sa ligne « s'illumine » un instant. */
		eclairId: string | null;
		onmenu: (archive: ArchiveListe, bouton: HTMLButtonElement) => void;
		/** Sur mobile, un appui sur la carte ouvre la fiche. */
		onvoir: (archive: ArchiveListe) => void;
	}

	let { archives, recherche, menuOuvertId, eclairId, onmenu, onvoir }: Props = $props();

	// Même seuil que le passage du tableau en cartes dans design-system.css.
	const mobile = new MediaQuery('max-width: 700px');

	function surClicLigne(e: MouseEvent, archive: ArchiveListe) {
		if (!mobile.current) return; // sur grand écran, les actions passent par le menu ⋯
		if ((e.target as HTMLElement).closest('button, a')) return; // le bouton ⋯ garde son propre rôle
		onvoir(archive);
	}
</script>

{#snippet surligne(texte: string)}
	{#each segmentsSurlignes(texte, recherche) as segment, i (i)}
		{#if segment.surligne}<mark class="trouve">{segment.texte}</mark>{:else}{segment.texte}{/if}
	{/each}
{/snippet}

<div class="tw">
	<table class="tbl">
		<caption class="sr-only">Liste des documents archivés</caption>
		<thead>
			<tr>
				<th scope="col">Référence</th>
				<th scope="col">Élève</th>
				<th scope="col">Document</th>
				<th scope="col">Créé le</th>
				<th scope="col">Statut</th>
				<th scope="col" class="r">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each archives as archive, i (archive.id)}
				{@const annule = archive.statut === 'ANNULE'}
				<!-- Échelonné sur 10 lignes max (page de 10) ; `global` : joue aussi à l'apparition du tableau. -->
				<tr
					class:off={annule}
					class:eclair={eclairId === archive.id}
					class:cliquable={mobile.current}
					onclick={(e) => surClicLigne(e, archive)}
					in:monter|global={{ y: 6, delay: Math.min(i, 9) * 20 }}
				>
					<td class="ref nom" data-l="Référence">{@render surligne(archive.reference)}</td>
					<td data-l="Élève"><div>{@render surligne(archive.eleve.nomComplet)}</div></td>
					<td data-l="Document">{archive.typeDocument.nom}</td>
					<td data-l="Créé le">{formaterDate(archive.createdAt)}</td>
					<td data-l="Statut">
						<div>
							<StatutBadge statut={archive.statut} />
							{#if annule && archive.annulation}
								<span class="hint">Motif : {archive.annulation.motif}</span>
							{/if}
						</div>
					</td>
					<td class="act act-kebab" data-l="Actions">
						<button
							type="button"
							class="kebab"
							aria-label={`Actions pour ${archive.reference}`}
							aria-haspopup="menu"
							aria-expanded={menuOuvertId === archive.id}
							onclick={(e) => onmenu(archive, e.currentTarget)}
						>
							<Icon name="dots" />
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
