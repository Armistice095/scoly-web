<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Logo from '$lib/components/Logo.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import PasswordField from '$lib/components/PasswordField.svelte';
	import PasswordRules from '$lib/components/PasswordRules.svelte';
	import { invitationApi } from '$lib/api/equipe';
	import { ApiError } from '$lib/api/client';
	import { session } from '$lib/stores/session.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { motDePasseValide } from '$lib/utils/validation';
	import type { InvitationInfo } from '$lib/types';

	const id = page.url.searchParams.get('id') ?? '';
	const jeton = page.url.searchParams.get('token') ?? '';

	let chargement = $state(true);
	let lienInvalide = $state(false);
	let invitation = $state<InvitationInfo | null>(null);

	let nomComplet = $state('');
	let telephone = $state('');
	let motDePasse = $state('');
	let confirmationMotDePasse = $state('');
	let erreur = $state<string | null>(null);
	let enCours = $state(false);

	async function chargerInvitation() {
		if (!id || !jeton) {
			lienInvalide = true;
			chargement = false;
			return;
		}
		try {
			invitation = await invitationApi.consulter(id, jeton);
		} catch {
			// Message générique volontaire côté API (voir API_EQUIPE.md §5) :
			// lien invalide, expiré ou déjà utilisé — on n'essaie pas de distinguer.
			lienInvalide = true;
		} finally {
			chargement = false;
		}
	}

	onMount(() => {
		chargerInvitation();
	});

	async function accepter(event: SubmitEvent) {
		event.preventDefault();
		erreur = null;

		if (!nomComplet.trim() || !telephone.trim()) {
			erreur = 'Merci de compléter tous les champs.';
			return;
		}
		if (!motDePasseValide(motDePasse)) {
			erreur = 'Le mot de passe ne respecte pas les règles ci-dessus.';
			return;
		}
		if (motDePasse !== confirmationMotDePasse) {
			erreur = 'Les mots de passe ne correspondent pas.';
			return;
		}

		enCours = true;
		try {
			const reponse = await invitationApi.accepter({
				id,
				token: jeton,
				nomComplet: nomComplet.trim(),
				telephone: telephone.trim(),
				motDePasse,
				confirmationMotDePasse
			});
			// L'API connecte automatiquement l'utilisateur : pas besoin de
			// repasser par l'écran de connexion.
			session.definir(reponse);
			toast.afficher('Bienvenue sur Scoly !');
			await goto(resolve('/documents'));
		} catch (err) {
			if (err instanceof ApiError && err.status === 400) {
				// Le jeton est consommé au premier essai réussi ; s'il est
				// invalide/expiré/déjà utilisé, inutile de laisser le formulaire.
				lienInvalide = true;
			} else {
				erreur = err instanceof ApiError ? err.message : 'Une erreur est survenue. Réessayez.';
			}
		} finally {
			enCours = false;
		}
	}
</script>

<svelte:head>
	<title>Scoly – Rejoindre un établissement</title>
</svelte:head>

<div class="page-connexion">
	<Logo height={62} />

	<main class="card">
		{#if chargement}
			<p class="auth-lead chargement">
				<Spinner libelle="Vérification de l'invitation…" />
				<span aria-hidden="true">Vérification de l'invitation…</span>
			</p>
		{:else if lienInvalide}
			<section>
				<h1 class="auth-title" tabindex="-1">Invitation invalide</h1>
				<p class="auth-lead">
					Ce lien d'invitation est invalide, a expiré ou a déjà été utilisé. Contactez le directeur
					ou la directrice de votre établissement pour en obtenir un nouveau.
				</p>
				<a class="btn" href={resolve('/connexion')}>Aller à la connexion</a>
			</section>
		{:else if invitation}
			<section>
				<h1 class="auth-title" tabindex="-1">Rejoindre Scoly</h1>
				<p class="auth-lead">
					Vous êtes invité(e) chez <b>{invitation.etablissementNom}</b> en tant que
					<b>{invitation.fonction}</b>.
				</p>
				{#if erreur}
					<p class="banner" role="alert">{erreur}</p>
				{/if}
				<form onsubmit={accepter} novalidate>
					<div class="field">
						<label for="inv-nom">Nom complet *</label>
						<input id="inv-nom" type="text" bind:value={nomComplet} required />
					</div>
					<div class="field">
						<label for="inv-tel">Téléphone *</label>
						<input id="inv-tel" type="tel" autocomplete="tel" bind:value={telephone} required />
					</div>
					<PasswordField id="inv-mdp" label="Mot de passe *" bind:value={motDePasse} />
					<PasswordRules value={motDePasse} />
					<PasswordField
						id="inv-mdp-c"
						label="Confirmer le mot de passe *"
						bind:value={confirmationMotDePasse}
					/>
					<button class="btn" type="submit" disabled={enCours} aria-busy={enCours}>
						{enCours ? 'Création…' : 'Rejoindre l\u2019établissement'}
					</button>
				</form>
			</section>
		{/if}
	</main>
</div>

<style>
	.chargement {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--s3);
	}
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
	.card .btn {
		width: 100%;
		height: 46px;
	}
</style>
