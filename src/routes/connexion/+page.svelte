<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import Logo from '$lib/components/Logo.svelte';
	import { monter } from '$lib/motion';
	import CodeVerification from '$lib/components/CodeVerification.svelte';
	import PasswordField from '$lib/components/PasswordField.svelte';
	import PasswordRules from '$lib/components/PasswordRules.svelte';
	import { authApi } from '$lib/api/auth';
	import { ApiError } from '$lib/api/client';
	import { session } from '$lib/stores/session.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { motDePasseValide } from '$lib/utils/validation';
	import { CODE_COMPTE_NON_ACTIVE } from '$lib/types';

	type Vue = 'connexion' | 'oubli' | 'verification' | 'nouveau-mdp';

	let vue: Vue = $state('connexion');
	let chargementInitial = $state(true);

	// --- Connexion ---
	let email = $state('');
	let motDePasse = $state('');
	let resterConnecte = $state(false);
	let erreurConnexion = $state<string | null>(null);
	let enCours = $state(false);

	// --- Mot de passe oublié ---
	let emailOubli = $state('');
	let erreurOubli = $state<string | null>(null);
	let enCoursOubli = $state(false);

	// --- Vérification par code (activation OU réinitialisation) ---
	let contexteVerification: 'activation' | 'reinitialisation' = $state('activation');
	let emailVerification = $state('');
	let resetToken: string | null = null;

	// --- Nouveau mot de passe ---
	let nouveauMdp = $state('');
	let confirmationMdp = $state('');
	let erreurNouveauMdp = $state<string | null>(null);
	let enCoursNouveauMdp = $state(false);
	let reinitialisationReussie = $state(false);

	onMount(async () => {
		// Si une session valide existe déjà (refresh token en mémoire), on n'affiche
		// pas l'écran de connexion.
		if (session.estConnecte || (await session.tenterRestauration())) {
			await goto(resolve('/documents'));
			return;
		}
		chargementInitial = false;
	});

	async function activerSessionEtRediriger(codeSaisi: string) {
		const reponse = await authApi.verifierActivation(emailVerification, codeSaisi);
		session.definir(reponse);
		await goto(resolve('/documents'));
	}

	async function seConnecter(event: SubmitEvent) {
		event.preventDefault();
		erreurConnexion = null;
		enCours = true;
		try {
			const reponse = await authApi.connexion({ email, motDePasse, resterConnecte });
			session.definir(reponse);
			await goto(resolve('/documents'));
		} catch (err) {
			if (err instanceof ApiError && err.code === CODE_COMPTE_NON_ACTIVE) {
				// Le compte existe mais n'est pas activé : on relance un code
				// (l'utilisateur n'en a probablement pas sous la main) puis on
				// bascule sur l'écran de vérification.
				emailVerification = email;
				contexteVerification = 'activation';
				try {
					await authApi.renvoyerActivation(email);
					toast.afficher(`Un code de vérification a été envoyé à ${email}.`);
				} catch {
					// Ex. 429 si un code vient déjà d'être envoyé récemment : celui-ci
					// reste valable, on n'interrompt pas le parcours pour autant.
					toast.afficher('Un code vous a déjà été envoyé récemment.');
				}
				vue = 'verification';
			} else if (err instanceof ApiError) {
				erreurConnexion = err.message;
			} else {
				erreurConnexion = 'Une erreur est survenue. Réessayez.';
			}
		} finally {
			enCours = false;
		}
	}

	async function envoyerCodeOubli(event: SubmitEvent) {
		event.preventDefault();
		erreurOubli = null;
		enCoursOubli = true;
		try {
			const { message } = await authApi.motDePasseOublie(emailOubli);
			toast.afficher(message);
			emailVerification = emailOubli;
			contexteVerification = 'reinitialisation';
			vue = 'verification';
		} catch (err) {
			erreurOubli = err instanceof ApiError ? err.message : 'Une erreur est survenue. Réessayez.';
		} finally {
			enCoursOubli = false;
		}
	}

	async function verifierCode(code: string) {
		if (contexteVerification === 'activation') {
			await activerSessionEtRediriger(code);
		} else {
			const { resetToken: token } = await authApi.verifierCodeReinitialisation(
				emailVerification,
				code
			);
			resetToken = token;
			vue = 'nouveau-mdp';
		}
	}

	async function renvoyerCode() {
		if (contexteVerification === 'activation') {
			await authApi.renvoyerActivation(emailVerification);
		} else {
			await authApi.motDePasseOublie(emailVerification);
		}
	}

	async function mettreAJourMotDePasse(event: SubmitEvent) {
		event.preventDefault();
		erreurNouveauMdp = null;

		if (!motDePasseValide(nouveauMdp)) {
			erreurNouveauMdp = 'Le mot de passe ne respecte pas les règles ci-dessus.';
			return;
		}
		if (nouveauMdp !== confirmationMdp) {
			erreurNouveauMdp = 'Les mots de passe ne correspondent pas.';
			return;
		}
		if (!resetToken) {
			// Ne devrait pas arriver (on n'atteint cette vue qu'après §6) : on
			// renvoie par sécurité à "mot de passe oublié".
			vue = 'oubli';
			return;
		}

		enCoursNouveauMdp = true;
		try {
			await authApi.reinitialiserMotDePasse(resetToken, nouveauMdp, confirmationMdp);
			reinitialisationReussie = true;
		} catch (err) {
			if (err instanceof ApiError && err.status === 400 && !err.message.includes('correspond')) {
				// Message générique si le resetToken a expiré (§7) : on renvoie à
				// l'étape "mot de passe oublié" pour repartir d'un e-mail.
				toast.afficher(err.message);
				vue = 'oubli';
			} else {
				erreurNouveauMdp =
					err instanceof ApiError ? err.message : 'Une erreur est survenue. Réessayez.';
			}
		} finally {
			enCoursNouveauMdp = false;
		}
	}

	function retourConnexionDepuisReinit() {
		vue = 'connexion';
		reinitialisationReussie = false;
		nouveauMdp = '';
		confirmationMdp = '';
		resetToken = null;
	}
