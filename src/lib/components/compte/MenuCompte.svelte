<script lang="ts">
	import { tick } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import { URL_AIDE } from '$lib/constants/aide';
	import { session } from '$lib/stores/session.svelte';
	import { seDeconnecter } from '$lib/utils/deconnexion';

	const MENU_ID = 'menu-compte';

	let ouvert = $state(false);
	let deconnexionEnCours = $state(false);
	let conteneur: HTMLDivElement;
	let bouton: HTMLButtonElement;
	let menu = $state<HTMLDivElement>();

	const utilisateur = $derived(session.utilisateur);
	const etablissement = $derived(session.etablissement);

	/** `nomAffiche` et `initiales` viennent de l'API ; repli local si la session date d'avant leur ajout. */
	const nom = $derived(utilisateur?.nomAffiche ?? utilisateur?.nomComplet ?? '');
	const initiales = $derived(
		utilisateur?.initiales ??
			nom
				.trim()
				.split(/\s+/)
				.slice(0, 2)
				.map((m) => m[0] ?? '')
				.join('')
				.toUpperCase()
	);
	const libelleBouton = $derived(
		utilisateur ? `Compte : ${nom}${etablissement ? `, ${etablissement.nom}` : ''}` : 'Compte'
	);

	const elements = () =>
		menu ? Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]')) : [];

	async function ouvrir() {
		ouvert = true;
		await tick();
		elements()[0]?.focus();
	}

	function fermer(rendreFocus = false) {
		if (!ouvert) return;
		ouvert = false;
		if (rendreFocus) bouton?.focus();
	}

	function clavier(e: KeyboardEvent) {
		const liste = elements();
		const i = liste.indexOf(document.activeElement as HTMLElement);
		if (e.key === 'Escape') {
			e.preventDefault();
			fermer(true);
		} else if (e.key === 'Tab') {
			fermer(false);
		} else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
			e.preventDefault();
			const cible =
				e.key === 'Home'
					? 0
					: e.key === 'End'
						? liste.length - 1
						: (i + (e.key === 'ArrowDown' ? 1 : -1) + liste.length) % liste.length;
			liste[cible]?.focus();
		}
	}

	function clicExterieur(e: PointerEvent) {
		if (ouvert && !conteneur.contains(e.target as Node)) fermer(false);
	}

	async function deconnecter() {
		if (deconnexionEnCours) return;
		deconnexionEnCours = true;
		// Le menu reste ouvert (entrée « en cours ») jusqu'à la redirection : pas de double clic possible.
		await seDeconnecter();
		deconnexionEnCours = false;
	}

	// Un changement de page referme le menu.
	$effect(() => {
		void page.url.pathname;
		ouvert = false;
	});
</script>

<svelte:window onpointerdown={clicExterieur} onresize={() => fermer(false)} />

<div class="acct" bind:this={conteneur}>
	<button
		bind:this={bouton}
		class="avatar"
		type="button"
		aria-haspopup="menu"
		aria-expanded={ouvert}
		aria-controls={MENU_ID}
		aria-label={libelleBouton}
		onclick={() => (ouvert ? fermer(true) : void ouvrir())}
	>
		{initiales}
	</button>

	{#if ouvert && utilisateur}
		<div
			bind:this={menu}
			id={MENU_ID}
			class="acct-menu"
			role="menu"
			aria-label="Menu du compte"
			tabindex="-1"
			onkeydown={clavier}
		>
			<div class="acct-id">
				<div class="avatar" aria-hidden="true">{initiales}</div>
				<div>
					<b>{nom}</b>
					<span>{utilisateur.email}</span>
				</div>
			</div>
			<hr />
			<a href={resolve('/profil')} role="menuitem" onclick={() => fermer(false)}>
				<Icon name="user" />Mon profil
			</a>
			<a href={resolve('/parametres')} role="menuitem" onclick={() => fermer(false)}>
				<Icon name="sliders" />Paramètres de l’établissement
			</a>
			<!-- eslint-disable svelte/no-navigation-without-resolve -- lien externe (mailto: ou page d'aide hors application) -->
			<a
				href={URL_AIDE}
				role="menuitem"
				target={URL_AIDE.startsWith('mailto:') ? undefined : '_blank'}
				rel="noopener noreferrer"
				onclick={() => fermer(false)}
			>
				<Icon name="help" />Aide et assistance
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
			<hr />
			<button
				type="button"
				role="menuitem"
				class="danger"
				aria-busy={deconnexionEnCours}
				onclick={deconnecter}
			>
				<Icon name="logout" />{deconnexionEnCours ? 'Déconnexion…' : 'Se déconnecter'}
			</button>
		</div>
	{/if}
</div>
