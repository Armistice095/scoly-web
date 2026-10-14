// Types reflétant les réponses de scoly-api.
// Pas de partage automatique entre les deux dépôts séparés (voir
// ARCHITECTURE.md § "Deux projets séparés, reliés par API") : ces types
// sont à resynchroniser manuellement si le contrat d'API change.

export type OrdreEnseignement = 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE';

export interface AnneeScolaire {
	id: string;
	libelle: string;
	dateRentree: string;
	dateFin: string;
}

export interface Etablissement {
	id: string;
	nom: string;
	ordreEnseignement: OrdreEnseignement;
	departement: string;
	commune: string;
	// Tous les champs suivants peuvent être `null` tant qu'ils n'ont pas été
	// renseignés (voir API_ETABLISSEMENT.md §1) :
	adresse?: string | null;
	numeroAgrement?: string | null;
	telephone?: string | null;
	email?: string | null;
	logoUrl?: string | null;
	directionDepartementale?: string | null;
	ministereTutelle?: string | null;
	devise?: string | null;
	nomSignataire?: string | null;
	fonctionSignataire?: string | null;
	signatureUrl?: string | null;
	cachetUrl?: string | null;
	formatReference?: string | null;
	prochainNumero?: number | null;
	lieuParDefaut?: string | null;
	anneeScolaireActive?: AnneeScolaire | null;
}

/** Champs modifiables via `PATCH /etablissement` (tous optionnels, mise à jour partielle). */
export interface EtablissementUpdatePayload {
	nom?: string;
	ordreEnseignement?: OrdreEnseignement;
	departement?: string;
	commune?: string;
	adresse?: string;
	numeroAgrement?: string;
	telephone?: string;
	email?: string;
	directionDepartementale?: string;
	ministereTutelle?: string;
	devise?: string;
	nomSignataire?: string;
	fonctionSignataire?: string;
	formatReference?: string;
	prochainNumero?: number;
	lieuParDefaut?: string;
}

/** Réponse de `GET /etablissement/entete-par-defaut` (voir API_ETABLISSEMENT.md §5). */
export interface EnteteParDefaut {
	/** `null` si l'ordre ou le département n'est pas reconnu. */
	ministereTutelle: string | null;
	directionDepartementale: string | null;
	devise: string;
}

export type ChampEntete = 'ministereTutelle' | 'directionDepartementale' | 'devise';

export type TypeImageEtablissement = 'logo' | 'signature' | 'cachet';

export interface AnneeScolairePayload {
	libelle: string;
	dateRentree: string;
	dateFin: string;
}

// --- Auth (voir docs/API_AUTH.md) ------------------------------------------

export interface Utilisateur {
	id: string;
	email: string;
	nomComplet: string;
	fonction: string;
	telephone: string;
	role: 'DIRECTEUR' | 'MEMBRE';
	emailVerifie: boolean;
	actif: boolean;
	notifDocumentGenere: boolean;
	notifInvitationAcceptee: boolean;
	/** `nomComplet`, ou la `fonction` d'un invité qui n'a pas encore renseigné son nom. */
	nomAffiche?: string;
	/** 2 lettres au plus, prêtes pour l'avatar (« Jean Dossou » → `JD`). */
	initiales?: string;
}

/** Réponse de `GET /auth/moi` (API_AUTH.md §12). */
export interface MoiReponse {
	utilisateur: Utilisateur;
	etablissement: Etablissement;
}

/** Réponse commune à connexion / vérification de code / rafraîchissement. */
export interface AuthReponse {
	utilisateur: Utilisateur;
	etablissement: Etablissement;
	accessToken: string;
	refreshToken: string;
}

export interface InscriptionPayload {
	nomEtablissement: string;
	ordreEnseignement: OrdreEnseignement;
	departement: string;
	commune: string;
	nomComplet: string;
	fonction: string;
	email: string;
	telephone: string;
	motDePasse: string;
	confirmationMotDePasse: string;
	accepteConditions: boolean;
}

export interface InscriptionReponse {
	email: string;
}

export interface ConnexionPayload {
	email: string;
	motDePasse: string;
	resterConnecte?: boolean;
}

export interface ResetTokenReponse {
	resetToken: string;
}

