import { goto } from '$app/navigation';
import { notifications } from '$lib/stores/notifications.svelte';
import type { Notification } from '$lib/types';
import { routeDeLaCible } from '$lib/utils/notifications';

/**
 * Clic sur une notification : on la marque comme lue (mise à jour optimiste, annulée
 * avec un message si l'API refuse) puis on redirige vers l'objet lié, sans attendre
 * la réponse. Sans cible (`cible: null`), on marque seulement comme lue.
 */
export async function ouvrirNotification(notification: Notification): Promise<void> {
	const route = routeDeLaCible(notification);
	const marquage = notification.lue
		? Promise.resolve(true)
		: notifications.definirLecture(notification.id, true);
	if (route) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- la route est construite avec resolve() dans routeDeLaCible
		await goto(route);
	}
	await marquage;
}
