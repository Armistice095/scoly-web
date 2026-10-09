import { api, type FichierTelecharge } from './client';
import type { ArchiveFiche, ArchivesPage, ListeArchivesParams } from '$lib/types';

/**
 * Un point d'appel par route de docs/API_ARCHIVES.md. Toutes protégées : le
 * `token` est à fournir par l'appelant (voir `session.requeteAuthentifiee`).
 * Il n'existe aucune route de suppression, de modification ou de réactivation.
 */
export const archivesApi = {
	// §3 — un paramètre vide n'est jamais envoyé (= « pas de filtre »)
	lister: (token: string, params: ListeArchivesParams = {}, signal?: AbortSignal) => {
		const query = new URLSearchParams();
		if (params.search) query.set('search', params.search);
		if (params.typeDocumentId) query.set('typeDocumentId', params.typeDocumentId);
		if (params.statut) query.set('statut', params.statut);
		if (params.eleveId) query.set('eleveId', params.eleveId);
		if (params.tri && params.tri !== 'recent') query.set('tri', params.tri);
		if (params.page && params.page > 1) query.set('page', String(params.page));
		if (params.limit) query.set('limit', String(params.limit));
		const qs = query.toString();
		return api.get<ArchivesPage>(`/archives${qs ? `?${qs}` : ''}`, { token, signal });
	},

	// §4
	consulter: (token: string, id: string, signal?: AbortSignal) =>
		api.get<ArchiveFiche>(`/archives/${encodeURIComponent(id)}`, { token, signal }),

	// §5 — définitif ; renvoie la fiche à jour. L'auteur et la date viennent du serveur.
	annuler: (token: string, id: string, motif: string) =>
		api.post<ArchiveFiche>(`/archives/${encodeURIComponent(id)}/annulation`, { motif }, { token }),

	// §6 — lien signé (1 h), journalisé : à demander à chaque clic, jamais conservé
	lienTelechargement: (token: string, id: string) =>
		api.get<{ url: string }>(`/archives/${encodeURIComponent(id)}/telechargement`, { token }),

	// §7 — le PDF lui-même (flux), non journalisé, disponible aussi pour un document annulé
	apercu: (token: string, id: string, signal?: AbortSignal): Promise<FichierTelecharge> =>
		api.telecharger(`/archives/${encodeURIComponent(id)}/apercu`, { token, signal })
};
