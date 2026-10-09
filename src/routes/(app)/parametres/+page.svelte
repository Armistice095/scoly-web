<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/Icon.svelte';
	import ProfilFormulaire from '$lib/components/compte/ProfilFormulaire.svelte';
	import SkeletonLignes from '$lib/components/skeleton/SkeletonLignes.svelte';
	import SkeletonParametres from '$lib/components/skeleton/SkeletonParametres.svelte';
	import { monter } from '$lib/motion';
	import { etablissementApi } from '$lib/api/etablissement';
	import { equipeApi } from '$lib/api/equipe';
	import { authApi } from '$lib/api/auth';
	import { ApiError } from '$lib/api/client';
	import { session } from '$lib/stores/session.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { emailValide } from '$lib/utils/validation';
	import { DEPARTEMENTS, COMMUNES_PAR_DEPARTEMENT } from '$lib/constants/geo';
	import type {
		AnneeScolaire,
		Etablissement,
		EtablissementUpdatePayload,
		MembreEquipe,
		StatutMembreEquipe,
		TypeImageEtablissement
	} from '$lib/types';

	type OngletId = 'etablissement' | 'entete' | 'annee' | 'numerotation' | 'equipe';

	const ONGLETS: { id: OngletId; label: string }[] = [
		{ id: 'etablissement', label: 'Établissement' },
		{ id: 'entete', label: 'En-tête et signature' },
		{ id: 'annee', label: 'Année scolaire' },
		{ id: 'numerotation', label: 'Numérotation et modèles' },
		{ id: 'equipe', label: 'Utilisateurs et compte' }
	];

	const TITRES_SIGNATAIRE = ['Directeur', 'Directrice', 'Proviseur', 'Proviseure'];

	// Champ libre côté API (voir API_EQUIPE.md), mais proposé en select avec
	// les fonctions les plus courantes pour aller plus vite à l'invitation.
	const FONCTIONS_EQUIPE = ['Secrétariat', 'Censeur', 'Surveillant'];

	// La route de bascule "Documents proposés" n'existe pas encore côté back
	// (voir la note en bas de API_ETABLISSEMENT.md) — la section est affichée
	// mais désactivée en attendant.
	const DOCUMENTS_PROPOSES = [
		'Certificat de scolarité',
		'Attestation d’inscription',
		'Fiche élève',
		'Attestation de transfert',
		'Demande de transfert'
	];

	const BADGE_STATUT: Record<StatutMembreEquipe, string> = {
		ACTIF: 'b-ok',
		EN_ATTENTE: 'b-wait',
		DESACTIVE: 'b-off'
	};
	const LIBELLE_STATUT: Record<StatutMembreEquipe, string> = {
		ACTIF: 'Actif',
		EN_ATTENTE: 'En attente',
		DESACTIVE: 'Désactivé'
	};

	const estDirecteur = $derived(session.utilisateur?.role === 'DIRECTEUR');

	let ongletActif: OngletId = $state('etablissement');

	let chargement = $state(true);
	let erreurChargement = $state<string | null>(null);
	let etablissement = $state<Etablissement | null>(null);

	// --- Brouillon partagé Établissement / En-tête et signature / Numérotation
	// (les 3 onglets éditent le même PATCH /etablissement) ---
	let brouillon = $state<EtablissementUpdatePayload>({});
	let brouillonEnregistre = $state('{}');
	let enregistrementEnCours = $state(false);
	const modifie = $derived(JSON.stringify(brouillon) !== brouillonEnregistre);
	const communesDisponibles = $derived(
		brouillon.departement ? (COMMUNES_PAR_DEPARTEMENT[brouillon.departement] ?? []) : []
	);

	let televersementEnCours = $state<TypeImageEtablissement | null>(null);

	// --- Année scolaire ---
	let anneeLibelle = $state('');
	let anneeDateRentree = $state('');
	let anneeDateFin = $state('');
	let anneeSnapshot = $state('{}');
	let anneeErreur = $state<string | null>(null);
	let anneeEnregistrementEnCours = $state(false);
	const anneeModifiee = $derived(
		JSON.stringify({ l: anneeLibelle, r: anneeDateRentree, f: anneeDateFin }) !== anneeSnapshot
	);

	let anneesPassees = $state<AnneeScolaire[]>([]);
	let anneesChargees = $state(false);
	let activationEnCoursId = $state<string | null>(null);

	let nouvelleAnneeOuverte = $state(false);
	let nouvelleAnneeLibelle = $state('');
	let nouvelleAnneeDateRentree = $state('');
	let nouvelleAnneeDateFin = $state('');
	let nouvelleAnneeErreur = $state<string | null>(null);
	let nouvelleAnneeEnCours = $state(false);

	// --- Équipe ---
	let equipe = $state<MembreEquipe[]>([]);
	let equipeChargee = $state(false);
	let inviteEmail = $state('');
	let inviteFonction = $state(FONCTIONS_EQUIPE[0]);
	let inviteErreur = $state<string | null>(null);
	let inviteEnCours = $state(false);
	let actionEquipeEnCoursId = $state<string | null>(null);
	let renvoiDesactiveJusqua = $state<Record<string, number>>({});

	// --- Notifications ---
	let notifDocumentGenere = $state(session.utilisateur?.notifDocumentGenere ?? true);
	let notifInvitationAcceptee = $state(session.utilisateur?.notifInvitationAcceptee ?? true);
	let notifEnCours = $state<'doc' | 'invit' | null>(null);

	$effect(() => {
		if (ongletActif === 'annee' && !anneesChargees) {
			chargerAnneesScolaires();
		}
		if (ongletActif === 'equipe' && estDirecteur && !equipeChargee) {
			chargerEquipe();
		}
	});

	function versDateInput(iso?: string | null): string {
		return iso ? iso.slice(0, 10) : '';
	}

	function formaterDate(iso: string): string {
		return new Intl.DateTimeFormat('fr-FR').format(new Date(iso));
	}

	function construireBrouillon(donnees: Etablissement): EtablissementUpdatePayload {
		return {
			nom: donnees.nom,
			ordreEnseignement: donnees.ordreEnseignement,
			departement: donnees.departement,
			commune: donnees.commune,
			adresse: donnees.adresse ?? '',
			numeroAgrement: donnees.numeroAgrement ?? '',
			telephone: donnees.telephone ?? '',
			email: donnees.email ?? '',
			directionDepartementale: donnees.directionDepartementale ?? '',
			ministereTutelle: donnees.ministereTutelle ?? '',
			devise: donnees.devise ?? '',
			nomSignataire: donnees.nomSignataire ?? '',
			fonctionSignataire: donnees.fonctionSignataire ?? '',
			formatReference: donnees.formatReference ?? '',
			prochainNumero: donnees.prochainNumero ?? 1,
			lieuParDefaut: donnees.lieuParDefaut ?? ''
		};
	}

	function definirEtablissement(donnees: Etablissement) {
		etablissement = donnees;
		session.mettreAJourEtablissement(donnees);
	}

	function reinitialiserAnneeDepuis(donnees: Etablissement) {
		anneeLibelle = donnees.anneeScolaireActive?.libelle ?? '';
		anneeDateRentree = versDateInput(donnees.anneeScolaireActive?.dateRentree);
		anneeDateFin = versDateInput(donnees.anneeScolaireActive?.dateFin);
		anneeSnapshot = JSON.stringify({ l: anneeLibelle, r: anneeDateRentree, f: anneeDateFin });
	}

	function reinitialiserBrouillonDepuis(donnees: Etablissement) {
		brouillon = construireBrouillon(donnees);
		brouillonEnregistre = JSON.stringify(brouillon);
	}

	/** Réinitialisation complète (chargement initial + juste après un enregistrement réussi). */
	function appliquerEtablissement(donnees: Etablissement) {
		definirEtablissement(donnees);
		reinitialiserBrouillonDepuis(donnees);
		reinitialiserAnneeDepuis(donnees);
	}

	async function surErreur(
		erreur: unknown,
		cible: (message: string) => void,
		messageParDefaut: string
	) {
		if (erreur instanceof ApiError && erreur.status === 401) {
			await goto(resolve('/connexion'));
			return;
		}
		cible(erreur instanceof ApiError ? erreur.message : messageParDefaut);
	}

	async function chargerEtablissement() {
		chargement = true;
		erreurChargement = null;
		try {
			const donnees = await session.requeteAuthentifiee((token) =>
				etablissementApi.consulter(token)
			);
			appliquerEtablissement(donnees);
		} catch (erreur) {
			await surErreur(
				erreur,
				(m) => (erreurChargement = m),
				'Impossible de charger les paramètres.'
			);
		} finally {
			chargement = false;
		}
	}

	onMount(() => {
		chargerEtablissement();
	});

	function surToucheOnglet(event: KeyboardEvent, idCourant: OngletId) {
		const index = ONGLETS.findIndex((o) => o.id === idCourant);
		const cibles: Record<string, number> = {
			ArrowRight: index + 1,
			ArrowLeft: index - 1,
			Home: 0,
			End: ONGLETS.length - 1
		};
		const suivant = cibles[event.key];
		if (suivant === undefined) return;
		event.preventDefault();
		const idSuivant = ONGLETS[(suivant + ONGLETS.length) % ONGLETS.length].id;
		ongletActif = idSuivant;
		document.getElementById('t-' + idSuivant)?.focus();
	}

	function validerBrouillon(): string | null {
		if (!brouillon.nom?.trim()) return 'Le nom de l’établissement est obligatoire.';
		if (!brouillon.commune?.trim()) return 'La commune est obligatoire.';
		if (brouillon.email && !emailValide(brouillon.email))
			return 'Entrez une adresse e-mail valide.';
		if (!brouillon.formatReference?.trim()) return 'Le format de la référence est obligatoire.';
		if (!brouillon.formatReference.includes('{N}')) {
			return 'Le format de la référence doit contenir {N}.';
		}
		if (!brouillon.prochainNumero || brouillon.prochainNumero < 1) {
			return 'Le prochain numéro doit être supérieur à 0.';
		}
		return null;
	}

	async function enregistrerEtablissement() {
		const erreurValidation = validerBrouillon();
		if (erreurValidation) {
			toast.afficher(erreurValidation);
			return;
		}
		enregistrementEnCours = true;
		try {
			const donnees = await session.requeteAuthentifiee((token) =>
				etablissementApi.mettreAJour(token, brouillon)
			);
			appliquerEtablissement(donnees);
			toast.afficher('Paramètres enregistrés.');
		} catch (erreur) {
			await surErreur(erreur, (m) => toast.afficher(m), 'Une erreur est survenue.');
		} finally {
			enregistrementEnCours = false;
		}
	}

	function annulerEtablissement() {
		if (etablissement) reinitialiserBrouillonDepuis(etablissement);
	}

	async function surChoixFichier(type: TypeImageEtablissement, event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const fichier = input.files?.[0];
		if (!fichier) return;
		televersementEnCours = type;
		try {
			const donnees = await session.requeteAuthentifiee((token) =>
				etablissementApi.televerserImage(token, type, fichier)
			);
			definirEtablissement(donnees);
			toast.afficher('Image mise à jour.');
		} catch (erreur) {
			await surErreur(erreur, (m) => toast.afficher(m), 'Le téléversement a échoué.');
		} finally {
			televersementEnCours = null;
			input.value = '';
		}
	}

	// --- Année scolaire ---

	async function chargerAnneesScolaires() {
		try {
			anneesPassees = await session.requeteAuthentifiee((token) =>
				etablissementApi.listerAnneesScolaires(token)
			);
			anneesChargees = true;
		} catch (erreur) {
			await surErreur(
				erreur,
				(m) => toast.afficher(m),
				'Impossible de charger les années scolaires.'
			);
		}
	}

	async function enregistrerAnnee() {
		if (!etablissement?.anneeScolaireActive) return;
		anneeErreur = null;
		if (!anneeLibelle.trim() || !anneeDateRentree || !anneeDateFin) {
			anneeErreur = 'Tous les champs sont obligatoires.';
			return;
		}
		if (anneeDateFin <= anneeDateRentree) {
			anneeErreur = 'La date de fin doit être postérieure à la date de rentrée.';
			return;
		}
		anneeEnregistrementEnCours = true;
		try {
			const annee = await session.requeteAuthentifiee((token) =>
				etablissementApi.modifierAnneeScolaire(token, etablissement!.anneeScolaireActive!.id, {
					libelle: anneeLibelle.trim(),
					dateRentree: anneeDateRentree,
					dateFin: anneeDateFin
				})
			);
			if (etablissement) etablissement = { ...etablissement, anneeScolaireActive: annee };
			anneeSnapshot = JSON.stringify({ l: anneeLibelle, r: anneeDateRentree, f: anneeDateFin });
			anneesPassees = anneesPassees.map((a) => (a.id === annee.id ? annee : a));
			toast.afficher('Année scolaire mise à jour.');
		} catch (erreur) {
			await surErreur(erreur, (m) => (anneeErreur = m), 'Une erreur est survenue.');
		} finally {
			anneeEnregistrementEnCours = false;
		}
	}

	async function creerNouvelleAnnee(event: SubmitEvent) {
		event.preventDefault();
		nouvelleAnneeErreur = null;
		if (!nouvelleAnneeLibelle.trim() || !nouvelleAnneeDateRentree || !nouvelleAnneeDateFin) {
			nouvelleAnneeErreur = 'Tous les champs sont obligatoires.';
			return;
		}
		if (nouvelleAnneeDateFin <= nouvelleAnneeDateRentree) {
			nouvelleAnneeErreur = 'La date de fin doit être postérieure à la date de rentrée.';
			return;
		}
		nouvelleAnneeEnCours = true;
		try {
			const annee = await session.requeteAuthentifiee((token) =>
				etablissementApi.creerAnneeScolaire(token, {
					libelle: nouvelleAnneeLibelle.trim(),
					dateRentree: nouvelleAnneeDateRentree,
					dateFin: nouvelleAnneeDateFin
				})
			);
			anneesPassees = [annee, ...anneesPassees];
			if (etablissement) etablissement = { ...etablissement, anneeScolaireActive: annee };
			reinitialiserAnneeDepuis(etablissement!);
			nouvelleAnneeOuverte = false;
			nouvelleAnneeLibelle = '';
			nouvelleAnneeDateRentree = '';
			nouvelleAnneeDateFin = '';
			toast.afficher(`Année ${annee.libelle} créée et activée.`);
		} catch (erreur) {
			await surErreur(erreur, (m) => (nouvelleAnneeErreur = m), 'Une erreur est survenue.');
		} finally {
			nouvelleAnneeEnCours = false;
		}
	}

	async function activerAnnee(annee: AnneeScolaire) {
		activationEnCoursId = annee.id;
		try {
			const donnees = await session.requeteAuthentifiee((token) =>
				etablissementApi.activerAnneeScolaire(token, annee.id)
			);
			definirEtablissement(donnees);
			reinitialiserAnneeDepuis(donnees);
			toast.afficher(`Année ${annee.libelle} activée.`);
		} catch (erreur) {
			await surErreur(erreur, (m) => toast.afficher(m), 'L’activation a échoué.');
		} finally {
			activationEnCoursId = null;
		}
	}

	// --- Équipe ---

	async function chargerEquipe() {
		try {
			equipe = await session.requeteAuthentifiee((token) => equipeApi.lister(token));
			equipeChargee = true;
		} catch (erreur) {
			await surErreur(erreur, (m) => toast.afficher(m), 'Impossible de charger l’équipe.');
		}
	}

	async function inviter(event: SubmitEvent) {
		event.preventDefault();
		inviteErreur = null;
		if (!emailValide(inviteEmail)) {
			inviteErreur = 'Entrez une adresse e-mail valide.';
			return;
		}
		if (!inviteFonction.trim()) {
			inviteErreur = 'Indiquez la fonction de la personne invitée.';
			return;
		}
		inviteEnCours = true;
		try {
			const membre = await session.requeteAuthentifiee((token) =>
				equipeApi.inviter(token, { email: inviteEmail.trim(), fonction: inviteFonction.trim() })
			);
			equipe = [...equipe, membre];
			toast.afficher('Invitation envoyée à ' + membre.email + '.');
			inviteEmail = '';
			inviteFonction = FONCTIONS_EQUIPE[0];
		} catch (erreur) {
			await surErreur(erreur, (m) => (inviteErreur = m), 'L’invitation a échoué.');
		} finally {
			inviteEnCours = false;
		}
	}

	function renvoiDisponible(id: string): boolean {
		return (renvoiDesactiveJusqua[id] ?? 0) <= Date.now();
	}

	async function renvoyerInvitation(membre: MembreEquipe) {
		if (!renvoiDisponible(membre.id)) return;
		actionEquipeEnCoursId = membre.id;
		try {
			await session.requeteAuthentifiee((token) => equipeApi.renvoyerInvitation(token, membre.id));
			renvoiDesactiveJusqua = { ...renvoiDesactiveJusqua, [membre.id]: Date.now() + 60_000 };
			setTimeout(() => {
				renvoiDesactiveJusqua = { ...renvoiDesactiveJusqua, [membre.id]: 0 };
			}, 60_000);
			toast.afficher('Invitation renvoyée à ' + membre.email + '.');
		} catch (erreur) {
			if (erreur instanceof ApiError && erreur.status === 429) {
				renvoiDesactiveJusqua = { ...renvoiDesactiveJusqua, [membre.id]: Date.now() + 60_000 };
			}
			await surErreur(erreur, (m) => toast.afficher(m), 'Le renvoi a échoué.');
		} finally {
			actionEquipeEnCoursId = null;
		}
	}

	async function basculerStatutMembre(membre: MembreEquipe) {
		actionEquipeEnCoursId = membre.id;
		try {
			const appelApi = membre.statut === 'DESACTIVE' ? equipeApi.reactiver : equipeApi.desactiver;
			const misAJour = await session.requeteAuthentifiee((token) => appelApi(token, membre.id));
			equipe = equipe.map((m) => (m.id === misAJour.id ? misAJour : m));
			toast.afficher(misAJour.statut === 'DESACTIVE' ? 'Compte désactivé.' : 'Compte réactivé.');
		} catch (erreur) {
			await surErreur(erreur, (m) => toast.afficher(m), 'Action impossible.');
		} finally {
			actionEquipeEnCoursId = null;
		}
	}

	// --- Notifications ---

	async function basculerNotification(cle: 'notifDocumentGenere' | 'notifInvitationAcceptee') {
		const valeurPrecedente =
			cle === 'notifDocumentGenere' ? notifDocumentGenere : notifInvitationAcceptee;
		const nouvelleValeur = !valeurPrecedente;
		if (cle === 'notifDocumentGenere') notifDocumentGenere = nouvelleValeur;
		else notifInvitationAcceptee = nouvelleValeur;

		notifEnCours = cle === 'notifDocumentGenere' ? 'doc' : 'invit';
		try {
			const utilisateur = await session.requeteAuthentifiee((token) =>
				authApi.mettreAJourNotifications(token, { [cle]: nouvelleValeur })
			);
			session.mettreAJourUtilisateur(utilisateur);
		} catch (erreur) {
			if (cle === 'notifDocumentGenere') notifDocumentGenere = valeurPrecedente;
			else notifInvitationAcceptee = valeurPrecedente;
			await surErreur(erreur, (m) => toast.afficher(m), 'Une erreur est survenue.');
		} finally {
			notifEnCours = null;
		}
	}
