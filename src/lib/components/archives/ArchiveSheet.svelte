<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { ApiError } from '$lib/api/client';
	import { archivesApi } from '$lib/api/archives';
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Skeleton from '$lib/components/skeleton/Skeleton.svelte';
	import { session } from '$lib/stores/session.svelte';
	import type { ArchiveFiche, ArchiveListe } from '$lib/types';
	import {
		LIBELLE_EVENEMENT,
		MAX_TELECHARGEMENTS_LISTES,
		formaterDate,
		formaterHeure,
		libellePersonne
	} from '$lib/utils/archives';
	import { messageErreur } from '$lib/utils/erreurs-api';
	import { redirigerSiSessionExpiree } from '$lib/utils/session-expiree';
	import StatutBadge from './StatutBadge.svelte';

	interface Props {
		/** Ligne de la liste : s'affiche tout de suite, le détail arrive ensuite. */
		ligne: ArchiveListe;
		/** Document dont le lien de téléchargement est en cours de demande. */
		telechargementId: string | null;
		onferme: () => void;
		ontelecharger: () => void;
		onapercu: (motifAnnulation: string | null) => void;
		onannuler: () => void;
		/** « Voir la fiche élève » : la page ferme ce panneau et ouvre l'écran Élèves. */
		onvoireleve: (matricule: string | null) => void;
		/** Le document n'existe plus (404) : la page recharge sa liste. */
		onactualiser: () => void;
	}

	let {
		ligne,
		telechargementId,
		onferme,
		ontelecharger,
		onapercu,
		onannuler,
		onvoireleve,
		onactualiser
	}: Props = $props();

	let modal: ReturnType<typeof Modal>;
	let titre: HTMLHeadingElement;

	let detail = $state<ArchiveFiche | null>(null);
	let etat = $state<'chargement' | 'ok' | 'erreur'>('chargement');
	let erreur = $state('');
	let controleur: AbortController | null = null;

	const vide = 'Non renseigné';

	const statut = $derived(detail?.statut ?? ligne.statut);
	const annule = $derived(statut === 'ANNULE');
	const telechargeable = $derived(detail?.telechargeable ?? ligne.telechargeable);
	const motif = $derived(detail?.annulation?.motif ?? ligne.annulation?.motif ?? null);
	const envoi = $derived(telechargementId === ligne.id);
	const troncature = $derived(
		detail !== null && detail.nombreTelechargements > MAX_TELECHARGEMENTS_LISTES
	);

	/**
	 * Charge (ou recharge) le détail. `silencieux` : on garde l'affichage actuel pendant
	 * la mise à jour (après un téléchargement, pour y voir apparaître la nouvelle ligne).
	 */
	async function charger(silencieux = false) {
		controleur?.abort();
		controleur = new AbortController();
		const signal = controleur.signal;
		if (!silencieux || !detail) etat = 'chargement';
		try {
			const fiche = await session.requeteAuthentifiee((token) =>
				archivesApi.consulter(token, ligne.id, signal)
			);
			if (signal.aborted) return;
			detail = fiche;
			etat = 'ok';
		} catch (e) {
			if (signal.aborted) return;
			if (await redirigerSiSessionExpiree(e)) return;
			if (silencieux && detail) return; // l'affichage précédent reste valable
			if (e instanceof ApiError && e.status === 404) {
				erreur = 'Ce document est introuvable. La liste va être actualisée.';
				onactualiser();
			} else {
				erreur = messageErreur(e);
			}
			etat = 'erreur';
		}
	}

	/** Recharge le détail sans clignotement (ex. après un téléchargement : l'historique change). */
	export function actualiser() {
		return charger(true);
	}

	/**
	 * La fiche à jour est déjà connue (réponse de l'annulation) : on l'applique et on abandonne
	 * toute requête en vol, qui renverrait l'état d'avant.
	 */
	export function appliquerFiche(fiche: ArchiveFiche) {
		controleur?.abort();
		detail = fiche;
		etat = 'ok';
	}

	/** Si le focus s'est perdu (le bouton qui l'avait a disparu), on le rend au titre du panneau. */
	export async function reprendreFocusSiPerdu() {
		await tick();
		const actif = document.activeElement;
		if (!actif || actif === document.body) titre?.focus();
	}

	export function fermer() {
		modal.fermer();
	}

	onMount(() => {
		titre.focus();
		void charger();
	});
	onDestroy(() => controleur?.abort());
</script>

