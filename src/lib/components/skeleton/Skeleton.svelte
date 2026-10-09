<script lang="ts">
	interface Props {
		largeur?: string;
		hauteur?: string;
		rond?: boolean;
		classe?: string;
	}

	let { largeur = '100%', hauteur = '14px', rond = false, classe }: Props = $props();
</script>

<!-- Purement décoratif : le contexte (SkeletonTable, SkeletonLignes…) porte l'annonce « Chargement… ». -->
<span
	class={['skeleton', rond && 'rond', classe]}
	style:width={largeur}
	style:height={hauteur}
	aria-hidden="true"
></span>
