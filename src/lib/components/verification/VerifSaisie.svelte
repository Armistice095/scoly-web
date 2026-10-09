<script lang="ts">
	import { tick } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import VerifTop from './VerifTop.svelte';
	import { formaterDelai } from '$lib/utils/verification';

	interface Props {
		reference: string;
		/** Appel en cours : bouton désactivé + indicateur de chargement. */
		enCours: boolean;
		/** Erreur rattachée au champ (CHAMP_VIDE, FORMAT_INVALIDE, ou contrôle local). */
		erreur: string | null;
		/** Message 429 et délai restant : le bouton reste désactivé jusqu'à zéro. */
		message429: string | null;
		restant: number;
		onsoumettre: () => void;
		/** L'utilisateur modifie le champ : l'erreur affichée n'a plus lieu d'être. */
		onmodif: () => void;
	}

	let {
		reference = $bindable(),
		enCours,
		erreur,
		message429,
		restant,
		onsoumettre,
		onmodif
	}: Props = $props();

	let champ: HTMLInputElement;
	let secoue = $state(false);

	export function focaliser() {
		champ?.focus();
	}

	// Chaque nouvelle erreur fait « secouer » le champ (désactivé sous mouvement réduit, voir le CSS).
	$effect(() => {
		if (!erreur) return;
		secoue = false;
		void tick().then(() => (secoue = true));
	});

	const bloque = $derived(enCours || restant > 0);
</script>

<section class="v-carte v-in">
	<VerifTop icone="search" titre="Vérification d’un document">
		<p>Saisissez la référence figurant sur le document afin de vérifier l’authenticité.</p>
	</VerifTop>

	<form
		class="v-form"
		novalidate
		onsubmit={(e) => {
			e.preventDefault();
			onsoumettre();
		}}
	>
		<label for="v-reference">Référence du document</label>
		<!-- Pas d'attribut `name` ni d'autocomplétion : la référence identifie un élève, le navigateur ne la retient pas. -->
		<input
			id="v-reference"
			class={['v-fld', secoue && 'v-secoue']}
			type="text"
			autocomplete="off"
			autocapitalize="characters"
			spellcheck="false"
			maxlength="120"
			placeholder="Ex. N°0042/2025-2026/CEG-GODOMEY"
			bind:this={champ}
			bind:value={reference}
			oninput={onmodif}
			onanimationend={() => (secoue = false)}
			disabled={enCours}
			aria-invalid={erreur ? 'true' : undefined}
			aria-describedby={erreur ? 'v-reference-err v-reference-aide' : 'v-reference-aide'}
		/>
		<p class="v-msg-err" id="v-reference-err" role={erreur ? 'alert' : undefined}>{erreur ?? ''}</p>
		<p class="v-aide-champ" id="v-reference-aide">La référence est indiquée en haut du document.</p>

		{#if message429 && restant > 0}
			<p class="banner" role="alert">
				{message429} <span aria-hidden="true">({formaterDelai(restant)})</span>
			</p>
		{/if}

		<button type="submit" class="btn" disabled={bloque} aria-busy={enCours}>
			{#if restant > 0 && !enCours}Vérifier dans {formaterDelai(restant)}{:else}Vérifier{/if}
		</button>
	</form>

	<div class="v-qr">
		<Icon name="qr" />
		<p>Vous pouvez également scanner le code QR figurant sur le document.</p>
	</div>
</section>
