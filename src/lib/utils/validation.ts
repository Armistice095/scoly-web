export function emailValide(valeur: string): boolean {
	return /^\S+@\S+\.\S+$/.test(valeur.trim());
}

export interface ReglesMotDePasse {
	longueur: boolean;
	majuscule: boolean;
	chiffre: boolean;
}

/** Règle affichée sous le champ mot de passe : 8 caractères min, une majuscule, un chiffre. */
export function evaluerMotDePasse(valeur: string): ReglesMotDePasse {
	return {
		longueur: valeur.length >= 8,
		majuscule: /[A-Z]/.test(valeur),
		chiffre: /\d/.test(valeur)
	};
}

export function motDePasseValide(valeur: string): boolean {
	const regles = evaluerMotDePasse(valeur);
	return regles.longueur && regles.majuscule && regles.chiffre;
}