</script>

<Seo
	titre="Connexion"
	description="Connectez-vous à Scoly pour établir, archiver et vérifier les documents administratifs de votre établissement scolaire."
/>

{#if !chargementInitial}
	<div class="page-connexion">
		<Logo height={62} />

		<main class="card">
			{#if vue === 'connexion'}
				<section in:monter={{ y: 8 }}>
					<h1 class="auth-title" tabindex="-1">Connexion</h1>
					<p class="auth-lead">Accédez à l'espace de votre établissement.</p>
					{#if erreurConnexion}
						<p class="banner" role="alert">{erreurConnexion}</p>
					{/if}
					<form onsubmit={seConnecter} novalidate>
						<div class="field">
							<label for="em">E-mail</label>
							<input
								id="em"
								type="email"
								autocomplete="username"
								inputmode="email"
								bind:value={email}
								required
							/>
						</div>
						<PasswordField
							id="pw"
							label="Mot de passe"
							bind:value={motDePasse}
							autocomplete="current-password"
						/>
						<div class="row">
							<label class="chk"
								><input type="checkbox" bind:checked={resterConnecte} /> Rester connecté</label
							>
							<button type="button" class="lnk" onclick={() => (vue = 'oubli')}>
								Mot de passe oublié ?
							</button>
						</div>
						<button class="btn" type="submit" disabled={enCours} aria-busy={enCours}>
							{enCours ? 'Connexion…' : 'Se connecter'}
						</button>
					</form>
					<p class="note">
						Votre établissement n'a pas encore de compte ?
						<a class="lnk-a" href={resolve('/creer-un-compte')}>Créer un compte</a><br />
						Vous avez été invité ? Utilisez le lien reçu par e-mail.
					</p>
				</section>
			{:else if vue === 'oubli'}
				<section in:monter={{ y: 8 }}>
					<h1 class="auth-title" tabindex="-1">Mot de passe oublié</h1>
					<p class="auth-lead">
						Entrez l'adresse e-mail de votre compte. Nous vous enverrons un code de vérification à 6
						chiffres.
					</p>
					{#if erreurOubli}
						<p class="banner" role="alert">{erreurOubli}</p>
					{/if}
					<form onsubmit={envoyerCodeOubli} novalidate>
						<div class="field">
							<label for="fe">E-mail</label>
							<input
								id="fe"
								type="email"
								autocomplete="email"
								inputmode="email"
								bind:value={emailOubli}
								required
							/>
						</div>
						<button class="btn" type="submit" disabled={enCoursOubli} aria-busy={enCoursOubli}>
							{enCoursOubli ? 'Envoi…' : 'Envoyer le code'}
						</button>
					</form>
					<button type="button" class="lnk back" onclick={() => (vue = 'connexion')}>
						Retour à la connexion
					</button>
				</section>
			{:else if vue === 'verification'}
				<section in:monter={{ y: 8 }}>
					<h1 class="auth-title" tabindex="-1">Vérification</h1>
					{#key `${contexteVerification}-${emailVerification}`}
						<CodeVerification
							onVerify={verifierCode}
							onResend={renvoyerCode}
							onRetour={() => (vue = contexteVerification === 'activation' ? 'connexion' : 'oubli')}
							texteRetour={contexteVerification === 'activation'
								? 'Retour à la connexion'
								: 'Retour'}
						>
							Entrez le code à 6 chiffres envoyé à <b>{emailVerification}</b>.
						</CodeVerification>
					{/key}
				</section>
			{:else if vue === 'nouveau-mdp'}
				<section in:monter={{ y: 8 }}>
					{#if reinitialisationReussie}
						<h1 class="auth-title" tabindex="-1">Mot de passe mis à jour</h1>
						<p class="ok">Votre mot de passe a bien été mis à jour.</p>
						<button class="btn" type="button" onclick={retourConnexionDepuisReinit}>
							Aller à la connexion
						</button>
					{:else}
						<h1 class="auth-title" tabindex="-1">Nouveau mot de passe</h1>
						<p class="auth-lead">Choisissez un nouveau mot de passe pour votre compte.</p>
						{#if erreurNouveauMdp}
							<p class="banner" role="alert">{erreurNouveauMdp}</p>
						{/if}
						<form onsubmit={mettreAJourMotDePasse} novalidate>
							<PasswordField id="np" label="Nouveau mot de passe" bind:value={nouveauMdp} />
							<PasswordRules value={nouveauMdp} />
							<PasswordField
								id="npc"
								label="Confirmer le mot de passe"
								bind:value={confirmationMdp}
							/>
							<button
								class="btn"
								type="submit"
								disabled={enCoursNouveauMdp}
								aria-busy={enCoursNouveauMdp}
							>
								{enCoursNouveauMdp ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
							</button>
						</form>
					{/if}
				</section>
			{/if}
		</main>
	</div>
{/if}

<style>
	.page-connexion {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--s5);
		padding: var(--s5) var(--s4);
		padding-top: calc(var(--s5) + env(safe-area-inset-top, 0px));
		padding-bottom: calc(var(--s5) + env(safe-area-inset-bottom, 0px));
	}

	/* Sur les pages d'authentification, le bouton principal prend toute la
	   largeur de la carte (contrairement au bouton compact des pages de
	   l'appli, qui s'ajuste à son contenu). */
	.card .btn {
		width: 100%;
		height: 46px;
	}
</style>
