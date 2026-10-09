import type { Handle } from '@sveltejs/kit';

/**
 * En-têtes de sécurité sur les pages rendues par le Worker. (Le fichier `_headers` de Cloudflare
 * ne s'applique qu'aux fichiers statiques, pas à ces réponses : d'où ce hook.)
 *
 * Pas de Content-Security-Policy ici : elle doit être testée avec le visionneur PDF et l'API
 * avant d'être imposée (voir README).
 */
export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set('Strict-Transport-Security', 'max-age=31536000');
	return response;
};