export interface MessageReponse {
	message: string;
}

/** Champs modifiables via `PATCH /auth/profil` (tous optionnels). */
export interface ProfilUpdatePayload {
	nomComplet?: string;
	telephone?: string;
}

export interface ChangerMotDePassePayload {
	motDePasseActuel: string;
	nouveauMotDePasse: string;
	confirmationMotDePasse: string;
}

/** Champs modifiables via `PATCH /auth/notifications` (tous optionnels). */
export interface NotificationsPayload {
	notifDocumentGenere?: boolean;
	notifInvitationAcceptee?: boolean;
}

/** Codes machine renvoyés par l'API sur certaines erreurs prévues (voir API_AUTH.md). */
export const CODE_COMPTE_NON_ACTIVE = 'COMPTE_NON_ACTIVE';
export const CODE_COMPTE_EN_ATTENTE_ACTIVATION = 'COMPTE_EN_ATTENTE_ACTIVATION';
export const CODE_COMPTE_DESACTIVE = 'COMPTE_DESACTIVE';

// --- Équipe (voir docs/API_EQUIPE.md) --------------------------------------

export type StatutMembreEquipe = 'EN_ATTENTE' | 'ACTIF' | 'DESACTIVE';

export interface MembreEquipe {
	id: string;
	nomComplet: string | null;
	fonction: string;
	email: string;
	role: 'DIRECTEUR' | 'MEMBRE';
	statut: StatutMembreEquipe;
}

export interface InviterMembrePayload {
	email: string;
	fonction: string;
}

export interface InvitationInfo {
	email: string;
	fonction: string;
	etablissementNom: string;
}

export interface AccepterInvitationPayload {
	id: string;
	token: string;
	nomComplet: string;
	telephone: string;
	motDePasse: string;
	confirmationMotDePasse: string;
}

// --- Élèves (voir docs/API_ELEVES.md) ---------------------------------------

export type Sexe = 'MASCULIN' | 'FEMININ';

/** `ACTIF` est le seul statut existant côté API (affiché « Inscrit »). Ne jamais l'envoyer. */
export type StatutEleve = 'ACTIF';

export interface Eleve {
	id: string;
	matricule: string | null;
	matriculeEducMaster: string | null;
	nom: string;
	prenoms: string;
	sexe: Sexe;
	/** `AAAA-MM-JJ`, sans heure ni fuseau. */
	dateNaissance: string;
	lieuNaissance: string;
	parentTuteur: string;
	/** Format international compact : `+229` + 10 chiffres (ou numéro étranger). */
	telephone: string;
	adresse: string | null;
	/** Texte libre (`CE1`, `3ème A`…), `null` tant qu'il n'a jamais été renseigné. */
	classe: string | null;
	/** `AAAA-MM-JJ`, `null` tant qu'elle n'a jamais été renseignée. */
	dateInscription: string | null;
	statut: StatutEleve;
	createdAt: string;
	updatedAt: string;
}

export interface DocumentEleve {
	id: string;
	numeroUnique: string;
	statut: string;
	createdAt: string;
	typeDocument: { code: string; nom: string };
}

/** Réponse de `GET /eleves/:id` : l'élève + ses documents établis (du plus récent au plus ancien). */
export interface EleveDetail extends Eleve {
	documents: DocumentEleve[];
}

