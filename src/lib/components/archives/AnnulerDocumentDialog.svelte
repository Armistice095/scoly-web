<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { ApiError } from '$lib/api/client';
	import { archivesApi } from '$lib/api/archives';
	import Modal from '$lib/components/Modal.svelte';
	import { session } from '$lib/stores/session.svelte';
	import { CODE_DOCUMENT_DEJA_ANNULE, type ArchiveFiche } from '$lib/types';
	import { MOTIF_MAX, validerMotif, type CibleDocument } from '$lib/utils/archives';
	import { erreursParChamp, messageErreur } from '$lib/utils/erreurs-api';
	import { redirigerSiSessionExpiree } from '$lib/utils/session-expiree';

	interface Props {
		cible: CibleDocument;
		/** Appelé quand la fenêtre est fermée et son animation de sortie terminée. */
		onferme: () => void;
		/** Annulation enregistrée : la fiche à jour. La fenêtre se ferme ensuite d'elle-même. */
		onannule: (fiche: ArchiveFiche) => void;
		/** `409 DOCUMENT_DEJA_ANNULE` : quelqu'un d'autre l'a annulé entre-temps. */
		ondejaannule: () => void;
		/** `404` : le document n'existe plus. */
		onintrouvable: () => void;
	}

	let { cible, onferme, onannule, ondejaannule, onintrouvable }: Props = $props();

	let modal: ReturnType<typeof Modal>;
	let champ: HTMLInputElement;

	let motif = $state('');
	let erreur = $state('');
	let erreurGlobale = $state('');
	let envoi = $state(false);
	let secoue = $state(false);
	// La validation « en direct » ne démarre qu'après une première tentative : pas de rouge pendant la frappe initiale.
	let tentee = $state(false);

	onMount(() => champ.focus());

	function surSaisie() {
		erreurGlobale = '';
		if (tentee) erreur = validerMotif(motif) ?? '';
	}

	async function signaler(message: string) {
		erreur = message;
		// Rejoue la secousse même si l'erreur est déjà affichée.
		secoue = false;
		await tick();
		secoue = true;
		champ.focus();
	}

	async function soumettre() {
		// Double clic / Entrée répétée : une seule requête à la fois.
		if (envoi) return;
		tentee = true;
		erreurGlobale = '';

		const invalide = validerMotif(motif);
		if (invalide) return signaler(invalide);
		erreur = '';

		envoi = true;
		try {
			const fiche = await session.requeteAuthentifiee((token) =>
				archivesApi.annuler(token, cible.id, motif.trim())
			);
			onannule(fiche);
			modal.fermer();
		} catch (e) {
			if (await redirigerSiSessionExpiree(e)) return;
			if (e instanceof ApiError && e.code === CODE_DOCUMENT_DEJA_ANNULE) {
				ondejaannule();
				modal.fermer();
				return;
			}
			if (e instanceof ApiError && e.status === 404) {
				onintrouvable();
				modal.fermer();
				return;
			}
			const parChamp = erreursParChamp(e);
			if (parChamp) {
				const surMotif = parChamp.find((c) => c.champ === 'motif');
				if (surMotif) await signaler(surMotif.message);
				const autres = parChamp.filter((c) => c.champ !== 'motif').map((c) => c.message);
				if (autres.length) erreurGlobale = autres.join(' ');
				return;
			}
			erreurGlobale = messageErreur(e);
		} finally {
			envoi = false;
		}
	}
</script>

<Modal bind:this={modal} labelledby="annuler-titre" verrouille={envoi} onfermer={onferme}>
	<form
		novalidate
		onsubmit={(e) => {
			e.preventDefault();
			void soumettre();
		}}
	>
		<h2 id="annuler-titre">Annuler ce document ?</h2>
		<p id="annuler-desc">
			{cible.reference}, {cible.typeNom} de {cible.eleveNom}. Un document annulé reste dans
			l’archive mais ne peut plus être téléchargé. <strong>Cette action est définitive.</strong>
		</p>

		{#if erreurGlobale}
			<p class="banner" role="alert">{erreurGlobale}</p>
		{/if}

		<label for="annuler-motif">Motif de l’annulation *</label>
		<input
			id="annuler-motif"
			class={['dlg-in', secoue && 'secoue']}
			bind:this={champ}
			bind:value={motif}
			oninput={surSaisie}
			onanimationend={() => (secoue = false)}
			placeholder="Ex. Erreur sur le nom de l’élève"
			autocomplete="off"
			disabled={envoi}
			required
			aria-required="true"
			aria-invalid={erreur ? 'true' : undefined}
			aria-describedby={erreur ? 'annuler-erreur annuler-desc' : 'annuler-desc'}
		/>
		<div class="ligne-aide">
			<p class="err" id="annuler-erreur" role={erreur ? 'alert' : undefined}>{erreur}</p>
			{#if motif.trim().length > MOTIF_MAX - 100}
				<span class="compteur" class:depasse={motif.trim().length > MOTIF_MAX} aria-hidden="true">
					{motif.trim().length}/{MOTIF_MAX}
				</span>
			{/if}
		</div>

		<div class="dlg-acts">
			<button type="button" class="btn ghost" disabled={envoi} onclick={() => modal.fermer()}>
				Garder le document
			</button>
			<button type="submit" class="btn danger" disabled={envoi} aria-busy={envoi}>
				{envoi ? 'Annulation…' : 'Annuler le document'}
			</button>
		</div>
	</form>
</Modal>

<style>
	.ligne-aide {
		display: flex;
		justify-content: space-between;
		gap: var(--s3);
		min-height: 22px;
	}
	.compteur {
		margin-top: 6px;
		font-size: 13px;
		color: var(--ink-3);
		font-variant-numeric: tabular-nums;
	}
	.compteur.depasse {
		color: var(--err);
	}
</style>
