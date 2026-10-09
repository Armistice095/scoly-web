<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import ProfilFormulaire from '$lib/components/compte/ProfilFormulaire.svelte';
	import { session } from '$lib/stores/session.svelte';

	const utilisateur = $derived(session.utilisateur);
	const etablissement = $derived(session.etablissement);
	const libelleRole = $derived(utilisateur?.role === 'DIRECTEUR' ? 'Directeur' : 'Membre');
</script>

<Seo titre="Mon profil" noindex />

<h1>Mon profil</h1>

<section class="panel" aria-labelledby="profil-compte">
	<h2 id="profil-compte">Compte</h2>
	<dl class="dl">
		<dt>Fonction</dt>
		<dd>{utilisateur?.fonction || 'Non renseignée'}</dd>
		<dt>Rôle</dt>
		<dd>{libelleRole}</dd>
		<dt>Établissement</dt>
		<dd>{etablissement?.nom ?? 'Non renseigné'}</dd>
	</dl>
</section>

<section class="panel">
	<ProfilFormulaire />
</section>