<Modal bind:this={modal} variante="panneau" labelledby="fiche-titre" onfermer={onferme}>
	<div class="wrap">
		<div class="sh">
			<h2 id="fiche-titre" tabindex="-1" bind:this={titre}>Fiche du document</h2>
			<button type="button" class="kebab" aria-label="Fermer" onclick={() => modal.fermer()}>
				<Icon name="close" />
			</button>
		</div>

		<div class="sb" aria-busy={etat === 'chargement'}>
			<h3>Document</h3>
			<dl class="dl">
				<dt>Référence</dt>
				<dd>{ligne.reference}</dd>
				<dt>Type</dt>
				<dd>{ligne.typeDocument.nom}</dd>
				<dt>Statut</dt>
				<dd><StatutBadge {statut} /></dd>
			</dl>

			{#if etat === 'erreur'}
				<p class="banner" role="alert">{erreur}</p>
				<button type="button" class="btn ghost sm" onclick={() => void charger()}>
					Réessayer
				</button>
			{/if}

			<h3>Élève concerné</h3>
			<dl class="dl">
				<dt>Nom</dt>
				<dd>{detail?.eleve.nomComplet ?? ligne.eleve.nomComplet}</dd>
				<dt>Matricule</dt>
				<dd>
					{#if detail}{detail.eleve.matricule ?? vide}{:else if etat === 'chargement'}
						{@render attente('45%')}{:else}—{/if}
				</dd>
				<dt>Matricule EducMaster</dt>
				<dd>
					{#if detail}{detail.eleve.matriculeEducMaster ?? vide}{:else if etat === 'chargement'}
						{@render attente('60%')}{:else}—{/if}
				</dd>
			</dl>
			<button
				type="button"
				class="btn ghost sm"
				onclick={() => onvoireleve(detail?.eleve.matricule ?? null)}
			>
				Voir la fiche élève
			</button>

			<h3>Établissement du document</h3>
			<dl class="dl">
				<dt>Établi par</dt>
				<dd>
					{#if detail}{libellePersonne(detail.etabli.par)}{:else if etat === 'chargement'}
						{@render attente('70%')}{:else}—{/if}
				</dd>
				<dt>Date</dt>
				<dd>{formaterDate(ligne.createdAt)}</dd>
				<dt>Heure</dt>
				<dd>{formaterHeure(ligne.createdAt)}</dd>
			</dl>

			<h3>Historique</h3>
			{#if detail}
				<ul class="dl-docs">
					{#each detail.historique as evenement (`${evenement.type}-${evenement.le}`)}
						<li>
							<span>{LIBELLE_EVENEMENT[evenement.type]} par {libellePersonne(evenement.par)}</span>
							<span class="hint">{formaterDate(evenement.le)} · {formaterHeure(evenement.le)}</span>
						</li>
					{/each}
				</ul>
				{#if troncature}
					<p class="hint note">
						Les {MAX_TELECHARGEMENTS_LISTES} téléchargements les plus récents sont listés ({detail.nombreTelechargements}
						au total).
					</p>
				{/if}
			{:else if etat === 'chargement'}
				<div class="attente-liste" role="status">
					<span class="sr-only">Chargement de l’historique…</span>
					{@render attente('85%')}
					{@render attente('70%')}
				</div>
			{/if}

			{#if detail?.annulation}
				<h3>Annulation</h3>
				<dl class="dl">
					<dt>Annulé par</dt>
					<dd>{libellePersonne(detail.annulation.par)}</dd>
					<dt>Date</dt>
					<dd>{formaterDate(detail.annulation.le)}</dd>
					<dt>Heure</dt>
					<dd>{formaterHeure(detail.annulation.le)}</dd>
					<dt>Motif</dt>
					<dd>{detail.annulation.motif}</dd>
				</dl>
			{/if}
		</div>

		<div class="sf">
			{#if !annule}
				<button type="button" class="btn danger left" onclick={onannuler}
					>Annuler le document</button
				>
			{/if}
			<button type="button" class="btn ghost" onclick={() => onapercu(motif)}>Voir l’aperçu</button>
			<button
				type="button"
				class="btn"
				disabled={!telechargeable || envoi}
				aria-busy={envoi}
				aria-describedby={!telechargeable ? 'fiche-hint-annule' : undefined}
				title={!telechargeable ? 'Un document annulé ne peut pas être téléchargé' : undefined}
				onclick={ontelecharger}
			>
				{envoi ? 'Téléchargement…' : 'Télécharger'}
			</button>
			{#if !telechargeable}
				<span class="sr-only" id="fiche-hint-annule">
					Un document annulé ne peut pas être téléchargé.
				</span>
			{/if}
		</div>
	</div>
</Modal>

{#snippet attente(largeur: string)}
	<Skeleton {largeur} hauteur="14px" />
{/snippet}

<style>
	.attente-liste {
		display: grid;
		gap: var(--s3);
		padding: 10px 0;
	}
	.note {
		margin-top: var(--s3);
	}
	h2:focus {
		outline: none;
	}
</style>
