<script lang="ts">
	import { page } from '$app/state';
	import { DESCRIPTION_PAR_DEFAUT, IMAGE_PARTAGE, NOM_SITE, URL_SITE } from '$lib/constants/seo';

	interface Props {
		/** Titre de la page, sans le nom du site : « Documents » devient « Documents · Scoly ». */
		titre: string;
		description?: string;
		/** Pages privées ou sans intérêt pour un moteur de recherche. */
		noindex?: boolean;
	}

	let { titre, description = DESCRIPTION_PAR_DEFAUT, noindex = false }: Props = $props();

	const titreComplet = $derived(`${titre} · ${NOM_SITE}`);
	// URL canonique : toujours le domaine de production (même depuis *.workers.dev ou en local),
	// sans paramètres (?ouvrir=…, ?q=…) ni fragment.
	const canonique = $derived(`${URL_SITE}${page.url.pathname}`);
	const image = `${URL_SITE}${IMAGE_PARTAGE}`;
</script>

<svelte:head>
	<title>{titreComplet}</title>
	<meta name="description" content={description} />
	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{:else}
		<link rel="canonical" href={canonique} />
	{/if}

	<meta property="og:site_name" content={NOM_SITE} />
	<meta property="og:locale" content="fr_FR" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={titreComplet} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonique} />
	<meta property="og:image" content={image} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Logo Scoly" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={titreComplet} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
</svelte:head>
