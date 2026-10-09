import type { Eleve, ElevePayload, Sexe, StatutEleve } from '$lib/types';

/* ------------------------------------------------------------------ */
/* Affichage                                                           */
/* ------------------------------------------------------------------ */

export const LIBELLE_SEXE: Record<Sexe, string> = { MASCULIN: 'Masculin', FEMININ: 'Féminin' };

/** `ACTIF` est le seul statut API ; il s'affiche « Inscrit ». */
export const LIBELLE_STATUT: Record<StatutEleve, string> = { ACTIF: 'Inscrit' };

const formatDate = new Intl.DateTimeFormat('fr-FR', {
	day: 'numeric',
	month: 'short',
	year: 'numeric'
});

/** `2014-07-15` → « 15 juil. 2014 » (construit en heure locale : pas de décalage de fuseau). */
export function formaterDateNaissance(iso: string): string {
	const [a, m, j] = iso.split('-').map(Number);
	if (!a || !m || !j) return iso;
	return formatDate.format(new Date(a, m - 1, j));
}

/** Horodatage ISO (`createdAt`) → « 30 sept. 2026 ». */
export function formaterDateHeure(iso: string): string {
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? iso : formatDate.format(date);
}

/** `+2290197164676` → `+229 01 97 16 46 76`. Les autres formats sont affichés tels quels. */
export function formaterTelephone(tel: string): string {
	const m = /^\+229(\d{10})$/.exec(tel);
	if (!m) return tel;
	return `+229 ${m[1].replace(/(\d{2})(?=\d)/g, '$1 ')}`;
}

export function nomComplet(eleve: Pick<Eleve, 'nom' | 'prenoms'>): string {
	return `${eleve.nom.toUpperCase()} ${eleve.prenoms}`;
}

/** « 1–10 sur 30 » : début = (page-1)*limit+1, fin = min(page*limit, total). */
export function libellePlage(page: number, limit: number, total: number): string {
	if (total === 0) return '0 sur 0';
	return `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} sur ${total}`;
}

/* ------------------------------------------------------------------ */
/* Formulaire                                                          */
/* ------------------------------------------------------------------ */

export type ChampEleve =
	| 'matricule'
	| 'matriculeEducMaster'
	| 'nom'
	| 'prenoms'
	| 'sexe'
	| 'dateNaissance'
	| 'lieuNaissance'
	| 'parentTuteur'
	| 'telephone'
	| 'adresse'
	| 'classe'
	| 'dateInscription';

/** Ordre d'affichage des champs (sert aussi à focaliser la première erreur). */
export const ORDRE_CHAMPS: ChampEleve[] = [
	'matricule',
	'matriculeEducMaster',
	'nom',
	'prenoms',
	'sexe',
	'dateNaissance',
	'lieuNaissance',
	'parentTuteur',
	'telephone',
	'adresse',
	'classe',
	'dateInscription'
];

export type ValeursEleve = Record<ChampEleve, string>;
export type ErreursEleve = Partial<Record<ChampEleve, string>>;

const OBLIGATOIRES: ChampEleve[] = [
	'nom',
	'prenoms',
	'sexe',
	'dateNaissance',
	'lieuNaissance',
	'parentTuteur',
	'telephone'
];
const FACULTATIFS: ChampEleve[] = [
	'matricule',
	'matriculeEducMaster',
	'adresse',
	'classe',
	'dateInscription'
];

const LONGUEURS_MAX: Partial<Record<ChampEleve, number>> = {
	matricule: 50,
	matriculeEducMaster: 50,
	nom: 100,
	prenoms: 150,
	lieuNaissance: 100,
	parentTuteur: 150,
	adresse: 255,
	classe: 30
};

export const LIBELLES_CHAMPS: Record<ChampEleve, string> = {
	matricule: 'Le matricule',
	matriculeEducMaster: 'Le matricule EducMaster',
	nom: 'Le nom',
	prenoms: 'Les prénoms',
	sexe: 'Le sexe',
	dateNaissance: 'La date de naissance',
	lieuNaissance: 'Le lieu de naissance',
	parentTuteur: 'Le parent ou tuteur',
	telephone: 'Le téléphone',
	adresse: "L'adresse",
	classe: 'La classe',
	dateInscription: "La date d'inscription"
};

export function valeursInitiales(eleve: Eleve | null): ValeursEleve {
	return {
		matricule: eleve?.matricule ?? '',
		matriculeEducMaster: eleve?.matriculeEducMaster ?? '',
		nom: eleve?.nom ?? '',
		prenoms: eleve?.prenoms ?? '',
		sexe: eleve?.sexe ?? 'MASCULIN',
		dateNaissance: eleve?.dateNaissance ?? '',
		lieuNaissance: eleve?.lieuNaissance ?? '',
		parentTuteur: eleve?.parentTuteur ?? '',
		// Préremplissage au format lisible : l'API accepte `+229 01 97 16 46 76`.
		telephone: eleve ? formaterTelephone(eleve.telephone) : '',
		adresse: eleve?.adresse ?? '',
		classe: eleve?.classe ?? '',
		dateInscription: eleve?.dateInscription ?? ''
	};
}

