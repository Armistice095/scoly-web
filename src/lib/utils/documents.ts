import type { ChampDocument, CategorieDocument, Eleve, TypeDocument } from '$lib/types';
import { aujourdhuiIso } from './eleves';

export type FiltreCategorie = 'TOUS' | CategorieDocument;

export const FILTRES: { valeur: FiltreCategorie; libelle: string }[] = [
	{ valeur: 'TOUS', libelle: 'Tous' },
	{ valeur: 'SCOLARITE', libelle: 'Scolarité' },
	{ valeur: 'TRANSFERTS_DEPARTS', libelle: 'Transferts et départs' }
];

/** Icône de la carte, choisie d'après le `code` stable du type. */
const ICONES: Record<string, 'cap' | 'check' | 'id' | 'swap' | 'mail'> = {
	CERTIFICAT_SCOLARITE: 'cap',
	ATTESTATION_INSCRIPTION: 'check',
	FICHE_ELEVE: 'id',
	ATTESTATION_TRANSFERT: 'swap',
	DEMANDE_TRANSFERT: 'mail'
};

export const iconeType = (code: string) => ICONES[code] ?? 'doc';

/** Minuscules sans accents, pour les recherches locales et le surlignage. */
export function normaliser(texte: string): string {
	return texte
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
}

export function filtrerTypes(
	types: TypeDocument[],
	categorie: FiltreCategorie,
	recherche: string
): TypeDocument[] {
	const q = normaliser(recherche.trim());
	return types.filter(
		(t) =>
			(categorie === 'TOUS' || t.categorie === categorie) &&
			normaliser(`${t.nom} ${t.description}`).includes(q)
	);
}

/**
 * Découpe `texte` en segments, ceux qui correspondent à un mot de `requete`
 * (sans tenir compte de la casse ni des accents) étant marqués pour surlignage.
 */
export function segmentsSurlignes(
	texte: string,
	requete: string
): { texte: string; surligne: boolean }[] {
	const normalise = normaliser(texte);
	const mots = normaliser(requete)
		.split(/[\s\-'’.]+/)
		.filter(Boolean);
	// Garde-fou : la normalisation doit conserver les positions (cas des caractères précomposés).
	if (mots.length === 0 || normalise.length !== texte.length) return [{ texte, surligne: false }];

	const marque = new Array<boolean>(texte.length).fill(false);
	for (const mot of mots) {
		let debut = normalise.indexOf(mot);
		while (debut !== -1) {
			for (let i = debut; i < debut + mot.length; i++) marque[i] = true;
			debut = normalise.indexOf(mot, debut + mot.length);
		}
	}

	const segments: { texte: string; surligne: boolean }[] = [];
	for (let i = 0; i < texte.length; i++) {
		const dernier = segments[segments.length - 1];
		if (dernier && dernier.surligne === marque[i]) dernier.texte += texte[i];
		else segments.push({ texte: texte[i], surligne: marque[i] });
	}
	return segments;
}

/* ------------------------------------------------------------------ */
/* Formulaire de l'étape 2 (piloté par `champs`)                        */
/* ------------------------------------------------------------------ */

export type ValeursDocument = Record<string, string>;

/**
 * Choix d'interface de la maquette (l'API n'a pas de valeur par défaut) :
 * appréciations préremplies, uniquement si la valeur fait partie des `options`.
 */
const PREREMPLISSAGE: Record<string, string> = {
	assiduite: 'Bonne',
	conduite: 'Bonne',
	travail: 'Satisfaisant'
};

export function valeursInitialesDocument(
	champs: ChampDocument[],
	eleve: Pick<Eleve, 'classe' | 'dateInscription'>
): ValeursDocument {
	const valeurs: ValeursDocument = {};
	for (const c of champs) {
		if (c.eleveChamp) {
			valeurs[c.cle] = eleve[c.eleveChamp] ?? '';
		} else if (c.type === 'select' && c.options?.includes(PREREMPLISSAGE[c.cle])) {
			valeurs[c.cle] = PREREMPLISSAGE[c.cle];
		} else {
			valeurs[c.cle] = '';
		}
	}
	return valeurs;
}

/** Validation client des règles génériques (obligatoire, longueur, date). L'API reste l'autorité. */
export function validerChamps(
	champs: ChampDocument[],
	valeurs: ValeursDocument,
	eleve: Pick<Eleve, 'dateNaissance'>
): Record<string, string> {
	const erreurs: Record<string, string> = {};
	for (const c of champs) {
		const valeur = (valeurs[c.cle] ?? '').trim();
		if (!valeur) {
			if (c.obligatoire) erreurs[c.cle] = `${c.libelle} est obligatoire.`;
			continue;
		}
		if (c.type === 'select' && c.options && !c.options.includes(valeur)) {
			erreurs[c.cle] = `${c.libelle} : valeur non autorisée.`;
		} else if (c.maxLength && valeur.length > c.maxLength) {
			erreurs[c.cle] = `${c.libelle} ne doit pas dépasser ${c.maxLength} caractères.`;
		} else if (c.type === 'date') {
			if (valeur > aujourdhuiIso()) {
				erreurs[c.cle] = `${c.libelle} ne peut pas être dans le futur.`;
			} else if (c.eleveChamp === 'dateInscription' && valeur <= eleve.dateNaissance) {
				erreurs[c.cle] = `${c.libelle} doit être postérieure à la date de naissance.`;
			}
		}
	}
	return erreurs;
}

/** N'envoie que les champs renseignés (un champ facultatif vide est simplement omis). */
export function construireChampsSaisis(
	champs: ChampDocument[],
	valeurs: ValeursDocument
): Record<string, string> {
	const saisis: Record<string, string> = {};
	for (const c of champs) {
		const valeur = (valeurs[c.cle] ?? '').trim();
		if (valeur) saisis[c.cle] = valeur;
	}
	return saisis;
}

const PREFIXE_CHAMP = 'champsSaisis.';

/** `champsSaisis.classe` → `classe` ; `null` si l'erreur ne porte pas sur un champ saisi. */
export function cleChampSaisi(champApi: string): string | null {
	return champApi.startsWith(PREFIXE_CHAMP) ? champApi.slice(PREFIXE_CHAMP.length) : null;
}
