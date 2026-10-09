<script lang="ts">
	import { evaluerMotDePasse } from '$lib/utils/validation';

	interface Props {
		value: string;
	}

	let { value }: Props = $props();
	let regles = $derived(evaluerMotDePasse(value));
</script>

<ul class="rules">
	<li class:met={regles.longueur}>
		8 caractères minimum <b>{regles.longueur ? 'Respectée' : 'À respecter'}</b>
	</li>
	<li class:met={regles.majuscule}>
		Une majuscule <b>{regles.majuscule ? 'Respectée' : 'À respecter'}</b>
	</li>
	<li class:met={regles.chiffre}>
		Un chiffre <b>{regles.chiffre ? 'Respectée' : 'À respecter'}</b>
	</li>
</ul>
