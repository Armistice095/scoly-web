import { api } from './client';
import type {
	AnneeScolaire,
	AnneeScolairePayload,
	EnteteParDefaut,
	Etablissement,
	EtablissementUpdatePayload,
	OrdreEnseignement,
	TypeImageEtablissement
} from '$lib/types';

/**
 * Un point d'appel par route de docs/API_ETABLISSEMENT.md, avec les mêmes
 * noms. Toutes protégées : le `token` (accessToken courant) est à fournir
 * par l'appelant — voir `session.requeteAuthentifiee` dans
 * `lib/stores/session.svelte.ts`, qui l'injecte et rejoue l'appel une fois
 * en cas de `401` (accessToken expiré).
 */
export const etablissementApi = {
	// §1
	consulter: (token: string) => api.get<Etablissement>('/etablissement', { token }),

	// §2 — 🔒 Directeur
	mettreAJour: (token: string, payload: EtablissementUpdatePayload) =>
		api.patch<Etablissement>('/etablissement', payload, { token }),

	// §3 — 🔒 Directeur
	televerserImage: (token: string, type: TypeImageEtablissement, fichier: File) =>
		api.upload<Etablissement>(`/etablissement/images/${type}`, fichier, { token }),

	// §5.1 — aperçu de l'en-tête officiel, sans rien enregistrer
	enteteParDefaut: (token: string, ordreEnseignement: OrdreEnseignement, departement: string) =>
		api.get<EnteteParDefaut>(
			`/etablissement/entete-par-defaut?${new URLSearchParams({ ordreEnseignement, departement })}`,
			{ token }
		),

	// §4.1
	listerAnneesScolaires: (token: string) =>
		api.get<AnneeScolaire[]>('/etablissement/annees-scolaires', { token }),

	// §4.2 — 🔒 Directeur
	creerAnneeScolaire: (token: string, payload: AnneeScolairePayload) =>
		api.post<AnneeScolaire>('/etablissement/annees-scolaires', payload, { token }),

	// §4.3 — 🔒 Directeur
	modifierAnneeScolaire: (token: string, id: string, payload: Partial<AnneeScolairePayload>) =>
		api.patch<AnneeScolaire>(`/etablissement/annees-scolaires/${id}`, payload, { token }),

	// §4.4 — 🔒 Directeur
	activerAnneeScolaire: (token: string, id: string) =>
		api.patch<Etablissement>(`/etablissement/annees-scolaires/${id}/activer`, undefined, { token })
};
