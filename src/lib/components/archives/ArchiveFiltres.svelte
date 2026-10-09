<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { StatutArchive, TypeDocument } from '$lib/types';

	interface Props {
		/** Texte du champ de recherche (la page applique le debounce). */
		saisie: string;
		types: TypeDocument[];
		typeId: string;
		statut: StatutArchive | '';
		filtreActif: boolean;
		onsaisie: () => void;
		onvalider: () => void;
		ontype: (id: string) => void;
		onstatut: (statut: StatutArchive | '') => void;
		onreinitialiser: () => void;
	}

	let {
		saisie = $bindable(),
		types,
		typeId,
		statut,
		filtreActif,
		onsaisie,
		onvalider,
		ontype,
		onstatut,
		onreinitialiser
	}: Props = $props();

	let champ: HTMLInputElement;

	/** Remet le curseur dans la recherche (après « Réinitialiser »). */
	export function focaliser() {
		champ?.focus();
	}
</script>

<div class="tools" role="search">
	<div class="search">
		<Icon name="search" />
		<label class="sr-only" for="recherche">Rechercher par élève ou par référence</label>
		<input
			id="recherche"
			type="search"
			placeholder="Rechercher un élève ou une référence"
			autocomplete="off"
			maxlength="100"
			bind:this={champ}
			bind:value={saisie}
			oninput={onsaisie}
			onkeydown={(e) => e.key === 'Enter' && onvalider()}
		/>
	</div>
	<label class="sr-only" for="filtre-type">Type de document</label>
	<select id="filtre-type" value={typeId} onchange={(e) => ontype(e.currentTarget.value)}>
		<option value="">Tous les documents</option>
		{#each types as type (type.id)}
			<option value={type.id} selected={type.id === typeId}>{type.nom}</option>
		{/each}
	</select>
	<label class="sr-only" for="filtre-statut">Statut</label>
	<select
		id="filtre-statut"
		value={statut}
		onchange={(e) => onstatut(e.currentTarget.value as StatutArchive | '')}
	>
		<option value="">Tous les statuts</option>
		<option value="ACTIF">Actifs</option>
		<option value="ANNULE">Annulés</option>
	</select>
	{#if filtreActif}
		<button type="button" class="btn ghost" onclick={onreinitialiser}>Réinitialiser</button>
	{/if}
</div>
