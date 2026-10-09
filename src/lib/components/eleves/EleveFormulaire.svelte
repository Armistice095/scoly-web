<script lang="ts">
	import {
		aujourdhuiIso,
		type ChampEleve,
		type ErreursEleve,
		type ValeursEleve
	} from '$lib/utils/eleves';

	interface Props {
		valeurs: ValeursEleve;
		erreurs: ErreursEleve;
		desactive?: boolean;
	}

	let { valeurs = $bindable(), erreurs = $bindable(), desactive = false }: Props = $props();

	interface DefChamp {
		cle: ChampEleve;
		libelle: string;
		requis?: boolean;
		/** Sur toute la largeur ; sinon deux champs par ligne. */
		pleine?: boolean;
		type?: 'text' | 'tel' | 'date' | 'select';
		placeholder?: string;
	}

	const champs: DefChamp[] = [
		{ cle: 'matricule', libelle: 'Matricule', pleine: true, placeholder: 'CEG-0031' },
		{
			cle: 'matriculeEducMaster',
			libelle: 'Matricule EducMaster',
			pleine: true,
			placeholder: 'EM-7300100'
		},
		{ cle: 'nom', libelle: 'Nom', requis: true },
		{ cle: 'prenoms', libelle: 'Prénoms', requis: true },
		{ cle: 'sexe', libelle: 'Sexe', requis: true, type: 'select' },
		{ cle: 'dateNaissance', libelle: 'Date de naissance', requis: true, type: 'date' },
		{ cle: 'lieuNaissance', libelle: 'Lieu de naissance', requis: true, pleine: true },
		{ cle: 'parentTuteur', libelle: 'Parent ou tuteur', requis: true, pleine: true },
		{
			cle: 'telephone',
			libelle: 'Téléphone',
			requis: true,
			pleine: true,
			type: 'tel',
			placeholder: '01 97 16 46 76'
		},
		{ cle: 'adresse', libelle: 'Adresse', pleine: true },
		{ cle: 'classe', libelle: 'Classe', placeholder: 'Ex. CE1, 3ème A' },
		{ cle: 'dateInscription', libelle: "Date d'inscription", type: 'date' }
	];

	const max = aujourdhuiIso();

	function effacerErreur(cle: ChampEleve) {
		if (erreurs[cle]) erreurs[cle] = undefined;
	}
</script>

<div class="two">
	{#each champs as c (c.cle)}
		<div class="field" class:full={c.pleine}>
			<label for={`f-${c.cle}`}>
				{c.libelle}{#if c.requis}<span aria-hidden="true"> *</span>{/if}
			</label>
			{#if c.type === 'select'}
				<select
					id={`f-${c.cle}`}
					bind:value={valeurs[c.cle]}
					required={c.requis}
					disabled={desactive}
					aria-invalid={erreurs[c.cle] ? 'true' : undefined}
					aria-describedby={erreurs[c.cle] ? `e-${c.cle}` : undefined}
					onchange={() => effacerErreur(c.cle)}
				>
					<option value="MASCULIN">Masculin</option>
					<option value="FEMININ">Féminin</option>
				</select>
			{:else}
				<input
					id={`f-${c.cle}`}
					type={c.type ?? 'text'}
					inputmode={c.type === 'tel' ? 'tel' : undefined}
					autocomplete="off"
					placeholder={c.placeholder}
					max={c.type === 'date' ? max : undefined}
					bind:value={valeurs[c.cle]}
					required={c.requis}
					disabled={desactive}
					aria-invalid={erreurs[c.cle] ? 'true' : undefined}
					aria-describedby={erreurs[c.cle] ? `e-${c.cle}` : undefined}
					oninput={() => effacerErreur(c.cle)}
				/>
			{/if}
			{#if erreurs[c.cle]}
				<p class="err" id={`e-${c.cle}`}>{erreurs[c.cle]}</p>
			{/if}
		</div>
	{/each}
</div>