</script>

{#snippet champFichier(type: TypeImageEtablissement, id: string, url: string | null | undefined)}
	<div class="file">
		{#if url}
			<img class="file-prev" src={url} alt="" />
		{/if}
		{#if estDirecteur}
			<label class="btn ghost sm" for={id} aria-busy={televersementEnCours === type}>
				<Icon name="upload" /> Choisir un fichier
			</label>
			<input
				{id}
				class="sr-only"
				type="file"
				accept="image/png,image/jpeg,image/webp"
				disabled={televersementEnCours !== null}
				onchange={(e) => surChoixFichier(type, e)}
			/>
		{/if}
		<span class="hint">
			{televersementEnCours === type
				? 'Envoi…'
				: url
					? 'Fichier actuel ci-contre'
					: 'Aucun fichier choisi'}
		</span>
	</div>
{/snippet}

<h1>Paramètres</h1>

{#if chargement}
	<SkeletonParametres />
{:else if erreurChargement}
	<p class="err">{erreurChargement}</p>
	<button type="button" class="btn ghost mt" onclick={chargerEtablissement}>Réessayer</button>
{:else}
	<div class="tabs" role="tablist" in:monter={{ y: 6 }} aria-label="Sections des paramètres">
		{#each ONGLETS as onglet (onglet.id)}
			<button
				type="button"
				role="tab"
				class="tab"
				id={'t-' + onglet.id}
				aria-selected={ongletActif === onglet.id}
				aria-controls="pn"
				tabindex={ongletActif === onglet.id ? 0 : -1}
				onclick={() => (ongletActif = onglet.id)}
				onkeydown={(e) => surToucheOnglet(e, onglet.id)}
			>
				{onglet.label}
			</button>
		{/each}
	</div>

	<div
		id="pn"
		role="tabpanel"
		in:monter={{ y: 6 }}
		aria-labelledby={'t-' + ongletActif}
		tabindex="-1"
	>
		{#if ongletActif === 'etablissement'}
			<section class="panel">
				<h2>Établissement</h2>
				<p class="sd">Ces informations apparaissent sur tous les documents.</p>
				<div class="fgrid">
					<div class="field full">
						<label for="f-nom">Nom de l’établissement *</label>
						<input
							id="f-nom"
							type="text"
							bind:value={brouillon.nom}
							readonly={!estDirecteur}
							required
						/>
					</div>
					<div class="field">
						<label for="f-ordre">Ordre d’enseignement</label>
						<select id="f-ordre" bind:value={brouillon.ordreEnseignement} disabled={!estDirecteur}>
							<option value="MATERNELLE">Maternelle</option>
							<option value="PRIMAIRE">Primaire</option>
							<option value="SECONDAIRE">Secondaire</option>
						</select>
					</div>
					<div class="field">
						<label for="f-agrement">Numéro d’agrément</label>
						<input
							id="f-agrement"
							type="text"
							bind:value={brouillon.numeroAgrement}
							readonly={!estDirecteur}
						/>
					</div>
					<div class="field full">
						<label for="f-adresse">Adresse</label>
						<input
							id="f-adresse"
							type="text"
							bind:value={brouillon.adresse}
							readonly={!estDirecteur}
						/>
					</div>
					<div class="field">
						<label for="f-commune">Commune *</label>
						<select
							id="f-commune"
							bind:value={brouillon.commune}
							disabled={!estDirecteur || !brouillon.departement}
							required
						>
							<option value="">
								{brouillon.departement ? 'Choisir' : "Choisir d'abord un département"}
							</option>
							{#each communesDisponibles as c (c)}
								<option value={c}>{c}</option>
							{/each}
						</select>
					</div>
					<div class="field">
						<label for="f-dept">Département</label>
						<select
							id="f-dept"
							bind:value={brouillon.departement}
							disabled={!estDirecteur}
							onchange={() => (brouillon.commune = '')}
						>
							{#each DEPARTEMENTS as dep (dep)}
								<option value={dep}>{dep}</option>
							{/each}
						</select>
					</div>
					<div class="field">
						<label for="f-tel">Téléphone</label>
						<input
							id="f-tel"
							type="tel"
							bind:value={brouillon.telephone}
							readonly={!estDirecteur}
						/>
					</div>
					<div class="field">
						<label for="f-email">E-mail</label>
						<input
							id="f-email"
							type="email"
							bind:value={brouillon.email}
							readonly={!estDirecteur}
						/>
					</div>
					<div class="field full">
						<label for="f-logo">Logo</label>
						{@render champFichier('logo', 'f-logo', etablissement?.logoUrl)}
					</div>
				</div>
			</section>
		{:else if ongletActif === 'entete'}
			<section class="panel">
				<h2>En-tête des documents</h2>
				<p class="sd">Les lignes officielles imprimées en haut de chaque document.</p>
				<div class="fgrid">
					<div class="field full">
						<label for="f-ministere">Ministère de tutelle *</label>
						<input
							id="f-ministere"
							type="text"
							bind:value={brouillon.ministereTutelle}
							readonly={!estDirecteur}
							required
						/>
					</div>
					<div class="field full">
						<label for="f-direction">Direction départementale</label>
						<input
							id="f-direction"
							type="text"
							bind:value={brouillon.directionDepartementale}
							readonly={!estDirecteur}
						/>
					</div>
					<div class="field full">
						<label for="f-devise">Devise</label>
						<input
							id="f-devise"
							type="text"
							bind:value={brouillon.devise}
							readonly={!estDirecteur}
						/>
					</div>
				</div>
			</section>
			<section class="panel">
				<h2>Signataire</h2>
				<p class="sd">La personne qui signe les documents.</p>
				<div class="fgrid">
					<div class="field">
						<label for="f-signataire">Nom du signataire *</label>
						<input
							id="f-signataire"
							type="text"
							bind:value={brouillon.nomSignataire}
							readonly={!estDirecteur}
							required
						/>
					</div>
					<div class="field">
						<label for="f-titre">Titre</label>
						<select id="f-titre" bind:value={brouillon.fonctionSignataire} disabled={!estDirecteur}>
							{#each TITRES_SIGNATAIRE as titre (titre)}
								<option value={titre}>{titre}</option>
							{/each}
						</select>
					</div>
					<div class="field">
						<label for="f-signature">Image de la signature</label>
						{@render champFichier('signature', 'f-signature', etablissement?.signatureUrl)}
					</div>
					<div class="field">
						<label for="f-cachet">Image du cachet</label>
						{@render champFichier('cachet', 'f-cachet', etablissement?.cachetUrl)}
					</div>
				</div>
			</section>
		{:else if ongletActif === 'annee'}
			<section class="panel">
				<h2>Année scolaire</h2>
				<p class="sd">Reprise dans chaque document et dans la référence.</p>
				{#if etablissement?.anneeScolaireActive}
					<div class="fgrid">
						<div class="field">
							<label for="f-annee-libelle">Année scolaire *</label>
							<input
								id="f-annee-libelle"
								type="text"
								bind:value={anneeLibelle}
								readonly={!estDirecteur}
								required
							/>
						</div>
						<div class="field">
							<label for="f-annee-debut">Date de rentrée *</label>
							<input
								id="f-annee-debut"
								type="date"
								bind:value={anneeDateRentree}
								readonly={!estDirecteur}
								required
							/>
						</div>
						<div class="field">
							<label for="f-annee-fin">Date de fin *</label>
							<input
								id="f-annee-fin"
								type="date"
								bind:value={anneeDateFin}
								readonly={!estDirecteur}
								required
							/>
						</div>
					</div>
					{#if anneeErreur}
						<p class="err mt">{anneeErreur}</p>
					{/if}
					{#if estDirecteur}
						<button
							type="button"
							class="btn mt"
							disabled={!anneeModifiee || anneeEnregistrementEnCours}
							aria-busy={anneeEnregistrementEnCours}
							onclick={enregistrerAnnee}
						>
							{anneeEnregistrementEnCours ? 'Enregistrement…' : 'Enregistrer'}
						</button>
					{/if}
				{:else}
					<p class="sd">Aucune année scolaire active pour le moment.</p>
				{/if}
			</section>

			<section class="panel">
				<h2>Historique des années scolaires</h2>
				{#if !anneesChargees}
					<SkeletonLignes libelle="Chargement des années scolaires…" />
				{:else}
					<div class="tw">
						<table class="tbl">
							<thead>
								<tr>
									<th>Année</th>
									<th>Rentrée</th>
									<th>Fin</th>
									{#if estDirecteur}
										<th><span class="sr-only">Action</span></th>
									{/if}
								</tr>
							</thead>
							<tbody>
								{#each anneesPassees as annee (annee.id)}
									<tr>
										<td>
											{annee.libelle}
											{#if annee.id === etablissement?.anneeScolaireActive?.id}
												<br /><span class="badge b-ok">Active</span>
											{/if}
										</td>
										<td>{formaterDate(annee.dateRentree)}</td>
										<td>{formaterDate(annee.dateFin)}</td>
										{#if estDirecteur}
											<td>
												{#if annee.id !== etablissement?.anneeScolaireActive?.id}
													<button
														type="button"
														class="btn ghost sm"
														disabled={activationEnCoursId === annee.id}
														aria-busy={activationEnCoursId === annee.id}
														onclick={() => activerAnnee(annee)}
													>
														{activationEnCoursId === annee.id ? 'Activation…' : 'Activer'}
													</button>
												{/if}
											</td>
										{/if}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}

				{#if estDirecteur}
					{#if !nouvelleAnneeOuverte}
						<button
							type="button"
							class="btn ghost sm"
							onclick={() => (nouvelleAnneeOuverte = true)}
						>
							<Icon name="plus" /> Nouvelle année scolaire
						</button>
					{:else}
						<form class="mt" onsubmit={creerNouvelleAnnee}>
							<div class="fgrid">
								<div class="field">
									<label for="f-na-libelle">Année scolaire *</label>
									<input
										id="f-na-libelle"
										type="text"
										placeholder="2026-2027"
										bind:value={nouvelleAnneeLibelle}
										required
									/>
								</div>
								<div class="field">
									<label for="f-na-debut">Date de rentrée *</label>
									<input
										id="f-na-debut"
										type="date"
										bind:value={nouvelleAnneeDateRentree}
										required
									/>
								</div>
								<div class="field">
									<label for="f-na-fin">Date de fin *</label>
									<input id="f-na-fin" type="date" bind:value={nouvelleAnneeDateFin} required />
								</div>
							</div>
							{#if nouvelleAnneeErreur}
								<p class="err mt">{nouvelleAnneeErreur}</p>
							{/if}
							<div class="mt" style="display:flex;gap:8px">
								<button
									type="submit"
									class="btn"
									disabled={nouvelleAnneeEnCours}
									aria-busy={nouvelleAnneeEnCours}
								>
									{nouvelleAnneeEnCours ? 'Création…' : 'Créer et activer'}
								</button>
								<button
									type="button"
									class="btn ghost"
									onclick={() => {
										nouvelleAnneeOuverte = false;
										nouvelleAnneeErreur = null;
									}}
								>
									Annuler
								</button>
							</div>
						</form>
					{/if}
				{/if}
			</section>
		{:else if ongletActif === 'numerotation'}
			<section class="panel">
				<h2>Numérotation</h2>
				<p class="sd">Le format de la référence imprimée sur chaque document.</p>
				<div class="fgrid">
					<div class="field full">
						<label for="f-format">Format de la référence *</label>
						<input
							id="f-format"
							type="text"
							bind:value={brouillon.formatReference}
							placeholder="N°{'{N}'}/{'{ANNEE}'}/CEG-GODOMEY"
							readonly={!estDirecteur}
							required
						/>
						<p class="hint">
							Utilisez {'{N}'} pour le numéro d’ordre et {'{ANNEE}'} pour l’année scolaire.
						</p>
					</div>
					<div class="field">
						<label for="f-next">Prochain numéro *</label>
						<input
							id="f-next"
							type="number"
							min="1"
							bind:value={brouillon.prochainNumero}
							readonly={!estDirecteur}
							required
						/>
					</div>
					<div class="field">
						<label for="f-lieu">Lieu d’établissement par défaut</label>
						<input
							id="f-lieu"
							type="text"
							bind:value={brouillon.lieuParDefaut}
							readonly={!estDirecteur}
						/>
						<p class="hint">Repris dans la mention « Fait à… ».</p>
					</div>
				</div>
			</section>
			<section class="panel">
				<h2>Documents proposés</h2>
				<p class="sd">
					Désactivez les documents que votre établissement n’utilise pas : ils disparaissent de
					l’écran Documents. <strong>Bientôt disponible</strong>.
				</p>
				<ul class="sws">
					{#each DOCUMENTS_PROPOSES as doc (doc)}
						<li>
							<label class="sw">
								<span>{doc}</span>
								<input type="checkbox" role="switch" checked disabled aria-label={doc} />
							</label>
						</li>
					{/each}
				</ul>
			</section>
		{:else if ongletActif === 'equipe'}
			{#if estDirecteur}
				<section class="panel">
					<h2>Utilisateurs</h2>
					<p class="sd">Les personnes qui peuvent établir des documents.</p>
					{#if !equipeChargee}
						<SkeletonLignes libelle="Chargement de l'équipe…" />
					{:else}
						<div class="tw">
							<table class="tbl">
								<thead>
									<tr>
										<th>Nom</th>
										<th>Rôle</th>
										<th>Statut</th>
										<th><span class="sr-only">Action</span></th>
									</tr>
								</thead>
								<tbody>
									{#each equipe as membre (membre.id)}
										<tr>
											<td>
												{membre.nomComplet ?? membre.email}
												<br /><span class="hint">{membre.email}</span>
											</td>
											<td>{membre.fonction}</td>
											<td>
												<span class="badge {BADGE_STATUT[membre.statut]}">
													{LIBELLE_STATUT[membre.statut]}
												</span>
											</td>
											<td>
												{#if membre.role !== 'DIRECTEUR'}
													<div style="display:flex;gap:6px;flex-wrap:wrap">
														{#if membre.statut === 'EN_ATTENTE'}
															<button
																type="button"
																class="btn ghost sm"
																disabled={!renvoiDisponible(membre.id) ||
																	actionEquipeEnCoursId === membre.id}
																aria-busy={actionEquipeEnCoursId === membre.id}
																onclick={() => renvoyerInvitation(membre)}
															>
																Renvoyer l’invitation
															</button>
														{/if}
														<button
															type="button"
															class="btn ghost sm"
															disabled={actionEquipeEnCoursId === membre.id}
															aria-busy={actionEquipeEnCoursId === membre.id}
															onclick={() => basculerStatutMembre(membre)}
														>
															{membre.statut === 'DESACTIVE' ? 'Réactiver' : 'Désactiver'}
														</button>
													</div>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}

					<form class="add" onsubmit={inviter}>
						<label class="sr-only" for="inv-mail">E-mail de la personne à inviter</label>
						<input
							id="inv-mail"
							type="email"
							placeholder="E-mail à inviter"
							bind:value={inviteEmail}
							required
						/>
						<label class="sr-only" for="inv-fonction">Fonction</label>
						<select id="inv-fonction" bind:value={inviteFonction} required>
							{#each FONCTIONS_EQUIPE as fonction (fonction)}
								<option value={fonction}>{fonction}</option>
							{/each}
						</select>
						<button type="submit" class="btn" disabled={inviteEnCours} aria-busy={inviteEnCours}>
							<Icon name="mail" />
							{inviteEnCours ? 'Envoi…' : 'Inviter'}
						</button>
					</form>
					{#if inviteErreur}
						<p class="err mt">{inviteErreur}</p>
					{/if}
				</section>
			{/if}

			<section class="panel">
				<ProfilFormulaire />
			</section>

			<section class="panel">
				<h2>Notifications</h2>
				<ul class="sws one">
					<li>
						<label class="sw">
							<span>Me prévenir quand un document est généré</span>
							<input
								type="checkbox"
								role="switch"
								checked={notifDocumentGenere}
								disabled={notifEnCours === 'doc'}
								onchange={() => basculerNotification('notifDocumentGenere')}
							/>
						</label>
					</li>
					<li>
						<label class="sw">
							<span>Me prévenir quand une invitation est acceptée</span>
							<input
								type="checkbox"
								role="switch"
								checked={notifInvitationAcceptee}
								disabled={notifEnCours === 'invit'}
								onchange={() => basculerNotification('notifInvitationAcceptee')}
							/>
						</label>
					</li>
				</ul>
			</section>
		{/if}
	</div>

	{#if estDirecteur && modifie && (ongletActif === 'etablissement' || ongletActif === 'entete' || ongletActif === 'numerotation')}
		<div class="bar" role="region" aria-label="Enregistrement">
			<span>Modifications non enregistrées</span>
			<button
				type="button"
				class="btn ghost"
				disabled={enregistrementEnCours}
				onclick={annulerEtablissement}
			>
				Annuler
			</button>
			<button
				type="button"
				class="btn"
				disabled={enregistrementEnCours}
				aria-busy={enregistrementEnCours}
				onclick={enregistrerEtablissement}
			>
				{enregistrementEnCours ? 'Enregistrement…' : 'Enregistrer'}
			</button>
		</div>
	{/if}
{/if}

<style>
	h1 {
		font: 400 34px/1.15 var(--font-serif);
		letter-spacing: -0.015em;
		margin: 0 0 var(--s5);
	}
</style>
