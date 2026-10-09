import { api } from './client';
import type {
	CompteurNotifications,
	ListeNotificationsParams,
	Notification,
	NotificationsPage,
	ToutLireReponse
} from '$lib/types';

/**
 * Un point d'appel par route de docs/API_NOTIFICATIONS.md. Toutes protégées :
 * le `token` est à fournir par l'appelant (voir `session.requeteAuthentifiee`).
 * Chacun ne voit et ne modifie que SES notifications ; il n'existe aucune
 * route de création.
 */
export const notificationsApi = {
	// §4 — un paramètre vide n'est jamais envoyé (= « pas de filtre »)
	lister: (token: string, params: ListeNotificationsParams = {}, signal?: AbortSignal) => {
		const query = new URLSearchParams();
		if (params.statut === 'non_lues') query.set('statut', 'non_lues');
		if (params.categorie) query.set('categorie', params.categorie);
		if (params.limite) query.set('limite', String(params.limite));
		if (params.curseur) query.set('curseur', params.curseur);
		const qs = query.toString();
		return api.get<NotificationsPage>(`/notifications${qs ? `?${qs}` : ''}`, { token, signal });
	},

	// §5 — un simple COUNT sur index, fait pour le polling
	compteur: (token: string, signal?: AbortSignal) =>
		api.get<CompteurNotifications>('/notifications/non-lues/compteur', { token, signal }),

	// §6 — idempotent, sans corps
	marquerLue: (token: string, id: string) =>
		api.patch<Notification>(`/notifications/${encodeURIComponent(id)}/lue`, undefined, { token }),
	marquerNonLue: (token: string, id: string) =>
		api.patch<Notification>(`/notifications/${encodeURIComponent(id)}/non-lue`, undefined, {
			token
		}),

	// §7 — atomique ; `nonLues` fait foi pour le badge
	toutLire: (token: string) =>
		api.post<ToutLireReponse>('/notifications/tout-lire', undefined, { token }),

	// §8 — suppression définitive (la maquette ne la montre pas : non branchée dans l'UI)
	supprimer: (token: string, id: string) =>
		api.delete<void>(`/notifications/${encodeURIComponent(id)}`, { token })
};
