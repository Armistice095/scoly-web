<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ApiError } from '$lib/api/client';

	/**
	 * Bloc "code à 6 chiffres" partagé entre l'activation de compte
	 * (connexion → compte non activé, créer-un-compte → étape 2) et la
	 * réinitialisation de mot de passe (connexion → mot de passe oublié).
	 *
	 * Le composant gère l'UI (saisie, focus, collage, compte à rebours,
	 * verrouillage après plusieurs échecs) ; l'appel API et la suite du
	 * parcours restent du ressort du parent via `onVerify`/`onResend`.
	 *
	 * Le parent doit remonter une nouvelle instance (via `{#key ...}`)
	 * chaque fois qu'un nouveau code est censé avoir été envoyé — c'est ce
	 * qui réinitialise le minuteur, les tentatives et les champs, sans
	 * logique de reset dédiée ici.
	 */

	interface Props {
		/** Paragraphe d'intro ("Entrez le code envoyé à <b>…</b>…"). */
		children: Snippet;
		/** Doit lancer la vérification et lever une `ApiError` en cas d'échec. */
		onVerify: (code: string) => Promise<void>;
		/** Doit renvoyer un nouveau code et lever une `ApiError` en cas d'échec (ex. 429). */
		onResend: () => Promise<void>;
		onRetour: () => void;
		texteRetour?: string;
		attemptsMax?: number;
		resendSeconds?: number;
	}

	let {
		children,
		onVerify,
		onResend,
		onRetour,
		texteRetour = 'Retour',
		attemptsMax = 5,
		resendSeconds = 60
	}: Props = $props();

	let codes: string[] = $state(Array(6).fill(''));
	let inputs: (HTMLInputElement | null)[] = [];
	let enCours = $state(false);
	let erreur = $state<string | null>(null);
	let verrouille = $state(false);
	let tentativesRestantes = $state(attemptsMax);
	let secondesRestantes = $state(resendSeconds);
	let renvoiEnCours = $state(false);

	$effect(() => {
		const minuteur = setInterval(() => {
			if (secondesRestantes > 0) secondesRestantes -= 1;
		}, 1000);
		inputs[0]?.focus();
		return () => clearInterval(minuteur);
	});

	const code = () => codes.join('');
	const codeComplet = () => code().length === 6;

	function saisir(index: number, valeur: string) {
		const chiffre = valeur.replace(/\D/g, '').slice(-1);
		codes[index] = chiffre;
		if (chiffre && index < 5) inputs[index + 1]?.focus();
	}

	function toucheClavier(index: number, event: KeyboardEvent) {
		if (event.key === 'Backspace' && !codes[index] && index > 0) {
			inputs[index - 1]?.focus();
		}
	}

	function coller(event: ClipboardEvent) {
		const texte = event.clipboardData?.getData('text').replace(/\D/g, '') ?? '';
		if (!texte) return;
		event.preventDefault();
		const chiffres = texte.slice(0, 6).split('');
		codes = [...chiffres, ...Array(6 - chiffres.length).fill('')];
		inputs[Math.min(chiffres.length, 5)]?.focus();
	}

	async function verifier(event: SubmitEvent) {
		event.preventDefault();
		if (!codeComplet() || enCours || verrouille) return;

		erreur = null;
		enCours = true;
		try {
			await onVerify(code());
			// Succès : le parent change de vue, rien d'autre à faire ici.
		} catch (err) {
			const message = err instanceof ApiError ? err.message : 'Une erreur est survenue. Réessayez.';
			tentativesRestantes -= 1;
			if (tentativesRestantes <= 0) {
				verrouille = true;
				erreur = null;
			} else {
				erreur = `${message} Il te reste ${tentativesRestantes} tentative${tentativesRestantes > 1 ? 's' : ''}.`;
			}
			codes = Array(6).fill('');
			inputs[0]?.focus();
		} finally {
			enCours = false;
		}
	}

	async function renvoyer() {
		if (renvoiEnCours || secondesRestantes > 0) return;
		renvoiEnCours = true;
		try {
			await onResend();
			codes = Array(6).fill('');
			tentativesRestantes = attemptsMax;
			verrouille = false;
			erreur = null;
			secondesRestantes = resendSeconds;
			inputs[0]?.focus();
		} catch (err) {
			erreur = err instanceof ApiError ? err.message : 'Une erreur est survenue. Réessayez.';
		} finally {
			renvoiEnCours = false;
		}
	}
</script>

<p class="auth-lead">{@render children()}</p>

{#if erreur}
	<p class="banner" role="alert">{erreur}</p>
{/if}
{#if verrouille}
	<p class="banner" role="alert">Trop de tentatives. Demandez un nouveau code pour continuer.</p>
{/if}

<form onsubmit={verifier} novalidate>
	<div class="codebox" role="group" aria-label="Code de vérification à 6 chiffres">
		{#each codes as valeur, i (i)}
			<input
				bind:this={inputs[i]}
				class="cd"
				type="text"
				inputmode="numeric"
				autocomplete={i === 0 ? 'one-time-code' : 'off'}
				maxlength="1"
				aria-label={`Chiffre ${i + 1}`}
				aria-invalid={erreur ? 'true' : undefined}
				disabled={verrouille}
				value={valeur}
				oninput={(e) => saisir(i, e.currentTarget.value)}
				onkeydown={(e) => toucheClavier(i, e)}
				onpaste={coller}
			/>
		{/each}
	</div>

	<p class="resend">
		{#if secondesRestantes > 0}
			Renvoyer le code ({secondesRestantes} s)
		{:else}
			<button type="button" disabled={renvoiEnCours} onclick={renvoyer}>
				{renvoiEnCours ? 'Envoi…' : 'Renvoyer le code'}
			</button>
		{/if}
	</p>

	<button
		class="btn"
		type="submit"
		disabled={!codeComplet() || enCours || verrouille}
		aria-busy={enCours}
	>
		{enCours ? 'Vérification…' : 'Vérifier'}
	</button>
</form>
<button type="button" class="lnk back" onclick={onRetour}>{texteRetour}</button>
