<script lang="ts">
	import type { StatutArchive } from '$lib/types';
	import { LIBELLE_STATUT_ARCHIVE } from '$lib/utils/archives';

	interface Props {
		statut: StatutArchive;
	}

	let { statut }: Props = $props();
</script>

<!-- Le statut est écrit en toutes lettres : la couleur ne porte jamais l'information seule. -->
<span class={['badge', statut === 'ANNULE' ? 'b-err' : 'b-ok']}>
	{LIBELLE_STATUT_ARCHIVE[statut]}
</span>
