<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import VerificationPage from '$lib/components/verification/VerificationPage.svelte';
	import { jetonVide } from '$lib/utils/verification';

	// Segment lu dans l'URL du QR (`/verifier/<jeton>`), transmis tel quel à l'API dans le CORPS de la requête.
	const token = $derived(page.params.token ?? '');
	const vide = $derived(jetonVide(token));

	// Jeton vide (ex. `/verifier/%20`) : rien à vérifier, on bascule sur la saisie manuelle.
	$effect(() => {
		if (vide) void goto(resolve('/verifier'), { replaceState: true });
	});
</script>

{#if !vide}
	<!-- Parcours QR : vérification automatique au chargement, jamais d'AMBIGU. -->
	<VerificationPage {token} />
{/if}
