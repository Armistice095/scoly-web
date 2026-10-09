<script lang="ts">
	interface Props {
		/** Texte lu par les lecteurs d'écran (invisible à l'écran). */
		libelle?: string;
	}

	let { libelle = 'Chargement…' }: Props = $props();
</script>

<span class="spinner" role="status"><span class="sr-only">{libelle}</span></span>
