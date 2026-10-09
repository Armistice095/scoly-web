<script lang="ts">
	import type { EtablissementPublic } from '$lib/api/verification';
	import { numeroPourLien } from '$lib/utils/verification';

	interface Props {
		titre: string;
		intro: string;
		/** `null` quand l'API ne connaît pas l'école (INTROUVABLE, AMBIGU) : texte générique seul. */
		etablissement?: EtablissementPublic | null;
	}

	let { titre, intro, etablissement = null }: Props = $props();
</script>

<!-- Seuls liens de la page : `tel:` et `mailto:` (aucun Referer envoyé, donc pas de fuite du jeton). -->
<section class="v-aide" aria-labelledby="v-aide-titre">
	<h2 id="v-aide-titre">{titre}</h2>
	<p>{intro}</p>
	{#if etablissement}
		<ul>
			<li>{etablissement.nom}, {etablissement.localite}</li>
			{#if etablissement.telephone}
				<li>
					<a href={`tel:${numeroPourLien(etablissement.telephone)}`}>{etablissement.telephone}</a>
				</li>
			{/if}
			{#if etablissement.email}
				<li><a href={`mailto:${etablissement.email}`}>{etablissement.email}</a></li>
			{/if}
		</ul>
	{/if}
</section>
