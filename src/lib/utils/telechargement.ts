/** Déclenche l'enregistrement d'un `Blob` (le `<a href>` n'enverrait pas le Bearer token). */
export function enregistrerFichier(blob: Blob, nomFichier: string): void {
	const url = URL.createObjectURL(blob);
	const lien = document.createElement('a');
	lien.href = url;
	lien.download = nomFichier;
	document.body.appendChild(lien);
	lien.click();
	lien.remove();
	// Laisse au navigateur le temps de démarrer le téléchargement.
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Nom de fichier sûr pour tous les systèmes : sans accents ni caractères interdits. */
export function nomFichierPdf(...morceaux: string[]): string {
	const base = morceaux
		.join(' - ')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[\\/:*?"<>|]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	return `${base || 'document'}.pdf`;
}

/**
 * Lance le téléchargement d'un lien signé du stockage. Sans indication, le
 * navigateur ouvre le PDF dans son lecteur : un `<a download>` est ignoré pour
 * une URL d'un autre domaine. Le stockage (Supabase) force l'enregistrement du
 * fichier quand l'URL porte le paramètre `download=<nom>` ; ce paramètre n'entre
 * pas dans la signature, on peut donc l'ajouter ici.
 */
export function lancerTelechargement(urlSignee: string, nomFichier: string): void {
	// Si l'API a déjà demandé le téléchargement dans le lien, on ne le modifie pas.
	if (/[?&]download=/.test(urlSignee)) {
		window.location.assign(urlSignee);
		return;
	}
	const separateur = urlSignee.includes('?') ? '&' : '?';
	window.location.assign(`${urlSignee}${separateur}download=${encodeURIComponent(nomFichier)}`);
}
