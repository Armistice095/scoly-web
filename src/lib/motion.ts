import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

/**
 * Système de mouvement de Scoly.
 * Les durées et courbes CSS vivent dans `design-system.css` (--dur-*, --ease-*) ;
 * ces constantes en sont le miroir pour les transitions Svelte et les temporisations JS.
 */
export const DUREE = { rapide: 120, normal: 200, lent: 300 } as const;

/** `true` si l'utilisateur a demandé de réduire les animations. */
export function mouvementReduit(): boolean {
	return (
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

/** Durée effective : 0 sous `prefers-reduced-motion` (aucune attente invisible). */
export const duree = (ms: number): number => (mouvementReduit() ? 0 : ms);

interface OptionsMonter {
	/** Déplacement vertical de départ, en px (positif = part du bas). */
	y?: number;
	duration?: number;
	delay?: number;
}

/** Fondu + légère montée : apparition d'un élément (toast, contenu de page, étape…). */
export function monter(
	_node: Element,
	{ y = 8, duration = DUREE.normal, delay = 0 }: OptionsMonter = {}
): TransitionConfig {
	return {
		// Sous mouvement réduit, ni durée ni délai : sinon l'élément resterait invisible pendant le délai.
		delay: mouvementReduit() ? 0 : delay,
		duration: duree(duration),
		easing: cubicOut,
		css: (t) => `opacity: ${t}; transform: translateY(${(1 - t) * y}px);`
	};
}

interface OptionsGlisser {
	/** Décalage horizontal de départ, en px (positif = part de la droite, négatif = de la gauche). */
	x?: number;
	duration?: number;
	delay?: number;
}

/** Fondu + glissement horizontal : changement d'étape dans un parcours (le signe donne le sens). */
export function glisser(
	_node: Element,
	{ x = 16, duration = DUREE.normal, delay = 0 }: OptionsGlisser = {}
): TransitionConfig {
	return {
		delay: mouvementReduit() ? 0 : delay,
		duration: duree(duration),
		easing: cubicOut,
		css: (t) => `opacity: ${t}; transform: translateX(${(1 - t) * x}px);`
	};
}
