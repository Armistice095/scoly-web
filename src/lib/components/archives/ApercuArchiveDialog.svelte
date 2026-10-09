<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { archivesApi } from '$lib/api/archives';
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FeuilleFantome from '$lib/components/documents/FeuilleFantome.svelte';
	import VisionneusePdf from '$lib/components/documents/VisionneusePdf.svelte';
	import { session } from '$lib/stores/session.svelte';
	import { messageErreur } from '$lib/utils/erreurs-api';
	import { redirigerSiSessionExpiree } from '$lib/utils/session-expiree';

	interface Props {
		id: string;
		reference: string;
		/** Motif d'annulation, si le document est annulé (bandeau + téléchargement désactivé). */
		motifAnnulation: string | null;
		/** Document dont le lien de téléchargement est en cours de demande. */
		telechargementId: string | null;
		/** Renvoie `true` si le téléchargement a démarré (l'aperçu se ferme alors). */
		ontelecharger: () => Promise<boolean>;
		onferme: () => void;
	}

	let { id, reference, motifAnnulation, telechargementId, ontelecharger, onferme }: Props =
		$props();

	let modal: ReturnType<typeof Modal>;

	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');
	let message = $state('');
	let urlPdf = $state<string | null>(null);
	let controleur: AbortController | null = null;

	const annule = $derived(motifAnnulation !== null);
	const envoi = $derived(telechargementId === id);

	function libererPdf() {
		if (urlPdf) URL.revokeObjectURL(urlPdf);
		urlPdf = null;
	}

	/** Récupère le PDF avec le jeton (un `<iframe src>` n'enverrait pas l'en-tête Authorization). */
	async function charger() {
		controleur?.abort();
		controleur = new AbortController();
		const signal = controleur.signal;
		etat = 'chargement';
		message = '';
		libererPdf();
		try {
			const { blob } = await session.requeteAuthentifiee((token) =>
				archivesApi.apercu(token, id, signal)
			);
			if (signal.aborted) return;
			urlPdf = URL.createObjectURL(blob);
			etat = 'pret';
		} catch (e) {
			if (signal.aborted) return;
			if (await redirigerSiSessionExpiree(e)) return;
			// 404 : « Le fichier PDF de ce document est introuvable. » (message de l'API, affiché tel quel)
			message = messageErreur(e);
			etat = 'erreur';
		}
	}

	async function telecharger() {
		if (await ontelecharger()) modal.fermer();
	}

	onMount(() => void charger());
	onDestroy(() => {
		controleur?.abort();
		libererPdf();
	});
</script>

<Modal bind:this={modal} classe="apercu-archive" labelledby="apercu-titre" onfermer={onferme}>
	<h2 id="apercu-titre">Aperçu du document</h2>
	<p class="reference">{reference}</p>

	{#if annule}
		<p class="banner" role="status">Document annulé. Motif : {motifAnnulation}</p>
	{/if}

	<div class="zone" aria-busy={etat === 'chargement'}>
		{#if etat === 'chargement'}
			<FeuilleFantome />
		{:else if etat === 'erreur'}
			<div class="etat">
				<p class="banner" role="alert">{message}</p>
				<button type="button" class="btn ghost sm" onclick={() => void charger()}>Réessayer</button>
			</div>
		{:else if urlPdf}
			<VisionneusePdf {urlPdf} />
		{/if}
	</div>

	<div class="dlg-acts">
		<button type="button" class="btn ghost" onclick={() => modal.fermer()}>Fermer</button>
		<button
			type="button"
			class="btn"
			disabled={annule || envoi}
			aria-busy={envoi}
			aria-describedby={annule ? 'apercu-hint' : undefined}
			title={annule ? 'Un document annulé ne peut pas être téléchargé' : undefined}
			onclick={() => void telecharger()}
		>
			{#if !envoi}<Icon name="download" />{/if}{envoi ? 'Téléchargement…' : 'Télécharger'}
		</button>
	</div>
	{#if annule}
		<span class="sr-only" id="apercu-hint">Un document annulé ne peut pas être téléchargé.</span>
	{/if}
</Modal>

<style>
	:global(dialog.apercu-archive) {
		width: min(640px, calc(100vw - 32px));
	}
	.reference {
		margin: var(--s1) 0 var(--s3);
		font-size: 13.5px;
		color: var(--ink-3);
		font-variant-numeric: tabular-nums;
	}
	.zone {
		margin-top: var(--s3);
	}
	/* Même hauteur que la feuille (VisionneusePdf) : la fenêtre ne « saute » pas entre les états. */
	.etat {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--s3);
		height: clamp(320px, calc(100dvh - 340px), 820px);
		color: var(--ink-2);
		text-align: center;
	}
</style>
