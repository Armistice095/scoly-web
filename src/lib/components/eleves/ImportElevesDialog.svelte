<script lang="ts">
	import { ApiError } from '$lib/api/client';
	import { elevesApi } from '$lib/api/eleves';
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { session } from '$lib/stores/session.svelte';
	import type { ErreurLigneImport } from '$lib/types';
	import { erreursParLigne, messageErreur } from '$lib/utils/erreurs-api';
	import { redirigerSiSessionExpiree } from '$lib/utils/session-expiree';
	import { enregistrerFichier } from '$lib/utils/telechargement';

	const TAILLE_MAX = 2 * 1024 * 1024; // 2 Mo
	const NOM_MODELE = 'modele-import-eleves.xlsx';

	interface Props {
		onferme: () => void;
		onimporte: (nombre: number) => void;
	}

	let { onferme, onimporte }: Props = $props();

	let modal: ReturnType<typeof Modal>;
	let champFichier: HTMLInputElement;

	let fichier = $state<File | null>(null);
	let erreurFichier = $state('');
	let envoi = $state(false);
	let telechargement = $state(false);
	let erreurModele = $state('');
	/** Résultat d'un import refusé : message global + erreurs par ligne Excel (le cas échéant). */
	let refus = $state<{ message: string; lignes: ErreurLigneImport[] } | null>(null);

	async function telechargerModele() {
		telechargement = true;
		erreurModele = '';
		try {
			const { blob, nomFichier } = await session.requeteAuthentifiee((token) =>
				elevesApi.telechargerModeleImport(token)
			);
			enregistrerFichier(blob, nomFichier ?? NOM_MODELE);
		} catch (e) {
			if (await redirigerSiSessionExpiree(e)) return;
			erreurModele = messageErreur(e);
		} finally {
			telechargement = false;
		}
	}

	function choisir(e: Event & { currentTarget: HTMLInputElement }) {
		const choisi = e.currentTarget.files?.[0] ?? null;
		refus = null;
		erreurFichier = '';
		fichier = null;
		if (!choisi) return;
		if (!choisi.name.toLowerCase().endsWith('.xlsx')) {
			erreurFichier = 'Format non pris en charge : choisissez un fichier Excel (.xlsx).';
			e.currentTarget.value = '';
			return;
		}
		if (choisi.size > TAILLE_MAX) {
			erreurFichier = 'Ce fichier dépasse 2 Mo.';
			e.currentTarget.value = '';
			return;
		}
		fichier = choisi;
	}

	function viderSelection() {
		fichier = null;
		champFichier.value = '';
	}

	async function importer() {
		if (!fichier || envoi) return;
		const aEnvoyer = fichier;
		envoi = true;
		refus = null;
		try {
			const { importes } = await session.requeteAuthentifiee((token) =>
				elevesApi.importer(token, aEnvoyer)
			);
			onimporte(importes);
			modal.fermer();
		} catch (e) {
			if (await redirigerSiSessionExpiree(e)) return;
			const message =
				e instanceof ApiError && e.status === 413 ? 'Ce fichier dépasse 2 Mo.' : messageErreur(e);
			refus = { message, lignes: erreursParLigne(e) ?? [] };
			// Tout ou rien : le fichier est à corriger puis à re-sélectionner. Le vider évite aussi
			// de renvoyer une version périmée (le navigateur refuse un fichier modifié sur disque).
			if (e instanceof ApiError && e.status !== 0) viderSelection();
		} finally {
			envoi = false;
		}
	}
</script>

<Modal bind:this={modal} labelledby="import-titre" verrouille={envoi} onfermer={onferme}>
	<h2 id="import-titre">Importer des élèves</h2>
	<p>
		Ajoutez plusieurs élèves d'un coup à partir d'un fichier Excel (.xlsx). Si une ligne est
		invalide, aucun élève n'est ajouté.
	</p>

	<ol class="steps">
		<li>
			Téléchargez le modèle et remplissez une ligne par élève.
			<div class="file">
				<button
					type="button"
					class="btn ghost sm"
					disabled={telechargement}
					aria-busy={telechargement}
					onclick={telechargerModele}
				>
					{telechargement ? 'Téléchargement…' : 'Télécharger le modèle'}
				</button>
			</div>
			{#if erreurModele}
				<p class="err" role="alert">{erreurModele}</p>
			{/if}
			<p class="hint">
				Colonnes : matricule, matricule EducMaster, nom, prénoms, sexe, date de naissance, lieu de
				naissance, parent ou tuteur, téléphone, adresse, classe, date d'inscription. Les colonnes
				marquées d'un astérisque dans le modèle sont obligatoires ; matricule, matricule EducMaster,
				adresse, classe et date d'inscription sont facultatifs.
			</p>
		</li>
		<li>
			Choisissez votre fichier rempli (500 élèves et 2 Mo maximum).
			<div class="file">
				<label class="btn ghost sm" for="import-fichier">
					<Icon name="upload" />Choisir un fichier
				</label>
				<input
					class="sr-only"
					type="file"
					id="import-fichier"
					accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
					bind:this={champFichier}
					onchange={choisir}
					disabled={envoi}
					aria-describedby={erreurFichier ? 'import-erreur-fichier' : 'import-nom'}
				/>
				<span class="hint" id="import-nom">{fichier ? fichier.name : 'Aucun fichier choisi'}</span>
			</div>
			{#if erreurFichier}
				<p class="err" id="import-erreur-fichier" role="alert">{erreurFichier}</p>
			{/if}
		</li>
	</ol>

	{#if refus}
		<div class="res" role="alert">
			<strong>{refus.message}</strong>
			{#if refus.lignes.length > 0}
				<ul class="lignes">
					{#each refus.lignes as l (l.ligne)}
						<li>Ligne {l.ligne} : {l.messages.join(' ')}</li>
					{/each}
				</ul>
				<p class="hint">Corrigez le fichier puis choisissez-le à nouveau.</p>
			{/if}
		</div>
	{/if}

	<div class="dlg-acts">
		<button type="button" class="btn ghost" disabled={envoi} onclick={() => modal.fermer()}>
			Fermer
		</button>
		<button
			type="button"
			class="btn"
			disabled={!fichier || envoi}
			aria-busy={envoi}
			onclick={importer}
		>
			{envoi ? 'Importation…' : 'Importer'}
		</button>
	</div>
</Modal>

<style>
	/* Jusqu'à 500 lignes possibles : la liste défile au lieu d'allonger la boîte de dialogue. */
	.lignes {
		max-height: 220px;
		overflow-y: auto;
	}
</style>
