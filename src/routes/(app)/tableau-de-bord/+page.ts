import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Le tableau de bord a été retiré : l'écran principal est « Documents ».
// Cette redirection garde fonctionnels les anciens favoris et liens.
export const load: PageLoad = () => {
	redirect(307, '/documents');
};
