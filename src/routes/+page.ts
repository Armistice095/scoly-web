import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Redirige systématiquement vers /connexion : c'est cette page (via
// session.tenterRestauration, voir lib/stores/session.svelte.ts) qui décide
// si l'utilisateur est déjà connecté et le renvoie vers /documents.
export const load: PageLoad = () => {
	redirect(307, '/connexion');
};
