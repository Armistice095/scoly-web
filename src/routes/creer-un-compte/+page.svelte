<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
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
	import { CODE_COMPTE_EN_ATTENTE_ACTIVATION, type OrdreEnseignement } from '$lib/types';
	import { DEPARTEMENTS } from '$lib/constants/geo';

	type Vue = 'etape-1' | 'etape-2' | 'verification';

	const FONCTIONS = ['Directeur', 'Directrice', 'Proviseur', 'Proviseure', 'Secrétaire', 'Autre'];

	const COMMUNES_PAR_DEPARTEMENT: Record<string, string[]> = {
		Alibori: ['Banikoara', 'Gogounou', 'Kandi', 'Karimama', 'Malanville', 'Segbana'],
		Atacora: [
			'Boukoumbé',
			'Cobly',
			'Kérou',
			'Kouandé',
			'Matéri',
			'Natitingou',
			'Péhunco',
			'Tanguiéta',
			'Toucountouna'
		],
		Atlantique: [
			'Abomey-Calavi',
			'Allada',
			'Kpomassè',
			'Ouidah',
			'Sô-Ava',
			'Toffo',
			'Tori-Bossito',
			'Zè'
		],
		Borgou: ['Bembéréké', 'Kalalé', "N'Dali", 'Nikki', 'Parakou', 'Pèrèrè', 'Sinendé', 'Tchaourou'],
		Collines: ['Bantè', 'Dassa-Zoumè', 'Glazoué', 'Ouèssè', 'Savalou', 'Savè'],
		Couffo: ['Aplahoué', 'Djakotomey', 'Dogbo', 'Klouékanmè', 'Lalo', 'Toviklin'],
		Donga: ['Bassila', 'Copargo', 'Djougou', 'Ouaké'],
		Littoral: ['Cotonou'],
		Mono: ['Athiémé', 'Bopa', 'Comè', 'Grand-Popo', 'Houéyogbé', 'Lokossa'],
		Ouémé: [
			'Adjarra',
			'Adjohoun',
			'Aguégués',
			'Akpro-Missérété',
			'Avrankou',
			'Bonou',
			'Dangbo',
			'Porto-Novo',
			'Sèmè-Kpodji'
		],
		Plateau: ['Adja-Ouèrè', 'Ifangni', 'Kétou', 'Pobè', 'Sakété'],
		Zou: [
			'Abomey',
			'Agbangnizoun',
			'Bohicon',
			'Covè',
			'Djidja',
			'Ouinhi',
			'Zagnanado',
			'Za-Kpota',
			'Zogbodomey'
		]
	};

	let vue: Vue = $state('etape-1');

	// --- Étape 1 : l'établissement ---
	let nomEtablissement = $state('');
	let ordreEnseignement: OrdreEnseignement | '' = $state('');
	let departement = $state('');
	let commune = $state('');
	let erreurEtape1 = $state<string | null>(null);
	const communesDisponibles = $derived(
		departement ? (COMMUNES_PAR_DEPARTEMENT[departement] ?? []) : []
	);

	// --- Étape 2 : compte administrateur ---
	let nomComplet = $state('');
	let fonction = $state('');
	let email = $state('');
	let telephone = $state('');
	let motDePasse = $state('');
	let confirmationMotDePasse = $state('');
	let accepteConditions = $state(false);
	let erreurEtape2 = $state<string | null>(null);
	let erreurEmail = $state<string | null>(null);
	let compteEnAttenteActivation = $state(false);
	let enCours = $state(false);

	function validerEtape1(event: SubmitEvent) {
		event.preventDefault();
		erreurEtape1 = null;
		if (!nomEtablissement.trim() || !ordreEnseignement || !departement || !commune.trim()) {
			erreurEtape1 = 'Merci de compléter tous les champs.';
			return;
		}
		vue = 'etape-2';
	}

	async function creerLeCompte(event: SubmitEvent) {
		event.preventDefault();
		erreurEtape2 = null;
		erreurEmail = null;
		compteEnAttenteActivation = false;

		if (!nomComplet.trim() || !fonction || !email.trim() || !telephone.trim()) {
			erreurEtape2 = 'Merci de compléter tous les champs.';
			return;
		}
		if (!motDePasseValide(motDePasse)) {
			erreurEtape2 = 'Le mot de passe ne respecte pas les règles ci-dessus.';
			return;
		}
		if (motDePasse !== confirmationMotDePasse) {
			erreurEtape2 = 'Les mots de passe ne correspondent pas.';
			return;
		}
		if (!accepteConditions) {
			erreurEtape2 =
				"Merci d'accepter les conditions d'utilisation et la politique de confidentialité.";
			return;
		}

		enCours = true;
		try {
			await authApi.inscrire({
				nomEtablissement,
				ordreEnseignement: ordreEnseignement as OrdreEnseignement,
				departement,
				commune,
				nomComplet,
				fonction,
				email,
				telephone,
				motDePasse,
				confirmationMotDePasse,
				accepteConditions
			});
			toast.afficher(`Un code de vérification a été envoyé à ${email}.`);
			vue = 'verification';
		} catch (err) {
			if (err instanceof ApiError && err.status === 409) {
				if (err.code === CODE_COMPTE_EN_ATTENTE_ACTIVATION) {
					compteEnAttenteActivation = true;
				} else {
					erreurEmail = err.message;
				}
			} else {
				erreurEtape2 =
					err instanceof ApiError ? err.message : 'Une erreur est survenue. Réessayez.';
			}
		} finally {
			enCours = false;
		}
	}

	async function renvoyerEtOuvrirVerification() {
		enCours = true;
		try {
			await authApi.renvoyerActivation(email);
			toast.afficher(`Un code de vérification a été envoyé à ${email}.`);
			vue = 'verification';
		} catch (err) {
			erreurEtape2 = err instanceof ApiError ? err.message : 'Une erreur est survenue. Réessayez.';
		} finally {
			enCours = false;
		}
	}

	async function verifierCode(code: string) {
		const reponse = await authApi.verifierActivation(email, code);
		// L'API connecte automatiquement l'utilisateur : pas besoin de repasser
		// par l'écran de connexion.
		session.definir(reponse);
		toast.afficher('Compte créé. Bienvenue sur Scoly !');
		await goto(resolve('/documents'));
	}

	async function renvoyerCode() {
		await authApi.renvoyerActivation(email);
	}