export interface PaginationMeta {
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface ElevesPage {
	data: Eleve[];
	meta: PaginationMeta;
}

export interface ListeElevesParams {
	search?: string;
	statut?: StatutEleve;
	page?: number;
	limit?: number;
}

/**
 * Corps de `POST /eleves` et de `PATCH /eleves/:id` (partiel).
 * Facultatifs : absent ou `null` (PATCH) = pas de valeur.
 */
export interface ElevePayload {
	matricule?: string | null;
	matriculeEducMaster?: string | null;
	nom?: string;
	prenoms?: string;
	sexe?: Sexe;
	dateNaissance?: string;
	lieuNaissance?: string;
	parentTuteur?: string;
	telephone?: string;
	adresse?: string | null;
	classe?: string | null;
	dateInscription?: string | null;
	confirmerDoublon?: boolean;
}

export interface ImportElevesReponse {
	importes: number;
}

/** Erreur de validation `400 VALIDATION_ERROR` : un message par champ. */
export interface ErreurChamp {
	champ: string;
	message: string;
}

/** Erreur d'import `400 IMPORT_INVALIDE` : une entrée par ligne Excel (l'en-tête est la ligne 1). */
export interface ErreurLigneImport {
	ligne: number;
	messages: string[];
}

/** Codes machine du module élèves (voir API_ELEVES.md). */
export const CODE_VALIDATION_ERROR = 'VALIDATION_ERROR';
export const CODE_MATRICULE_DEJA_UTILISE = 'MATRICULE_DEJA_UTILISE';
export const CODE_MATRICULE_EDUCMASTER_DEJA_UTILISE = 'MATRICULE_EDUCMASTER_DEJA_UTILISE';
export const CODE_ELEVE_DOUBLON_POSSIBLE = 'ELEVE_DOUBLON_POSSIBLE';
export const CODE_IMPORT_INVALIDE = 'IMPORT_INVALIDE';

// --- Documents (voir docs/API_DOCUMENTS.md) ---------------------------------

export type CategorieDocument = 'SCOLARITE' | 'TRANSFERTS_DEPARTS';

export type TypeChampDocument = 'text' | 'textarea' | 'select' | 'date';

/** Description d'un champ du formulaire de l'étape 2 (fournie par l'API : rien n'est codé en dur). */
export interface ChampDocument {
	cle: string;
	libelle: string;
	type: TypeChampDocument;
	obligatoire: boolean;
	/** Pour `select` : liste exacte des valeurs acceptées (même casse). */
	options?: string[];
	maxLength?: number;
	placeholder?: string;
	/** Présent si le champ existe aussi sur la fiche élève : à préremplir. */
	eleveChamp?: 'classe' | 'dateInscription';
}

export interface TypeDocument {
	id: string;
	code: string;
	nom: string;
	description: string;
	categorie: CategorieDocument;
	/** `false` → carte « Bientôt disponible » ; l'API refuse la génération (409). */
	disponible: boolean;
	champs: ChampDocument[];
}

/** Corps de `POST /documents/apercu` et `POST /documents`. */
export interface CorpsDocument {
	eleveId: string;
	typeDocumentId: string;
	champsSaisis: Record<string, string>;
}

export interface DocumentCree {
	id: string;
	numeroUnique: string;
	statut: 'ACTIF' | 'ANNULE';
	eleveId: string;
	typeDocumentId: string;
	dateEmission: string;
	createdAt: string;
	/** Lien signé valable 1 h : à ouvrir immédiatement, ne jamais le stocker. */
	urlTelechargement: string;
}

export const CODE_TYPE_DOCUMENT_INDISPONIBLE = 'TYPE_DOCUMENT_INDISPONIBLE';
export const CODE_ANNEE_SCOLAIRE_MANQUANTE = 'ANNEE_SCOLAIRE_MANQUANTE';
export const CODE_NUMERO_DEJA_UTILISE = 'NUMERO_DEJA_UTILISE';

export interface DocumentGenere {
	id: string;
	numeroUnique: string;
	statut: 'ACTIF' | 'ANNULE';
	eleve: Pick<Eleve, 'id' | 'nom' | 'prenoms'>;
	typeDocument: Pick<TypeDocument, 'id' | 'nom'>;
	createdAt: string;
}

export type StatutVerification = 'valide' | 'annule' | 'introuvable';

export interface ResultatVerification {
	statut: StatutVerification;
	eleveNom?: string;
	typeDocument?: string;
	etablissement?: string;
	numeroUnique?: string;
	dateEmission?: string;
	dateAnnulation?: string;
}

// --- Archives (voir docs/API_ARCHIVES.md) -----------------------------------

export type StatutArchive = 'ACTIF' | 'ANNULE';

/** `recent` : plus récents d'abord (défaut) ; `ancien` : plus anciens d'abord. */
export type TriArchives = 'recent' | 'ancien';

export interface PersonneArchive {
	id: string;
	nomComplet: string;
	fonction: string;
}

/** Une ligne de `GET /archives`. `annulation` vaut `null` pour un document actif. */
export interface ArchiveListe {
	id: string;
	reference: string;
	statut: StatutArchive;
	/** Instant ISO UTC : à formater dans le fuseau Africa/Porto-Novo. */
	createdAt: string;
	/** Date seule `AAAA-MM-JJ`. */
	dateEmission: string;
	typeDocument: { id: string; code: string; nom: string };
	/** Élève tel qu'imprimé sur le document (corriger sa fiche ne modifie pas l'archive). */
	eleve: { id: string; nomComplet: string };
	annulation: { motif: string; le: string } | null;
	/** `false` pour un document annulé : plus de téléchargement. */
	telechargeable: boolean;
}

export interface ArchivesPage {
	data: ArchiveListe[];
	meta: PaginationMeta;
}

export interface ListeArchivesParams {
	search?: string;
	typeDocumentId?: string;
	statut?: StatutArchive;
	eleveId?: string;
	tri?: TriArchives;
	page?: number;
	limit?: number;
}

export type TypeEvenementArchive = 'ETABLI' | 'TELECHARGE' | 'ANNULE';

export interface EvenementArchive {
	type: TypeEvenementArchive;
	le: string;
	par: PersonneArchive;
}

/** Réponse de `GET /archives/:id` et de `POST /archives/:id/annulation`. */
export interface ArchiveFiche {
	id: string;
	reference: string;
	statut: StatutArchive;
	createdAt: string;
	dateEmission: string;
	typeDocument: { id: string; code: string; nom: string };
	eleve: {
		id: string;
		nom: string;
		prenoms: string;
		nomComplet: string;
		matricule: string | null;
		matriculeEducMaster: string | null;
	};
	etabli: { par: PersonneArchive; le: string };
	annulation: { par: PersonneArchive; le: string; motif: string } | null;
	/** Du plus récent au plus ancien ; les 100 téléchargements les plus récents seulement. */
	historique: EvenementArchive[];
	nombreTelechargements: number;
	telechargeable: boolean;
}

/** Codes machine du module archives (voir API_ARCHIVES.md §8). */
export const CODE_DOCUMENT_DEJA_ANNULE = 'DOCUMENT_DEJA_ANNULE';
export const CODE_DOCUMENT_ANNULE = 'DOCUMENT_ANNULE';

// --- Notifications (voir docs/API_NOTIFICATIONS.md) ------------------------

export type TypeNotification =
	| 'DOCUMENT_ETABLI'
	| 'DOCUMENT_ANNULE'
	| 'IMPORT_TERMINE'
	| 'NOUVEL_ELEVE'
	| 'ALERTE_MATRICULE_EDUCMASTER';

export type CategorieNotification = 'DOCUMENTS' | 'ELEVES' | 'IMPORTS' | 'ALERTES';

/** Calculé par le serveur sur le jour civil du Bénin (Africa/Porto-Novo). */
export type GroupeNotification = 'AUJOURD_HUI' | 'HIER' | 'PLUS_ANCIEN';

/** Où mène un clic. `ELEVES` = liste des élèves (`id` est alors `null`). */
export interface CibleNotification {
	type: 'DOCUMENT' | 'ELEVE' | 'ELEVES';
	id: string | null;
}

export interface Notification {
	id: string;
	type: TypeNotification;
	categorie: CategorieNotification;
	titre: string;
	/** Texte final, déjà rédigé : à afficher tel quel. */
	message: string;
	lue: boolean;
	lueLe: string | null;
	/** ISO 8601 UTC. */
	createdAt: string;
	groupe: GroupeNotification;
	cible: CibleNotification | null;
}

export interface ListeNotificationsParams {
	statut?: 'toutes' | 'non_lues';
	categorie?: CategorieNotification | '';
	limite?: number;
	curseur?: string | null;
}

export interface NotificationsPage {
	data: Notification[];
	meta: { limite: number; curseurSuivant: string | null };
}

export interface CompteurNotifications {
	nonLues: number;
}

export interface ToutLireReponse {
	marquees: number;
	nonLues: number;
}

/** `429` : `{ code: 'TROP_DE_REQUETES', retryAfterSecondes }` (API_AUTH.md, limites de débit). */
export const CODE_TROP_DE_REQUETES = 'TROP_DE_REQUETES';
export const CODE_CURSEUR_INVALIDE = 'CURSEUR_INVALIDE';
