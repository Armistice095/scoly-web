<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import SkeletonLignes from '$lib/components/skeleton/SkeletonLignes.svelte';
	import type { DocumentEleve, Eleve } from '$lib/types';
	import {
		LIBELLE_SEXE,
		LIBELLE_STATUT,
		formaterDateHeure,
		formaterDateNaissance,
		formaterTelephone,
		nomComplet
	} from '$lib/utils/eleves';

	interface Props {
		eleve: Eleve;
		documents: DocumentEleve[];
		etatDocuments: 'chargement' | 'ok' | 'erreur';
		erreurDocuments: string;
		onreessayer: () => void;
		/** Re-télécharge un document déjà établi (lien signé demandé à chaque clic). */
		ontelecharger: (doc: DocumentEleve) => void;
		/** Document dont le lien est en cours de demande (bouton désactivé). */
		documentEnCours: string | null;
	}

	let {
		eleve,
		documents,
		etatDocuments,
		erreurDocuments,
		onreessayer,
		ontelecharger,
		documentEnCours
	}: Props = $props();

	const vide = 'Non renseigné';
</script>

<h3>{nomComplet(eleve)}</h3>
<dl class="dl">
	<dt>Matricule</dt>
	<dd>{eleve.matricule ?? vide}</dd>
	<dt>Matricule EducMaster</dt>
	<dd>{eleve.matriculeEducMaster ?? vide}</dd>
	<dt>Statut</dt>
	<dd><span class="badge b-ok">{LIBELLE_STATUT[eleve.statut]}</span></dd>
</dl>

<h3>Identité</h3>
<dl class="dl">
	<dt>Sexe</dt>
	<dd>{LIBELLE_SEXE[eleve.sexe]}</dd>
	<dt>Date de naissance</dt>
	<dd>{formaterDateNaissance(eleve.dateNaissance)}</dd>
	<dt>Lieu de naissance</dt>
	<dd>{eleve.lieuNaissance}</dd>
</dl>

<h3>Scolarité</h3>
<dl class="dl">
	<dt>Classe</dt>
	<dd>{eleve.classe ?? vide}</dd>
	<dt>Date d'inscription</dt>
	<dd>{eleve.dateInscription ? formaterDateNaissance(eleve.dateInscription) : vide}</dd>
</dl>

<h3>Famille</h3>
<dl class="dl">
	<dt>Parent ou tuteur</dt>
	<dd>{eleve.parentTuteur}</dd>
	<dt>Téléphone</dt>
	<dd>{formaterTelephone(eleve.telephone)}</dd>
	<dt>Adresse</dt>
	<dd>{eleve.adresse ?? vide}</dd>
</dl>

<h3>Documents établis</h3>
<div aria-live="polite" aria-busy={etatDocuments === 'chargement'}>
	{#if etatDocuments === 'chargement'}
		<SkeletonLignes lignes={2} libelle="Chargement des documents…" />
	{:else if etatDocuments === 'erreur'}
		<p class="banner" role="alert">{erreurDocuments}</p>
		<button type="button" class="btn ghost sm" onclick={onreessayer}>Réessayer</button>
	{:else if documents.length === 0}
		<p class="hint">Aucun document établi pour cet élève.</p>
	{:else}
		<ul class="dl-docs">
			{#each documents as doc (doc.id)}
				<li>
					<span>{doc.typeDocument.nom}</span>
					<span class="droite">
						<span class="hint">{formaterDateHeure(doc.createdAt)}</span>
						<button
							type="button"
							class="btn ghost sm"
							disabled={documentEnCours === doc.id}
							aria-busy={documentEnCours === doc.id}
							aria-label={`Télécharger ${doc.typeDocument.nom} ${doc.numeroUnique}`}
							onclick={() => ontelecharger(doc)}
						>
							{#if documentEnCours !== doc.id}<Icon name="download" />{/if}{documentEnCours ===
							doc.id
								? 'Préparation…'
								: 'Télécharger'}
						</button>
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.droite {
		display: inline-flex;
		align-items: center;
		gap: 12px;
	}
</style>