function dateLocaleIso(date: Date): string {
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const jj = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${mm}-${jj}`;
}

export function aujourdhuiIso(): string {
	return dateLocaleIso(new Date());
}

/** Âge en années révolues à la date du jour, pour une date `AAAA-MM-JJ`. */
function ageEnAnnees(iso: string): number | null {
	const [a, m, j] = iso.split('-').map(Number);
	if (!a || !m || !j) return null;
	const auj = new Date();
	let age = auj.getFullYear() - a;
	if (auj.getMonth() + 1 < m || (auj.getMonth() + 1 === m && auj.getDate() < j)) age -= 1;
	return age;
}

/**
 * Validation client : reprend les règles du contrat pour éviter un aller-retour
 * réseau. L'API reste l'autorité (ses messages par champ sont affichés tels
 * quels si elle refuse). Un seul message par champ : « obligatoire » avant
 * « format », puis « longueur » — comme côté API.
 */
export function validerEleve(valeurs: ValeursEleve): ErreursEleve {
	const erreurs: ErreursEleve = {};

	for (const champ of OBLIGATOIRES) {
		if (!valeurs[champ].trim()) {
			erreurs[champ] =
				`${LIBELLES_CHAMPS[champ]} ${champ === 'prenoms' ? 'sont obligatoires' : 'est obligatoire'}.`;
		}
	}

	if (!erreurs.dateNaissance) {
		const age = ageEnAnnees(valeurs.dateNaissance.trim());
		if (age === null) {
			erreurs.dateNaissance = 'Date de naissance invalide.';
		} else if (valeurs.dateNaissance.trim() > aujourdhuiIso()) {
			erreurs.dateNaissance = 'La date de naissance ne peut pas être dans le futur.';
		} else if (age < 2 || age > 30) {
			erreurs.dateNaissance = "L'âge de l'élève doit être compris entre 2 et 30 ans.";
		}
	}

	// Facultative, mais si elle est renseignée : date réelle, pas dans le futur, après la naissance.
	const inscription = valeurs.dateInscription.trim();
	if (inscription) {
		if (ageEnAnnees(inscription) === null) {
			erreurs.dateInscription = "La date d'inscription est invalide.";
		} else if (inscription > aujourdhuiIso()) {
			erreurs.dateInscription = "La date d'inscription ne peut pas être dans le futur.";
		} else if (!erreurs.dateNaissance && inscription <= valeurs.dateNaissance.trim()) {
			erreurs.dateInscription =
				"La date d'inscription doit être postérieure à la date de naissance.";
		}
	}

	if (!erreurs.telephone) {
		const compact = valeurs.telephone.replace(/[\s.-]/g, '');
		if (!/^\+?\d{8,15}$/.test(compact)) {
			erreurs.telephone =
				'Numéro de téléphone invalide (10 chiffres, ou format international commençant par +).';
		}
	}

	for (const [champ, max] of Object.entries(LONGUEURS_MAX) as [ChampEleve, number][]) {
		if (!erreurs[champ] && valeurs[champ].trim().length > max) {
			erreurs[champ] = `${LIBELLES_CHAMPS[champ]} ne doit pas dépasser ${max} caractères.`;
		}
	}

	return erreurs;
}

const compacte = (tel: string) => tel.replace(/\s+/g, '');

/**
 * Construit le corps de la requête.
 * - Création (`initial = null`) : champs obligatoires + facultatifs non vides.
 * - Modification : uniquement les champs modifiés ; un facultatif vidé est
 *   envoyé à `null` (ce qui l'efface côté API).
 */
export function construirePayload(valeurs: ValeursEleve, initial: Eleve | null): ElevePayload {
	const payload: Record<string, string | null> = {};

	for (const champ of OBLIGATOIRES) {
		const valeur = valeurs[champ].trim();
		if (initial) {
			const avant = champ === 'telephone' ? compacte(initial.telephone) : String(initial[champ]);
			const apres = champ === 'telephone' ? compacte(valeur) : valeur;
			if (avant === apres) continue;
		}
		payload[champ] = valeur;
	}

	for (const champ of FACULTATIFS) {
		const valeur = valeurs[champ].trim();
		if (initial) {
			if (valeur === (initial[champ] ?? '')) continue;
			payload[champ] = valeur === '' ? null : valeur;
		} else if (valeur !== '') {
			payload[champ] = valeur;
		}
	}

	return payload as ElevePayload;
}
