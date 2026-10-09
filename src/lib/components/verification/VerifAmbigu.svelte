<script lang="ts">
	import { tick } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import VerifAide from './VerifAide.svelte';
	import VerifTop from './VerifTop.svelte';
	import {
		PRECISIONS_MAX,
		TITRE_AMBIGU,
		TITRE_AMBIGU_FINAL,
		formaterDelai
	} from '$lib/utils/verification';

	interface Props {
		etablissement: string;
		/** Nombre de précisions déjà tentées qui n'ont pas suffi (0 = première fois). */
		precisions: number;
		enCours: boolean;
		erreur: string | null;
		message429: string | null;
		restant: number;
		onsoumettre: () => void;
		onmodif: () => void;
	}

	let {
		etablissement = $bindable(),
		precisions,
		enCours,
		erreur,
		message429,
		restant,
		onsoumettre,
		onmodif
	}: Props = $props();

	let champ = $state<HTMLInputElement>();
	let secoue = $state(false);

	export function focaliser() {
		champ?.focus();
	}

	$effect(() => {
		if (!erreur) return;
		secoue = false;
		void tick().then(() => (secoue = true));
	});

	/** Après deux précisions infructueuses, plus de champ : seulement le QR ou le contact de l'établissement. */
	const final = $derived(precisions >= PRECISIONS_MAX);
	const bloque = $derived(enCours || restant > 0);
</script>

<section class="v-carte v-in">
	{#if final}
		<VerifTop icone="help" titre={TITRE_AMBIGU_FINAL}>
			<p>
				Nous ne pouvons pas identifier l’établissement avec ces informations. Scannez le code QR
				figurant sur le document, ou contactez l’établissement émetteur en indiquant la référence du
				document.
			</p>
		</VerifTop>
	{:else}
		<VerifTop icone="help" titre={TITRE_AMBIGU}>
			{#if precisions === 0}
				<p>
					Cette référence existe dans plusieurs établissements. Indiquez le nom de l’établissement
					émetteur, ou scannez le code QR figurant sur le document.
				</p>
			{:else}
				<p>
					Ce nom est trop général. Précisez-le (par exemple « CEG Godomey » plutôt que « CEG »), ou
					scannez le code QR figurant sur le document.
				</p>
			{/if}
		</VerifTop>

		<form
			class="v-form"
			novalidate
			onsubmit={(e) => {
				e.preventDefault();
				onsoumettre();
			}}
		>
			<label for="v-etablissement">Nom de l’établissement</label>
			<input
				id="v-etablissement"
				class={['v-fld', secoue && 'v-secoue']}
				type="text"
				autocomplete="off"
				spellcheck="false"
				maxlength="150"
				placeholder="Ex. CEG Godomey"
				bind:this={champ}
				bind:value={etablissement}
				oninput={onmodif}
				onanimationend={() => (secoue = false)}
				disabled={enCours}
				aria-invalid={erreur ? 'true' : undefined}
				aria-describedby={erreur
					? 'v-etablissement-err v-etablissement-aide'
					: 'v-etablissement-aide'}
			/>
			<p class="v-msg-err" id="v-etablissement-err" role={erreur ? 'alert' : undefined}>
				{erreur ?? ''}
			</p>
			<p class="v-aide-champ" id="v-etablissement-aide">
				Le nom de l’établissement figure sur le document. Un nom partiel suffit.
			</p>

			{#if message429 && restant > 0}
				<p class="banner" role="alert">
					{message429} <span aria-hidden="true">({formaterDelai(restant)})</span>
				</p>
			{/if}

			<button type="submit" class="btn" disabled={bloque} aria-busy={enCours}>
				{#if restant > 0 && !enCours}Vérifier dans {formaterDelai(restant)}{:else}Vérifier{/if}
			</button>
		</form>
	{/if}

	<div class="v-qr">
		<Icon name="qr" />
		<p>Le code QR figurant sur le document évite cette étape : il suffit de le scanner.</p>
	</div>
</section>

{#if final}
	<VerifAide
		titre="Que faire ?"
		intro="Contactez l’établissement émetteur en indiquant la référence du document."
	/>
{/if}
