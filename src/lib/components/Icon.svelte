<script lang="ts">
	// Icônes issues des maquettes (traits type "lucide-like", strokeWidth 1.5).
	// Ajouter ici au fur et à mesure des écrans implémentés.
	const paths: Record<string, string> = {
		menu: 'M4 7h16M4 12h16M4 17h16',
		close: 'M6 6l12 12M18 6L6 18',
		plus: 'M12 5v14M5 12h14',
		upload: 'M12 16V5M7 10l5-5 5 5M5 19h14',
		bell: 'M6 16V11a6 6 0 1112 0v5l1.5 2h-15z M10 21h4',
		dots: 'M5 12h.01M12 12h.01M19 12h.01',
		trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
		eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z',
		eyeoff:
			'M3 3l18 18M10.6 6.2A9.8 9.8 0 0112 6c6.5 0 10 6 10 6a17 17 0 01-3.2 3.9M6.6 7.6C3.8 9.4 2 12 2 12s3.5 6 10 6c1.5 0 2.8-.3 4-.8M9.9 9.9a3 3 0 004.2 4.2',
		search: 'M4.5 11a6.5 6.5 0 1 0 13 0 6.5 6.5 0 1 0-13 0M16 16l4 4',
		edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
		doc: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6',
		arrow: 'M5 12h14M13 6l6 6-6 6',
		back: 'M19 12H5M11 6l-6 6 6 6',
		cap: 'M2 9l10-5 10 5-10 5zM6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5',
		check: 'M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 12l3 3 5-6',
		id: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM7 11a2 2 0 1 0 4 0 2 2 0 1 0-4 0M6 16c.5-1.5 1.5-2 3-2s2.5.5 3 2M15 10h3M15 14h3',
		swap: 'M4 8h14l-3-3M20 16H6l3 3',
		checkmark: 'M5 13l4 4L19 7',
		download: 'M12 4v11M8 11l4 4 4-4M5 19h14',
		cancel: 'M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M5.6 5.6l12.8 12.8',
		sort: 'M12 5v14M6 13l6 6 6-6',
		// Vérification publique des documents
		shield: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM8.5 12l2.5 2.5 4.5-5',
		circlex: 'M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M9 9l6 6M15 9l-6 6',
		help: 'M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M9.5 9.5a2.5 2.5 0 1 1 5 0c0 1.5-2.5 2-2.5 3.5M12 17h.01',
		qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M18 18h2',
		info: 'M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 11v5M12 8h.01',
		warn: 'M12 4l9 16H3zM12 10v4M12 17h.01',
		// Notifications et menu du compte (maquettes « Centre de notifications »)
		notifDocument:
			'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 8h6M9 12h6M9 16h3',
		notifDocumentAnnule:
			'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9.5 9.5l5 5M14.5 9.5l-5 5',
		user: 'M8 8a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 21a8 8 0 0116 0',
		sliders:
			'M4 7h10M18 7h2M4 17h2M10 17h10M14 7a2 2 0 1 0 4 0 2 2 0 1 0-4 0M6 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
		logout: 'M10 4H5v16h5M15 8l4 4-4 4M19 12H9',
		// Rendu spécialement ci-dessous (rect + path) : la valeur n'est pas utilisée.
		mail: ''
	};

	interface Props {
		name: keyof typeof paths;
		class?: string;
	}

	let { name, class: className = 'i' }: Props = $props();
</script>

{#if name === 'eye' || name === 'bell' || name === 'mail'}
	<svg class={className} viewBox="0 0 24 24" aria-hidden="true">
		{#if name === 'bell'}
			<path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15z" />
			<path d="M10 21h4" />
		{:else if name === 'mail'}
			<rect x="3" y="5" width="18" height="14" rx="2" />
			<path d="M3 7l9 6 9-6" />
		{:else}
			<path d={paths[name]} />
			<circle cx="12" cy="12" r="3" />
		{/if}
	</svg>
{:else}
	<svg class={className} viewBox="0 0 24 24" aria-hidden="true">
		<path d={paths[name]} />
	</svg>
{/if}
