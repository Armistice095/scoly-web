<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import Icon from '$lib/components/Icon.svelte';
	import { monter } from '$lib/motion';
	import type { Eleve } from '$lib/types';
	import {
		LIBELLE_SEXE,
		LIBELLE_STATUT,
		formaterDateNaissance,
		nomComplet
	} from '$lib/utils/eleves';

	interface Props {
		eleves: Eleve[];
		/** Élève dont le menu d'actions est ouvert (pour `aria-expanded`). */
		menuOuvertId: string | null;
		onmenu: (eleve: Eleve, bouton: HTMLButtonElement) => void;
		/** Sur mobile, un appui sur la carte ouvre la fiche. */
		onvoir: (eleve: Eleve) => void;
	}

	let { eleves, menuOuvertId, onmenu, onvoir }: Props = $props();

	// Même seuil que le passage du tableau en cartes dans design-system.css.
	const mobile = new MediaQuery('max-width: 700px');

	function surClicLigne(e: MouseEvent, eleve: Eleve) {
		if (!mobile.current) return; // sur grand écran, les actions passent par le menu ⋯
		if ((e.target as HTMLElement).closest('button, a')) return; // le bouton ⋯ garde son propre rôle
		onvoir(eleve);
	}
</script>

<div class="tw">
	<table class="tbl">
		<caption class="sr-only">Liste des élèves</caption>
		<thead>
			<tr>
				<th scope="col">Élève</th>
				<th scope="col">Sexe</th>
				<th scope="col">Date de naissance</th>
				<th scope="col">Lieu de naissance</th>
				<th scope="col">Statut</th>
				<th scope="col" class="r">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each eleves as eleve, i (eleve.id)}
				<!-- Échelonné sur 10 lignes max (page de 10) ; `global` : joue aussi à l'apparition du tableau. -->
				<tr
					class:cliquable={mobile.current}
					onclick={(e) => surClicLigne(e, eleve)}
					in:monter|global={{ y: 6, delay: Math.min(i, 9) * 20 }}
				>
					<td class="nom" data-l="Élève">
						<div>
							<strong>{eleve.nom.toUpperCase()}</strong>
							{eleve.prenoms}
							<span class="hint ref">{eleve.matricule ?? 'Sans matricule'}</span>
						</div>
					</td>
					<td data-l="Sexe">{LIBELLE_SEXE[eleve.sexe]}</td>
					<td data-l="Date de naissance">{formaterDateNaissance(eleve.dateNaissance)}</td>
					<td data-l="Lieu de naissance">{eleve.lieuNaissance}</td>
					<td data-l="Statut"><span class="badge b-ok">{LIBELLE_STATUT[eleve.statut]}</span></td>
					<td class="act act-kebab" data-l="Actions">
						<button
							type="button"
							class="kebab"
							aria-label={`Actions pour ${nomComplet(eleve)}`}
							aria-haspopup="menu"
							aria-expanded={menuOuvertId === eleve.id}
							onclick={(e) => onmenu(eleve, e.currentTarget)}
						>
							<Icon name="dots" />
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
