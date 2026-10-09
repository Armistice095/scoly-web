<script lang="ts">
	import type { ReponseVerification } from '$lib/api/verification';
	import Icon from '$lib/components/Icon.svelte';
	import VerifAide from './VerifAide.svelte';
	import VerifTop from './VerifTop.svelte';
	import {
		TITRES_RESULTAT,
		formaterInstantServeur,
		formaterJourCivil
	} from '$lib/utils/verification';

	interface Props {
		/** Réponse VALIDE, ANNULE ou INTROUVABLE (l'AMBIGU a son propre écran). */
		reponse: ReponseVerification & { resultat: 'VALIDE' | 'ANNULE' | 'INTROUVABLE' };
	}

	let { reponse }: Props = $props();

	const resultat = $derived(reponse.resultat);
	const doc = $derived(reponse.document);
	const etab = $derived(reponse.etablissement);
	const dateAnnulation = $derived(formaterJourCivil(doc?.dateAnnulation));
	// Heure du SERVEUR, jamais celle du navigateur. Illisible : on n'affiche pas d'heure plutôt que d'en inventer une.
	const verifieLe = $derived(formaterInstantServeur(reponse.verifieLe));

	const VARIANTES = {
		VALIDE: { classe: 'v-ok', icone: 'shield' },
		ANNULE: { classe: 'v-err', icone: 'circlex' },
		INTROUVABLE: { classe: 'v-unk', icone: 'help' }
	} as const;
	const variante = $derived(VARIANTES[resultat]);
</script>

{#snippet ligne(libelle: string, valeur: string)}
	<dt>{libelle}</dt>
	<dd>{valeur}</dd>
{/snippet}

<section class={['v-carte', variante.classe]}>
	<VerifTop icone={variante.icone} titre={TITRES_RESULTAT[resultat]}>
		{#if resultat === 'VALIDE'}
			<p>
				Le présent document a été délivré par l’établissement mentionné ci-dessous. Il est
				authentique et demeure valable à la date de la présente vérification.
			</p>
		{:else if resultat === 'ANNULE'}
			<p>
				Le présent document a été annulé par l’établissement émetteur{dateAnnulation
					? ` le ${dateAnnulation}`
					: ''}. Il n’est plus valable.
			</p>
		{:else}
			<p>
				Aucun document ne correspond à cette référence. La référence est erronée, ou le code QR est
				endommagé.
			</p>
		{/if}
	</VerifTop>

	{#if doc}
		<div class="v-det">
			<h2>Document</h2>
			<dl class="v-dl">
				{@render ligne('Type de document', doc.typeDocument)}
				{@render ligne('Référence', doc.reference)}
				<!-- Déjà masqué par l'API (« Adjovi A. ») : affiché tel quel. -->
				{@render ligne('Élève', doc.eleve)}
				{@render ligne('Établi le', formaterJourCivil(doc.dateEmission) ?? doc.dateEmission)}
				<dt>Statut</dt>
				<dd>
					<!-- Le mot est écrit : la couleur n'est qu'un renfort. -->
					<span class={['badge', resultat === 'VALIDE' ? 'v-b-ok' : 'v-b-err']}>
						{resultat === 'VALIDE' ? 'Valide' : 'Annulé'}
					</span>
				</dd>
			</dl>
		</div>
	{/if}

	{#if etab}
		<div class="v-det">
			<h2>Établissement émetteur</h2>
			<dl class="v-dl">
				{@render ligne('Établissement', etab.nom)}
				{@render ligne('Localité', etab.localite)}
				{@render ligne('Pays', etab.pays)}
			</dl>
		</div>
	{/if}

	<div class="v-note">
		<Icon name="info" />
		<p>{verifieLe ? `Vérification effectuée le ${verifieLe}.` : 'Vérification effectuée.'}</p>
	</div>
</section>

{#if resultat === 'VALIDE'}
	<VerifAide
		titre="Un doute sur ce document ?"
		intro="Contacter l’établissement pour plus d’informations."
		etablissement={etab}
	/>
{:else}
	<VerifAide
		titre="Que faire ?"
		intro="Contactez l’établissement émetteur en indiquant la référence du document."
		etablissement={etab}
	/>
{/if}
