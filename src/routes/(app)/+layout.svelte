<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Logo from '$lib/components/Logo.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import MenuCompte from '$lib/components/compte/MenuCompte.svelte';
	import NotificationBell from '$lib/components/notifications/NotificationBell.svelte';
	import { authApi } from '$lib/api/auth';
	import { monter } from '$lib/motion';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { session } from '$lib/stores/session.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { deconnexionEnCours, purgerEtatLocal } from '$lib/utils/deconnexion';

	let { children } = $props();

	const liensNav = [
		{ href: resolve('/eleves'), label: 'Élèves' },
		{ href: resolve('/documents'), label: 'Documents' },
		{ href: resolve('/archives'), label: 'Archives' },
		{ href: resolve('/parametres'), label: 'Paramètres' }
	];

	// Garde d'authentification : si aucun accessToken en mémoire, on tente une
	// restauration silencieuse via le refresh token stocké (§8) avant de
	// rediriger vers /connexion. `verifie` évite un flash du contenu protégé
	// pendant cette vérification.
	let verifie = $state(false);

	// Perte de session subie (refresh refusé, 401 persistant), quel que soit l'écran ou l'appel
	// qui la détecte : on purge tout, on prévient une fois, on renvoie vers la connexion.
	onMount(() => {
		let redirection = false;
		const retirer = session.surPerteDeSession(() => {
			// Une déconnexion voulue gère elle-même purge et redirection.
			if (deconnexionEnCours() || redirection) return;
			redirection = true;
			purgerEtatLocal();
			toast.afficher('Votre session a expiré. Veuillez vous reconnecter.');
			void goto(resolve('/connexion'), { replaceState: true });
		});
		return () => {
			retirer();
			notifications.arreterPolling();
		};
	});

	onMount(async () => {
		if (!session.estConnecte && !(await session.tenterRestauration())) {
			await goto(resolve('/connexion'));
			return;
		}
		verifie = true;
		notifications.demarrerPolling();
		void actualiserCompte();
	});

	/** `GET /auth/moi` au démarrage (API_AUTH.md §12) : nom, e-mail et initiales du menu de l'avatar. */
	async function actualiserCompte() {
		try {
			const moi = await session.requeteAuthentifiee((token) => authApi.moi(token));
			session.mettreAJourUtilisateur(moi.utilisateur);
			session.mettreAJourEtablissement({ ...session.etablissement, ...moi.etablissement });
		} catch {
			// Silencieux : la session issue de la connexion/du rafraîchissement contient déjà ces données.
		}
	}

	let menuOuvert = $state(false);

	function fermerMenu() {
		menuOuvert = false;
	}

	// Le CSS du menu mobile (voir design-system.css) cible `body.menu-open`
	// pour afficher le panneau de nav et le scrim par-dessus toute la page.
	$effect(() => {
		document.body.classList.toggle('menu-open', menuOuvert);
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') fermerMenu();
	}}
/>

{#if verifie}
	<header class="topbar">
		<a class="brand" href={resolve('/documents')} aria-label="Scoly, accueil">
			<Logo height={40} />
		</a>
		<nav class="nav" id="nav" aria-label="Navigation principale">
			{#each liensNav as lien (lien.href)}
				<a
					href={lien.href}
					aria-current={page.url.pathname.startsWith(lien.href) ? 'page' : undefined}
					onclick={fermerMenu}
				>
					{lien.label}
				</a>
			{/each}
		</nav>
		<div class="actions">
			<NotificationBell />
			<MenuCompte />
			<button
				class="round menu-btn"
				aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
				aria-expanded={menuOuvert}
				aria-controls="nav"
				onclick={() => (menuOuvert = !menuOuvert)}
			>
				<Icon name={menuOuvert ? 'close' : 'menu'} />
			</button>
		</div>
	</header>

	<div class="shell">
		<div class="scrim" role="presentation" onclick={fermerMenu}></div>
		<main class="app-main">
			<!-- Clé = chemin seul : changer de page rejoue l'entrée, pas les paramètres d'URL (?q=, ?eleve=). -->
			{#key page.url.pathname}
				<div in:monter={{ y: 8 }}>
					{@render children()}
				</div>
			{/key}
		</main>
	</div>
{/if}
