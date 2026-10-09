<script lang="ts">
	import { untrack } from 'svelte';
	import { authApi } from '$lib/api/auth';
	import { ApiError } from '$lib/api/client';
	import PasswordField from '$lib/components/PasswordField.svelte';
	import PasswordRules from '$lib/components/PasswordRules.svelte';
	import { session } from '$lib/stores/session.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { CODE_TROP_DE_REQUETES } from '$lib/types';
	import { redirigerSiSessionExpiree } from '$lib/utils/session-expiree';
	import { MESSAGE_ERREUR_INCONNUE } from '$lib/utils/erreurs-api';
	import { motDePasseValide } from '$lib/utils/validation';

	/**
	 * « Mon profil » : nom et téléphone modifiables (`PATCH /auth/profil`), e-mail en lecture
	 * seule (c'est l'identifiant de connexion), changement de mot de passe (`PATCH /auth/mot-de-passe`).
	 * Utilisé par la page /profil et par l'onglet « Utilisateurs et compte » de Paramètres.
	 */

	// --- Profil ---
	let nomComplet = $state('');
	let telephone = $state('');
	let instantane = $state('');
	let enregistrement = $state(false);
	const modifie = $derived(JSON.stringify({ n: nomComplet, t: telephone }) !== instantane);

	function reinitialiserDepuisSession() {
		nomComplet = session.utilisateur?.nomComplet ?? '';
		telephone = session.utilisateur?.telephone ?? '';
		instantane = JSON.stringify({ n: nomComplet, t: telephone });
	}

	// Les valeurs de la session peuvent arriver après l'affichage (GET /auth/moi au démarrage) :
	// tant que rien n'a été saisi, le formulaire suit la session ; une saisie en cours n'est jamais écrasée.
	$effect(() => {
		void session.utilisateur;
		untrack(() => {
			if (instantane === '' || !modifie) reinitialiserDepuisSession();
		});
	});

	function messageProfil(erreur: unknown): string {
		return erreur instanceof ApiError ? erreur.message : MESSAGE_ERREUR_INCONNUE;
	}

	async function enregistrerProfil() {
		if (!nomComplet.trim()) {
			toast.afficher('Le nom complet est obligatoire.');
			return;
		}
		enregistrement = true;
		try {
			const utilisateur = await session.requeteAuthentifiee((token) =>
				authApi.mettreAJourProfil(token, {
					nomComplet: nomComplet.trim(),
					telephone: telephone.trim()
				})
			);
			session.mettreAJourUtilisateur(utilisateur);
			instantane = JSON.stringify({ n: nomComplet, t: telephone });
			toast.afficher('Profil mis à jour.');
		} catch (erreur) {
			if (await redirigerSiSessionExpiree(erreur)) return;
			toast.afficher(messageProfil(erreur));
		} finally {
			enregistrement = false;
		}
	}

	// --- Mot de passe ---
	let formOuvert = $state(false);
	let motDePasseActuel = $state('');
	let nouveauMotDePasse = $state('');
	let confirmation = $state('');
	let erreurMotDePasse = $state<string | null>(null);
	let motDePasseEnCours = $state(false);

	function fermerFormulaire() {
		formOuvert = false;
		erreurMotDePasse = null;
		motDePasseActuel = '';
		nouveauMotDePasse = '';
		confirmation = '';
	}

	function messageMotDePasse(erreur: unknown): string {
		if (!(erreur instanceof ApiError)) return MESSAGE_ERREUR_INCONNUE;
		if (erreur.status === 429 || erreur.code === CODE_TROP_DE_REQUETES) {
			const minutes = erreur.retryAfterSecondes ? Math.ceil(erreur.retryAfterSecondes / 60) : null;
			return minutes
				? `Trop d’essais. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`
				: 'Trop d’essais. Réessayez dans quelques minutes.';
		}
		return erreur.message;
	}

	async function changerMotDePasse(event: SubmitEvent) {
		event.preventDefault();
		erreurMotDePasse = null;
		if (nouveauMotDePasse !== confirmation) {
			erreurMotDePasse = 'Les mots de passe ne correspondent pas.';
			return;
		}
		if (!motDePasseValide(nouveauMotDePasse)) {
			erreurMotDePasse = 'Le nouveau mot de passe ne respecte pas les règles ci-dessus.';
			return;
		}
		motDePasseEnCours = true;
		try {
			await session.requeteAuthentifiee((token) =>
				authApi.changerMotDePasse(token, {
					motDePasseActuel,
					nouveauMotDePasse,
					confirmationMotDePasse: confirmation
				})
			);
			// Les AUTRES appareils sont déconnectés par l'API ; la session courante reste valide.
			toast.afficher('Mot de passe mis à jour.');
			fermerFormulaire();
		} catch (erreur) {
			if (await redirigerSiSessionExpiree(erreur)) return;
			erreurMotDePasse = messageMotDePasse(erreur);
		} finally {
			motDePasseEnCours = false;
		}
	}
</script>

<h2>Mon profil</h2>
<div class="fgrid">
	<div class="field">
		<label for="f-profil-nom">Nom complet *</label>
		<input id="f-profil-nom" type="text" autocomplete="name" bind:value={nomComplet} required />
	</div>
	<div class="field">
		<label for="f-profil-email">E-mail</label>
		<input
			id="f-profil-email"
			type="email"
			value={session.utilisateur?.email ?? ''}
			readonly
			aria-describedby="f-profil-email-aide"
		/>
		<p class="hint" id="f-profil-email-aide">
			Sert d’identifiant de connexion, non modifiable ici. Contactez l’administrateur de
			l’établissement pour en changer.
		</p>
	</div>
	<div class="field">
		<label for="f-profil-tel">Téléphone</label>
		<input id="f-profil-tel" type="tel" autocomplete="tel" bind:value={telephone} />
	</div>
</div>
<div class="mt" style="display:flex;gap:8px;flex-wrap:wrap">
	<button
		type="button"
		class="btn"
		disabled={!modifie || enregistrement}
		aria-busy={enregistrement}
		onclick={enregistrerProfil}
	>
		{enregistrement ? 'Enregistrement…' : 'Enregistrer le profil'}
	</button>
	<button
		type="button"
		class="btn ghost"
		aria-expanded={formOuvert}
		aria-controls="f-mdp-form"
		onclick={() => (formOuvert ? fermerFormulaire() : (formOuvert = true))}
	>
		Changer le mot de passe
	</button>
</div>

{#if formOuvert}
	<form id="f-mdp-form" class="mt" onsubmit={changerMotDePasse} style="max-width:420px">
		<PasswordField
			id="f-mdp-actuel"
			label="Mot de passe actuel"
			bind:value={motDePasseActuel}
			autocomplete="current-password"
		/>
		<PasswordField
			id="f-mdp-nouveau"
			label="Nouveau mot de passe"
			bind:value={nouveauMotDePasse}
			autocomplete="new-password"
		/>
		<PasswordRules value={nouveauMotDePasse} />
		<PasswordField
			id="f-mdp-confirmation"
			label="Confirmer le nouveau mot de passe"
			bind:value={confirmation}
			autocomplete="new-password"
		/>
		{#if erreurMotDePasse}
			<p class="err" role="alert">{erreurMotDePasse}</p>
		{/if}
		<div style="display:flex;gap:8px">
			<button type="submit" class="btn" disabled={motDePasseEnCours} aria-busy={motDePasseEnCours}>
				{motDePasseEnCours ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
			</button>
			<button type="button" class="btn ghost" onclick={fermerFormulaire}>Annuler</button>
		</div>
	</form>
{/if}