</script>

<div class="page-connexion">
	<Logo height={62} />

	<main class="card">
		{#if vue === 'etape-1'}
			<section in:monter={{ y: 8 }}>
				<h1 class="auth-title" tabindex="-1">Créer un compte</h1>
				<p class="auth-lead">Inscrivez votre établissement sur Scoly.</p>
				<p class="stp">Étape 1 sur 2</p>
				<div class="prog"><i style="width: 50%"></i></div>

				<h2 class="sec">L'établissement</h2>
				{#if erreurEtape1}
					<p class="banner" role="alert">{erreurEtape1}</p>
				{/if}
				<form onsubmit={validerEtape1} novalidate>
					<div class="field">
						<label for="nom-etab">Nom de l'établissement *</label>
						<input id="nom-etab" type="text" bind:value={nomEtablissement} required />
					</div>
					<div class="field">
						<label for="ordre">Ordre d'enseignement *</label>
						<select id="ordre" bind:value={ordreEnseignement} required>
							<option value="">Choisir</option>
							<option value="MATERNELLE">Maternelle</option>
							<option value="PRIMAIRE">Primaire</option>
							<option value="SECONDAIRE">Secondaire</option>
						</select>
					</div>
					<div class="two">
						<div class="field">
							<label for="dep">Département *</label>
							<select id="dep" bind:value={departement} onchange={() => (commune = '')} required>
								<option value="">Choisir</option>
								{#each DEPARTEMENTS as dep (dep)}
									<option value={dep}>{dep}</option>
								{/each}
							</select>
						</div>
						<div class="field">
							<label for="commune">Commune *</label>
							<select id="commune" bind:value={commune} disabled={!departement} required>
								<option value=""
									>{departement ? 'Choisir' : "Choisir d'abord un département"}</option
								>
								{#each communesDisponibles as c (c)}
									<option value={c}>{c}</option>
								{/each}
							</select>
						</div>
					</div>
					<button class="btn" type="submit">Continuer</button>
				</form>
				<p class="note">
					Vous avez déjà un compte ? <a class="lnk-a" href={resolve('/connexion')}>Se connecter</a>
				</p>
			</section>
		{:else if vue === 'etape-2'}
			<section in:monter={{ y: 8 }}>
				<h1 class="auth-title" tabindex="-1">Créer un compte</h1>
				<p class="auth-lead">Inscrivez votre établissement sur Scoly.</p>
				<p class="stp">Étape 2 sur 2</p>
				<div class="prog"><i style="width: 100%"></i></div>

				<h2 class="sec">Compte administrateur</h2>
				{#if erreurEtape2}
					<p class="banner" role="alert">{erreurEtape2}</p>
				{/if}
				{#if compteEnAttenteActivation}
					<p class="banner" role="alert">
						Un compte existe déjà avec cette adresse e-mail mais n'a pas encore été activé.
						<button
							type="button"
							class="lnk"
							style="padding:0;display:inline"
							onclick={renvoyerEtOuvrirVerification}
						>
							Renvoyer le code d'activation
						</button>
					</p>
				{/if}
				{#if erreurEmail}
					<p class="banner" role="alert">
						{erreurEmail}
						<a class="lnk-a" href={resolve('/connexion')}>Se connecter</a>
					</p>
				{/if}
				<form onsubmit={creerLeCompte} novalidate>
					<div class="field">
						<label for="nom-complet">Nom complet *</label>
						<input id="nom-complet" type="text" bind:value={nomComplet} required />
					</div>
					<div class="field">
						<label for="fonction">Fonction *</label>
						<select id="fonction" bind:value={fonction} required>
							<option value="">Choisir</option>
							{#each FONCTIONS as f (f)}
								<option value={f}>{f}</option>
							{/each}
						</select>
					</div>
					<div class="two">
						<div class="field">
							<label for="email-pro">E-mail professionnel *</label>
							<input
								id="email-pro"
								type="email"
								autocomplete="email"
								inputmode="email"
								bind:value={email}
								required
							/>
						</div>
						<div class="field">
							<label for="tel">Téléphone *</label>
							<input id="tel" type="tel" autocomplete="tel" bind:value={telephone} required />
						</div>
					</div>
					<PasswordField id="mdp" label="Mot de passe *" bind:value={motDePasse} />
					<PasswordRules value={motDePasse} />
					<PasswordField
						id="mdp-c"
						label="Confirmer le mot de passe *"
						bind:value={confirmationMotDePasse}
					/>
					<label class="chk full" style="margin-bottom:var(--s5)">
						<input type="checkbox" bind:checked={accepteConditions} />
						<span>
							J'accepte les <a class="lnk-a" href={resolve('/conditions-d-utilisation')}
								>conditions d'utilisation</a
							>
							et la
							<a class="lnk-a" href={resolve('/politique-de-confidentialite')}
								>politique de confidentialité</a
							>.
						</span>
					</label>
					<div class="row" style="gap: var(--s3)">
						<button class="btn ghost" type="button" onclick={() => (vue = 'etape-1')}>Retour</button
						>
						<button
							class="btn"
							type="submit"
							disabled={enCours}
							aria-busy={enCours}
							style="flex: 1"
						>
							{enCours ? 'Création…' : "Créer le compte de l'établissement"}
						</button>
					</div>
				</form>
				<p class="note">
					Vous avez déjà un compte ? <a class="lnk-a" href={resolve('/connexion')}>Se connecter</a>
				</p>
			</section>
		{:else if vue === 'verification'}
			<section in:monter={{ y: 8 }}>
				<h1 class="auth-title" tabindex="-1">Vérification</h1>
				{#key email}
					<CodeVerification
						onVerify={verifierCode}
						onResend={renvoyerCode}
						onRetour={() => (vue = 'etape-2')}
						texteRetour="Retour à la création de compte"
					>
						Entrez le code à 6 chiffres envoyé à <b>{email}</b> pour activer le compte de
						<b>{nomEtablissement}</b>.
					</CodeVerification>
				{/key}
			</section>
		{/if}
	</main>
</div>

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
	.card {
		max-width: 540px;
	}
	.card .btn {
		height: 46px;
	}
	.card form > .btn:not(.ghost) {
		width: 100%;
	}
	.chk.full {
		align-items: flex-start;
	}
	.chk.full input {
		margin-top: 3px;
		flex: none;
	}
</style>
