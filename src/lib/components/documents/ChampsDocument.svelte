<script lang="ts">
	import type { ChampDocument } from '$lib/types';
	import { aujourdhuiIso } from '$lib/utils/eleves';
	import type { ValeursDocument } from '$lib/utils/documents';

	interface Props {
		champs: ChampDocument[];
		valeurs: ValeursDocument;
		erreurs: Record<string, string>;
		desactive?: boolean;
	}

	let { champs, valeurs = $bindable(), erreurs = $bindable(), desactive = false }: Props = $props();

	const max = aujourdhuiIso();

	function effacerErreur(cle: string) {
		if (erreurs[cle]) {
			erreurs = Object.fromEntries(Object.entries(erreurs).filter(([k]) => k !== cle));
		}
	}
</script>

{#if champs.length === 0}
	<p class="hint">Aucune information complémentaire requise pour ce document.</p>
{:else}
	{#each champs as c (c.cle)}
		{@const idChamp = `d-${c.cle}`}
		<div class="field">
			<label for={idChamp}>
				{c.libelle}{#if !c.obligatoire}
					<span class="opt"> (facultatif)</span>{/if}
			</label>

			{#if c.type === 'textarea'}
				<textarea
					id={idChamp}
					rows="3"
					placeholder={c.placeholder}
					maxlength={c.maxLength}
					disabled={desactive}
					aria-required={c.obligatoire}
					aria-invalid={erreurs[c.cle] ? 'true' : undefined}
					aria-describedby={erreurs[c.cle] ? `e-${idChamp}` : undefined}
					bind:value={valeurs[c.cle]}
					oninput={() => effacerErreur(c.cle)}></textarea>
				{#if c.maxLength}
					<p class="compteur" aria-hidden="true">{valeurs[c.cle]?.length ?? 0}/{c.maxLength}</p>
				{/if}
			{:else if c.type === 'select'}
				<select
					id={idChamp}
					disabled={desactive}
					aria-required={c.obligatoire}
					aria-invalid={erreurs[c.cle] ? 'true' : undefined}
					aria-describedby={erreurs[c.cle] ? `e-${idChamp}` : undefined}
					bind:value={valeurs[c.cle]}
					onchange={() => effacerErreur(c.cle)}
				>
					{#if !c.obligatoire || !valeurs[c.cle]}
						<option value="">{c.obligatoire ? 'Choisir…' : '—'}</option>
					{/if}
					{#each c.options ?? [] as option (option)}
						<option value={option}>{option}</option>
					{/each}
				</select>
			{:else}
				<input
					id={idChamp}
					type={c.type === 'date' ? 'date' : 'text'}
					max={c.type === 'date' ? max : undefined}
					maxlength={c.maxLength}
					placeholder={c.placeholder}
					autocomplete="off"
					disabled={desactive}
					aria-required={c.obligatoire}
					aria-invalid={erreurs[c.cle] ? 'true' : undefined}
					aria-describedby={erreurs[c.cle] ? `e-${idChamp}` : undefined}
					bind:value={valeurs[c.cle]}
					oninput={() => effacerErreur(c.cle)}
				/>
			{/if}

			{#if erreurs[c.cle]}
				<p class="err" id={`e-${idChamp}`}>{erreurs[c.cle]}</p>
			{/if}
		</div>
	{/each}
{/if}

<style>
	.opt {
		font-weight: 400;
		color: var(--ink-3);
	}
	textarea {
		width: 100%;
		min-height: 88px;
		padding: 10px var(--s3);
		border: 1px solid var(--line);
		border-radius: var(--r-md);
		background: var(--bg);
		font: inherit;
		resize: vertical;
	}
	textarea:focus {
		border-color: var(--brand-2);
	}
	textarea[aria-invalid='true'] {
		border-color: var(--err);
	}
	.compteur {
		margin: 0;
		text-align: right;
		font-size: 12px;
		color: var(--ink-3);
	}
</style>
