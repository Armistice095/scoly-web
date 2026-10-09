import { api } from './client';
import type {
	AccepterInvitationPayload,
	AuthReponse,
	InvitationInfo,
	InviterMembrePayload,
	MembreEquipe,
	MessageReponse
} from '$lib/types';

/**
 * `/equipe` : réservé au Directeur, authentifié. Le `token` (accessToken
 * courant) est à fournir par l'appelant — voir `session.requeteAuthentifiee`.
 */
export const equipeApi = {
	// §1
	lister: (token: string) => api.get<MembreEquipe[]>('/equipe', { token }),

	// §2
	inviter: (token: string, payload: InviterMembrePayload) =>
		api.post<MembreEquipe>('/equipe/inviter', payload, { token }),

	// §3
	renvoyerInvitation: (token: string, id: string) =>
		api.post<MessageReponse>(`/equipe/${id}/renvoyer-invitation`, undefined, { token }),

	// §4
	desactiver: (token: string, id: string) =>
		api.patch<MembreEquipe>(`/equipe/${id}/desactiver`, undefined, { token }),
	reactiver: (token: string, id: string) =>
		api.patch<MembreEquipe>(`/equipe/${id}/reactiver`, undefined, { token })
};

/**
 * `/invitation` : public, aucune authentification — utilisé sur la page que
 * la personne invitée ouvre depuis le lien reçu par e-mail.
 */
export const invitationApi = {
	// §5
	consulter: (id: string, jeton: string) =>
		api.get<InvitationInfo>(
			`/invitation?id=${encodeURIComponent(id)}&token=${encodeURIComponent(jeton)}`
		),

	// §6
	accepter: (payload: AccepterInvitationPayload) =>
		api.post<AuthReponse>('/invitation/accepter', payload)
};
