import { api } from './client';
import type {
	AuthReponse,
	ChangerMotDePassePayload,
	ConnexionPayload,
	InscriptionPayload,
	InscriptionReponse,
	MessageReponse,
	MoiReponse,
	NotificationsPayload,
	ProfilUpdatePayload,
	ResetTokenReponse,
	Utilisateur
} from '$lib/types';

/**
 * Un point d'appel par route de docs/API_AUTH.md, avec les mêmes noms.
 * Les pages ne doivent jamais appeler `api.post(...)` directement pour
 * l'auth : elles passent par ces fonctions, pour que le contrat (payload,
 * réponse, chemin) ne vive qu'à un seul endroit.
 */
export const authApi = {
	// §1
	inscrire: (payload: InscriptionPayload) =>
		api.post<InscriptionReponse>('/auth/inscription', payload),

	// §2
	verifierActivation: (email: string, code: string) =>
		api.post<AuthReponse>('/auth/activation/verifier', { email, code }),

	// §3
	renvoyerActivation: (email: string) =>
		api.post<MessageReponse>('/auth/activation/renvoyer', { email }),

	// §4
	connexion: (payload: ConnexionPayload) => api.post<AuthReponse>('/auth/connexion', payload),

	// §5
	motDePasseOublie: (email: string) =>
		api.post<MessageReponse>('/auth/mot-de-passe-oublie', { email }),

	// §6
	verifierCodeReinitialisation: (email: string, code: string) =>
		api.post<ResetTokenReponse>('/auth/mot-de-passe-oublie/verifier', { email, code }),

	// §7
	reinitialiserMotDePasse: (
		resetToken: string,
		nouveauMotDePasse: string,
		confirmationMotDePasse: string
	) =>
		api.post<MessageReponse>('/auth/mot-de-passe-oublie/reinitialiser', {
			resetToken,
			nouveauMotDePasse,
			confirmationMotDePasse
		}),

	// §8
	rafraichir: (refreshToken: string) => api.post<AuthReponse>('/auth/rafraichir', { refreshToken }),

	// §9 — 🔒 authentifié
	mettreAJourProfil: (token: string, payload: ProfilUpdatePayload) =>
		api.patch<Utilisateur>('/auth/profil', payload, { token }),

	// §10 — 🔒 authentifié
	changerMotDePasse: (token: string, payload: ChangerMotDePassePayload) =>
		api.patch<MessageReponse>('/auth/mot-de-passe', payload, { token }),

	// §11 — 🔒 authentifié
	mettreAJourNotifications: (token: string, payload: NotificationsPayload) =>
		api.patch<Utilisateur>('/auth/notifications', payload, { token }),

	// §12 — 🔒 authentifié
	moi: (token: string, signal?: AbortSignal) => api.get<MoiReponse>('/auth/moi', { token, signal }),

	// §13 — répond 204 toujours, même avec un jeton expiré ou absent : `token` est donc facultatif.
	deconnexion: (token: string | null, refreshToken: string | null, signal?: AbortSignal) =>
		api.post<void>('/auth/deconnexion', refreshToken ? { refreshToken } : undefined, {
			token: token ?? undefined,
			signal
		})
};
