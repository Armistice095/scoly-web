import { api } from './client';
import type {
	Eleve,
	EleveDetail,
	ElevePayload,
	ElevesPage,
	ImportElevesReponse,
	ListeElevesParams
} from '$lib/types';

/**
 * Un point d'appel par route de docs/API_ELEVES.md. Toutes protégées : le
 * `token` (accessToken courant) est à fournir par l'appelant — voir
 * `session.requeteAuthentifiee`, qui l'injecte et rejoue l'appel une fois en
 * cas de `401`.
 */
export const elevesApi = {
	// §1
	lister: (token: string, params: ListeElevesParams = {}, signal?: AbortSignal) => {
		const query = new URLSearchParams();
		if (params.search) query.set('search', params.search);
		if (params.statut) query.set('statut', params.statut);
		if (params.page) query.set('page', String(params.page));
		if (params.limit) query.set('limit', String(params.limit));
		const qs = query.toString();
		return api.get<ElevesPage>(`/eleves${qs ? `?${qs}` : ''}`, { token, signal });
	},

	// §2
	creer: (token: string, payload: ElevePayload) => api.post<Eleve>('/eleves', payload, { token }),

	// §3
	consulter: (token: string, id: string, signal?: AbortSignal) =>
		api.get<EleveDetail>(`/eleves/${encodeURIComponent(id)}`, { token, signal }),

	// §4 — mise à jour partielle : n'envoyer que les champs modifiés
	modifier: (token: string, id: string, payload: ElevePayload) =>
		api.patch<Eleve>(`/eleves/${encodeURIComponent(id)}`, payload, { token }),

	// §5
	telechargerModeleImport: (token: string) => api.telecharger('/eleves/import/modele', { token }),

	// §6 — champ multipart `fichier`, .xlsx uniquement, tout ou rien
	importer: (token: string, fichier: File) =>
		api.upload<ImportElevesReponse>('/eleves/import', fichier, { token })
};
