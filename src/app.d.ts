// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		/** État d'historique de la page de vérification (aucune donnée : un simple marqueur). */
		interface PageState {
			verification?: true;
		}
		// interface Platform {}
	}
}

export {};
