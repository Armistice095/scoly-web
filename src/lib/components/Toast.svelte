<script lang="ts">
	import { fade } from 'svelte/transition';
	import { DUREE, duree, monter } from '$lib/motion';
	import { toast } from '$lib/stores/toast.svelte';
</script>

<!-- La région live est toujours présente : les lecteurs d'écran annoncent de façon fiable un contenu
     inséré dans une région déjà existante (pas une région créée en même temps que le message). -->
<div class="toast-zone" role="status" aria-live="polite" aria-atomic="true">
	{#if toast.message}
		<div class="toast" in:monter={{ y: 12 }} out:fade={{ duration: duree(DUREE.rapide) }}>
			{toast.message}
		</div>
	{/if}
</div>
