import { api } from './client';
import type { CorpsDocument, DocumentCree, TypeDocument } from '$lib/types';

/**
 * Un point d'appel par route de docs/API_DOCUMENTS.md. Toutes protégées : le
 * `token` est à fournir par l'appelant (voir `session.requeteAuthentifiee`).
 */
export const documentsApi = {
	// §4
	listerTypes: (token: string, signal?: AbortSignal) =>
		api.get<TypeDocument[]>('/types-documents', { token, signal }),

	// §5 — renvoie le vrai PDF filigrané « APERÇU » (aucun effet de bord côté API)
	apercu: (token: string, corps: CorpsDocument) =>
		api.postBlob('/documents/apercu', corps, { token }),

	// §6 — `cleIdempotence` : UUID généré une fois à l'ouverture de l'étape 2.
	// Un rejeu avec la même clé renvoie le document déjà créé (jamais de doublon).
	generer: (token: string, corps: CorpsDocument, cleIdempotence: string) =>
		api.post<DocumentCree>('/documents', corps, {
			token,
			headers: { 'Idempotency-Key': cleIdempotence }
		}),

	// §7 — lien signé (1 h) : à demander à chaque clic, jamais conservé
	lienTelechargement: (token: string, id: string) =>
		api.get<{ url: string }>(`/documents/${encodeURIComponent(id)}/telechargement`, { token })
};
