<script module lang="ts">
	export type EtatApercu = 'chargement' | 'pret' | 'erreur';
</script>

<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FeuilleFantome from './FeuilleFantome.svelte';
	import VisionneusePdf from './VisionneusePdf.svelte';

	interface Props {
		etat: EtatApercu;
		/** URL `blob:` du PDF filigrané (révoquée par le parent à la fermeture). */
		urlPdf: string | null;
		/** Erreur de chargement de l'aperçu. */
		messageApercu: string;
		/** Erreur de génération (le bouton reste disponible : même `Idempotency-Key`, pas de doublon). */
		erreurEnvoi: string;
		/** Année scolaire manquante : propose un lien vers les Paramètres. */
		lienParametres: boolean;
		envoi: boolean;
		onfermer: () => void;
		ontelecharger: () => void;
		onreessayer: () => void;
	}

	let {
		etat,
		urlPdf,
		messageApercu,
		erreurEnvoi,
		lienParametres,
		envoi,
		onfermer,
		ontelecharger,
		onreessayer
	}: Props = $props();

	let modal: ReturnType<typeof Modal>;

	/** Fermeture animée, déclenchable depuis le parent (succès, erreur de champ…). */
	export function fermer() {
		modal.fermer();
	}
	/** `false` pendant l'animation de sortie. */
	export function estOuvert() {
		return modal.estOuvert();
	}
</script>

<Modal bind:this={modal} classe="apercu" labelledby="apercu-titre" verrouille={envoi} {onfermer}>
	<h2 id="apercu-titre">Aperçu du document</h2>

	<div class="zone" aria-busy={etat === 'chargement'}>
		{#if etat === 'chargement'}
			<FeuilleFantome />
		{:else if etat === 'erreur'}
			<div class="etat">
				<p class="banner" role="alert">{messageApercu}</p>
				{#if lienParametres}
					<a href={resolve('/parametres')}>Ouvrir les Paramètres</a>
				{/if}
				<button type="button" class="btn ghost sm" onclick={onreessayer}>Réessayer</button>
			</div>
		{:else if urlPdf}
			<VisionneusePdf {urlPdf} />
		{/if}
	</div>

	{#if erreurEnvoi}
		<p class="banner" role="alert">
			{erreurEnvoi}
			{#if lienParametres}
				<a href={resolve('/parametres')}>Ouvrir les Paramètres</a>
			{/if}
		</p>
	{/if}

	<div class="dlg-acts">
		<button type="button" class="btn ghost" disabled={envoi} onclick={() => modal.fermer()}>
			Fermer
		</button>
		<button
			type="button"
			class="btn"
			disabled={etat !== 'pret' || envoi}
			aria-busy={envoi}
			onclick={ontelecharger}
		>
			{#if !envoi}<Icon name="download" />{/if}{envoi ? 'Génération…' : 'Télécharger le PDF'}
		</button>
	</div>
</Modal>

<style>
	:global(dialog.apercu) {
		width: min(560px, calc(100vw - 32px));
	}
	.zone {
		margin-top: var(--s4);
	}
	/* Même hauteur que la feuille (VisionneusePdf) : la fenêtre ne « saute » pas entre les états. */
	.etat {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--s3);
		height: clamp(320px, calc(100dvh - 300px), 820px);
		margin: 0;
		color: var(--ink-2);
		text-align: center;
	}
	a {
		color: var(--brand-2);
	}
</style>
