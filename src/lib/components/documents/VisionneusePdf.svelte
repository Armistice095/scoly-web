<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
	import Icon from '$lib/components/Icon.svelte';
	import { DUREE, duree } from '$lib/motion';
	import FeuilleFantome from './FeuilleFantome.svelte';

	interface Props {
		/** URL `blob:` du PDF à afficher. */
		urlPdf: string;
	}

	let { urlPdf }: Props = $props();

	/**
	 * Affiche le PDF comme une « feuille » : la page est dessinée dans un canvas
	 * (pdf.js) et mise à l'échelle pour tenir en entier dans la zone, sans barre
	 * d'outils ni défilement. Le lecteur PDF intégré au navigateur ne permet ni
	 * l'un ni l'autre de façon fiable (et ne s'affiche pas sur mobile).
	 */

	let zone: HTMLDivElement;
	let canvas: HTMLCanvasElement;

	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');
	let pageCourante = $state(1);
	let nombrePages = $state(0);

	let pdf: PDFDocumentProxy | null = null;
	let chargementPdf: PDFDocumentLoadingTask | null = null;
	let rendu: RenderTask | null = null;
	let detruit = false;
	let image = 0; // identifiant de la demande de rendu la plus récente

	async function dessiner() {
		if (!pdf || !canvas) return;
		const moi = ++image;

		// Une seule opération de rendu à la fois sur le même canvas.
		if (rendu) {
			rendu.cancel();
			await rendu.promise.catch(() => {});
			rendu = null;
		}
		if (moi !== image || detruit) return;

		const page = await pdf.getPage(pageCourante);
		const { clientWidth: largeur, clientHeight: hauteur } = zone;
		if (moi !== image || detruit || largeur === 0 || hauteur === 0) return;

		const base = page.getViewport({ scale: 1 });
		const echelle = Math.min(largeur / base.width, hauteur / base.height);
		const ratio = window.devicePixelRatio || 1;
		const viewport = page.getViewport({ scale: echelle * ratio });

		canvas.width = Math.floor(viewport.width);
		canvas.height = Math.floor(viewport.height);
		canvas.style.width = `${Math.floor(viewport.width / ratio)}px`;
		canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;

		const tache = page.render({ canvas, viewport });
		rendu = tache;
		try {
			await tache.promise;
		} catch (e) {
			if ((e as Error)?.name === 'RenderingCancelledException') return;
			throw e;
		}
	}

	async function allerA(numero: number) {
		if (numero < 1 || numero > nombrePages || numero === pageCourante) return;
		pageCourante = numero;
		await dessiner();
	}

	onMount(() => {
		let cadre = 0;
		const observateur = new ResizeObserver(() => {
			// Un seul redessin par image d'écran pendant un redimensionnement.
			cancelAnimationFrame(cadre);
			cadre = requestAnimationFrame(() => void dessiner().catch(() => {}));
		});

		void (async () => {
			try {
				// Chargés à la demande : pdf.js est lourd et n'est utile qu'à l'aperçu (et inutilisable côté serveur).
				const [pdfjs, worker] = await Promise.all([
					import('pdfjs-dist'),
					import('pdfjs-dist/build/pdf.worker.min.mjs?url')
				]);
				pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

				const reponse = await fetch(urlPdf);
				const donnees = new Uint8Array(await reponse.arrayBuffer());
				chargementPdf = pdfjs.getDocument({ data: donnees });
				const document = await chargementPdf.promise;
				if (detruit) return;
				pdf = document;
				nombrePages = document.numPages;
				// Première page dessinée AVANT d'afficher : le canvas apparaît en fondu, déjà rempli.
				await dessiner();
				etat = 'pret';
				observateur.observe(zone);
			} catch {
				if (!detruit) etat = 'erreur';
			}
		})();

		return () => {
			detruit = true;
			cancelAnimationFrame(cadre);
			observateur.disconnect();
			rendu?.cancel();
			void chargementPdf?.destroy();
		};
	});
</script>

<div class="scene" aria-busy={etat === 'chargement'}>
	<div
		class="zone"
		bind:this={zone}
		role="img"
		aria-label={`Aperçu du document, page ${pageCourante} sur ${nombrePages}`}
	>
		<canvas bind:this={canvas} class:cache={etat !== 'pret'} aria-hidden="true"></canvas>
	</div>

	{#if etat === 'chargement'}
		<div class="fantome" out:fade={{ duration: duree(DUREE.normal) }}>
			<FeuilleFantome />
		</div>
	{:else if etat === 'erreur'}
		<div class="etat" role="alert">
			<p>L'aperçu n'a pas pu s'afficher.</p>
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- URL blob: locale, pas une route -->
			<a href={urlPdf} target="_blank" rel="noopener">Ouvrir le PDF dans un nouvel onglet</a>
		</div>
	{/if}

	{#if etat === 'pret' && nombrePages > 1}
		<div class="pages">
			<button
				type="button"
				class="nav"
				aria-label="Page précédente"
				disabled={pageCourante <= 1}
				onclick={() => allerA(pageCourante - 1)}
			>
				<Icon name="back" />
			</button>
			<span>Page {pageCourante} / {nombrePages}</span>
			<button
				type="button"
				class="nav"
				aria-label="Page suivante"
				disabled={pageCourante >= nombrePages}
				onclick={() => allerA(pageCourante + 1)}
			>
				<Icon name="arrow" />
			</button>
		</div>
	{/if}
</div>

<style>
	.scene {
		position: relative;
		/* La page entière doit tenir sans défilement : la hauteur suit celle de la fenêtre. */
		height: clamp(320px, calc(100dvh - 300px), 820px);
		background: var(--sunken);
		border: 1px solid var(--line);
		border-radius: var(--r-md);
	}
	.zone {
		position: absolute;
		inset: 16px 16px 16px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.scene:has(.pages) .zone {
		bottom: 52px;
	}
	canvas {
		display: block;
		background: #fff;
		border-radius: 2px;
		box-shadow: var(--shadow-2);
	}
	canvas {
		transition: opacity var(--dur-2) var(--ease-out);
	}
	canvas.cache {
		opacity: 0;
	}
	.fantome {
		position: absolute;
		inset: 0;
	}
	.etat {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--s2);
		margin: 0;
		color: var(--ink-2);
		text-align: center;
	}
	.etat p {
		margin: 0;
	}
	.etat a {
		color: var(--brand-2);
	}
	.pages {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--s3);
		font-size: 14px;
		color: var(--ink-2);
	}
	.nav {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		border: 1px solid var(--line);
		border-radius: 50%;
		background: var(--surface);
		color: var(--ink);
		cursor: pointer;
	}
	.nav:disabled {
		opacity: 0.4;
		cursor: default;
	}
</style>
