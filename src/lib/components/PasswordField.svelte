<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		id: string;
		label: string;
		value: string;
		autocomplete?: 'current-password' | 'new-password';
		error?: string | null;
	}

	let {
		id,
		label,
		value = $bindable(),
		autocomplete = 'new-password',
		error = null
	}: Props = $props();

	let visible = $state(false);
</script>

<div class="field">
	<label for={id}>{label}</label>
	<div class="pw">
		<input
			{id}
			type={visible ? 'text' : 'password'}
			{autocomplete}
			bind:value
			aria-invalid={error ? 'true' : undefined}
			required
		/>
		<button
			type="button"
			class="eye"
			aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
			aria-pressed={visible}
			onclick={() => (visible = !visible)}
		>
			<Icon name={visible ? 'eyeoff' : 'eye'} />
		</button>
	</div>
	{#if error}
		<p class="err">{error}</p>
	{/if}
</div>
