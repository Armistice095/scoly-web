<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { Notification } from '$lib/types';
	import {
		dateHeureAttribut,
		formaterTempsRelatif,
		ICONE_NOTIFICATION
	} from '$lib/utils/notifications';

	interface Props {
		notification: Notification;
		/** `now` : horloge partagée, pour que toutes les lignes affichent le même « maintenant ». */
		maintenant: Date;
		onclick: () => void;
		/** Attribut `data-*` pour retrouver la ligne (focus au clavier). */
		identifiant?: string;
	}

	let { notification, maintenant, onclick, identifiant }: Props = $props();

	const temps = $derived(
		formaterTempsRelatif(notification.createdAt, notification.groupe, maintenant)
	);
</script>

<button
	type="button"
	class={['nt', !notification.lue && 'unread']}
	data-notif={identifiant ?? notification.id}
	{onclick}
>
	<span class="nt-ic"><Icon name={ICONE_NOTIFICATION[notification.type]} /></span>
	<span class="nt-tx">
		<b>{notification.titre}</b>
		<span>{notification.message}</span>
		<time datetime={dateHeureAttribut(notification.createdAt)}>{temps}</time>
	</span>
	{#if !notification.lue}
		<span class="nt-u" role="img" aria-label="Non lue"></span>
	{/if}
</button>
