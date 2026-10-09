<script lang="ts">
	import VerifTop from './VerifTop.svelte';
	import { formaterDelai } from '$lib/utils/verification';

	interface Props {
		genre: 'indisponible' | 'limite' | 'bug';
		message: string;
		/** Secondes avant de pouvoir réessayer (429). */
		restant: number;
		/** `false` : un nouvel essai ne servirait à rien (lien invalide). */
		reessayable: boolean;
		onreessayer: () => void;
		/** Action secondaire : revenir à la saisie de la référence. */
		onsaisir: () => void;
		libelleSaisir: string;
	}

	let { genre, message, restant, reessayable, onreessayer, onsaisir, libelleSaisir }: Props =
		$props();

	const TITRES = {
		indisponible: 'Vérification momentanément impossible',
		limite: 'Trop de vérifications',
		bug: 'Une erreur est survenue'
	} as const;
</script>

<!-- Jamais « Introuvable » ici : une panne n'est pas un verdict sur le document. -->
<section class="v-carte v-in">
	<VerifTop icone={genre === 'limite' ? 'info' : 'warn'} titre={TITRES[genre]}>
		<p role="alert">{message}</p>
	</VerifTop>
	<div class="v-form v-actions">
		{#if reessayable}
			<button type="button" class="btn" disabled={restant > 0} onclick={onreessayer}>
				{restant > 0 ? `Réessayer dans ${formaterDelai(restant)}` : 'Réessayer'}
			</button>
		{/if}
		<button type="button" class="btn ghost" onclick={onsaisir}>{libelleSaisir}</button>
	</div>
</section>
