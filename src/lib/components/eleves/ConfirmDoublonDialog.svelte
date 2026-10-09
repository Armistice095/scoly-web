<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';

	interface Props {
		envoi: boolean;
		onconfirmer: () => void;
		/** Appelé après la fermeture animée (Annuler, Échap). */
		onannuler: () => void;
	}

	let { envoi, onconfirmer, onannuler }: Props = $props();

	let modal: ReturnType<typeof Modal>;
</script>

<Modal bind:this={modal} labelledby="doublon-titre" verrouille={envoi} onfermer={onannuler}>
	<h2 id="doublon-titre">Élève déjà existant ?</h2>
	<p>
		Un élève avec le même nom, les mêmes prénoms et la même date de naissance existe déjà.
		Voulez-vous l'enregistrer quand même ?
	</p>
	<div class="dlg-acts">
		<button type="button" class="btn ghost" disabled={envoi} onclick={() => modal.fermer()}>
			Annuler
		</button>
		<button type="button" class="btn" disabled={envoi} aria-busy={envoi} onclick={onconfirmer}>
			{envoi ? 'Enregistrement…' : 'Enregistrer quand même'}
		</button>
	</div>
</Modal>
