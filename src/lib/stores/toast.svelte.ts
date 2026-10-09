let message = $state<string | null>(null);
let minuteur: ReturnType<typeof setTimeout> | undefined;

function afficher(texte: string, dureeMs = 3500) {
	message = texte;
	clearTimeout(minuteur);
	minuteur = setTimeout(() => {
		message = null;
	}, dureeMs);
}

export const toast = {
	get message() {
		return message;
	},
	afficher
};
