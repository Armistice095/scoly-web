<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Logo from '$lib/components/Logo.svelte';

	function retour() {
		if (typeof window !== 'undefined' && window.history.length > 1) {
			window.history.back();
			return;
		}
		goto(resolve('/creer-un-compte'));
	}
</script>

<svelte:head>
	<title>Scoly – Conditions d’utilisation</title>
</svelte:head>

<header class="dtop">
	<div class="dtop-in">
		<a class="brand" href={resolve('/')} aria-label="Scoly, accueil">
			<Logo height={28} />
		</a>
		<button type="button" class="back" onclick={retour}>
			<svg class="i" viewBox="0 0 24 24" aria-hidden="true">
				<path d="M19 12H5M11 6l-6 6 6 6" />
			</svg>
			Retour
		</button>
	</div>
</header>

<main class="doc">
	<h1>Conditions d’utilisation</h1>
	<p class="meta">Dernière mise à jour : 26 septembre 2026</p>

	<nav class="toc" aria-label="Sommaire">
		<p>Sommaire</p>
		<ol>
			<li><a href="#s1">Objet et champ d’application</a></li>
			<li><a href="#s2">Acceptation des conditions</a></li>
			<li><a href="#s3">Création et gestion du compte de l’établissement</a></li>
			<li><a href="#s4">Rôles et accès des utilisateurs</a></li>
			<li><a href="#s5">Utilisation des documents générés</a></li>
			<li><a href="#s6">Propriété et usage des données</a></li>
			<li><a href="#s7">Protection des données personnelles des élèves</a></li>
			<li><a href="#s8">Disponibilité du service</a></li>
			<li><a href="#s9">Limitation de responsabilité</a></li>
			<li><a href="#s10">Résiliation</a></li>
			<li><a href="#s11">Modification des conditions</a></li>
			<li><a href="#s12">Droit applicable et litiges</a></li>
			<li><a href="#s13">Contact</a></li>
		</ol>
	</nav>

	<article>
		<section id="s1">
			<h2>1. Objet et champ d’application</h2>
			<p>
				Les présentes conditions d’utilisation régissent l’accès et l’usage de Scoly, une plateforme
				web permettant aux établissements scolaires béninois de dématérialiser et d’automatiser
				l’établissement de leurs documents administratifs (certificats de scolarité, attestations,
				exeats, et documents assimilés).
			</p>
			<p>
				Elles s’appliquent à tout établissement qui crée un compte sur Scoly, ainsi qu’à toute
				personne qui utilise ce compte au nom de l’établissement (administrateur, secrétariat,
				censeur, ou tout autre rôle défini dans les paramètres de l’établissement).
			</p>
		</section>

		<section id="s2">
			<h2>2. Acceptation des conditions</h2>
			<p>
				La création d’un compte d’établissement, ou l’activation d’un compte utilisateur à la suite
				d’une invitation, vaut acceptation pleine et entière des présentes conditions et de la <a
					class="lnk-a"
					href={resolve('/politique-de-confidentialite')}>politique de confidentialité</a
				>. Si l’établissement ou l’utilisateur n’accepte pas ces conditions, il doit s’abstenir
				d’utiliser le service.
			</p>
		</section>

		<section id="s3">
			<h2>3. Création et gestion du compte de l’établissement</h2>
			<p>
				Le compte est créé par une personne habilitée à représenter l’établissement, qui devient
				administrateur du compte. L’établissement est responsable de l’exactitude des informations
				fournies lors de l’inscription (nom, ordre d’enseignement, département, commune) et de leur
				mise à jour.
			</p>
			<p>
				Les identifiants de connexion sont personnels. Chaque utilisateur est responsable de la
				confidentialité de son mot de passe et de toute action effectuée depuis son compte.
				L’établissement s’engage à informer Scoly sans délai en cas de suspicion d’accès non
				autorisé.
			</p>
		</section>

		<section id="s4">
			<h2>4. Rôles et accès des utilisateurs</h2>
			<p>
				L’administrateur du compte peut inviter d’autres utilisateurs et leur attribuer un rôle (par
				exemple Directeur, Secrétariat ou Censeur) depuis l’écran Paramètres. Chaque rôle détermine
				les actions que l’utilisateur peut effectuer, notamment l’établissement de documents et la
				gestion des dossiers d’élèves.
			</p>
			<p>
				L’établissement reste seul responsable des rôles qu’il attribue et des accès qui en
				découlent.
			</p>
		</section>

		<section id="s5">
			<h2>5. Utilisation des documents générés</h2>
			<p>
				Scoly met à disposition des modèles de documents administratifs et automatise leur
				remplissage à partir des informations saisies par l’établissement. L’établissement demeure
				seul responsable de l’exactitude des informations utilisées pour générer un document, ainsi
				que de la conformité de ce document aux exigences administratives applicables.
			</p>
			<p>
				Un document annulé dans l’écran Archives est conservé à titre d’historique mais ne doit plus
				être remis à un tiers.
			</p>
		</section>

		<section id="s6">
			<h2>6. Propriété et usage des données</h2>
			<p>
				Les données relatives à l’établissement et à ses élèves saisies dans Scoly restent la
				propriété de l’établissement. Scoly ne les utilise que pour fournir le service, notamment la
				génération des documents demandés et l’assistance technique.
			</p>
		</section>

		<section id="s7">
			<h2>7. Protection des données personnelles des élèves</h2>
			<p>
				Les dossiers d’élèves contiennent des données à caractère personnel, y compris de mineurs.
				L’établissement s’engage à ne saisir que les informations nécessaires à l’établissement des
				documents administratifs et à respecter la réglementation applicable en matière de
				protection des données.
			</p>
			<p>
				Le traitement de ces données par Scoly est décrit dans la <a
					class="lnk-a"
					href={resolve('/politique-de-confidentialite')}>politique de confidentialité</a
				>.
			</p>
		</section>

		<section id="s8">
			<h2>8. Disponibilité du service</h2>
			<p>
				Scoly met en œuvre des moyens raisonnables pour assurer la disponibilité du service, sans
				garantir un accès ininterrompu. Des opérations de maintenance peuvent entraîner des
				interruptions temporaires, annoncées lorsque cela est possible.
			</p>
		</section>

		<section id="s9">
			<h2>9. Limitation de responsabilité</h2>
			<p>
				Scoly ne saurait être tenu responsable des conséquences résultant d’informations erronées
				saisies par l’établissement, d’une utilisation non conforme du service, ou d’un accès non
				autorisé résultant d’un défaut de confidentialité des identifiants imputable à
				l’établissement.
			</p>
		</section>

		<section id="s10">
			<h2>10. Résiliation</h2>
			<p>
				L’établissement peut demander la clôture de son compte à tout moment. Scoly peut suspendre
				ou résilier un compte en cas de manquement grave aux présentes conditions, après en avoir
				informé l’administrateur du compte lorsque les circonstances le permettent.
			</p>
		</section>

		<section id="s11">
			<h2>11. Modification des conditions</h2>
			<p>
				Scoly peut modifier les présentes conditions pour tenir compte d’évolutions du service ou de
				la réglementation. Toute modification substantielle sera portée à la connaissance des
				établissements avant son entrée en vigueur.
			</p>
		</section>

		<section id="s12">
			<h2>12. Droit applicable et litiges</h2>
			<p>
				Les présentes conditions sont soumises au droit béninois. Tout litige relatif à leur
				interprétation ou à leur exécution relève de la compétence des juridictions béninoises, à
				défaut de résolution amiable.
			</p>
		</section>

		<section id="s13">
			<h2>13. Contact</h2>
			<p>
				Pour toute question relative aux présentes conditions, l’établissement peut s’adresser à
				l’administrateur de son compte ou, dans la version finale du service, à un contact dédié qui
				sera précisé ici.
			</p>
		</section>

		<p class="crosslink">
			Voir aussi :
			<a class="lnk-a" href={resolve('/politique-de-confidentialite')}
				>Politique de confidentialité</a
			>
		</p>
	</article>
</main>

<style>
	.dtop {
		position: sticky;
		top: 0;
		z-index: 10;
		height: 64px;
		padding-top: env(safe-area-inset-top, 0px);
		background: var(--bg);
		border-bottom: 1px solid var(--line);
	}
	.dtop-in {
		max-width: 760px;
		margin: 0 auto;
		height: 100%;
		padding: 0 var(--s5);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s3);
	}
	.brand {
		display: flex;
		align-items: center;
		border-radius: var(--r-sm);
	}
	.back {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		border: 0;
		background: none;
		color: var(--ink-2);
		cursor: pointer;
		padding: 6px 4px;
		font-size: 14.5px;
		font-weight: 500;
		border-radius: var(--r-sm);
		margin: 0;
	}
	.back:hover {
		color: var(--ink);
		background: var(--sunken);
	}
	.back .i {
		width: 18px;
		height: 18px;
	}
	.doc {
		max-width: 680px;
		margin: 0 auto;
		padding: var(--s6) var(--s5) var(--s7);
	}
	h1 {
		font: 400 34px/1.2 var(--font-serif);
		letter-spacing: -0.01em;
		margin: 0 0 var(--s2);
	}
	.meta {
		margin: 0 0 var(--s5);
		color: var(--ink-3);
		font-size: 14px;
	}
	.toc {
		margin: 0 0 var(--s6);
		padding: var(--s4) var(--s5);
		border: 1px solid var(--line);
		border-radius: var(--r-md);
		background: var(--surface);
	}
	.toc p {
		margin: 0 0 var(--s2);
		font-size: 13px;
		font-weight: 500;
		color: var(--ink-3);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.toc ol {
		margin: 0;
		padding-left: 20px;
		list-style: decimal;
		columns: 2;
		column-gap: var(--s5);
	}
	.toc li {
		margin-bottom: 6px;
		break-inside: avoid;
	}
	.toc a {
		color: var(--brand-2);
		text-decoration: none;
		font-size: 14.5px;
	}
	.toc a:hover {
		text-decoration: underline;
	}
	article section {
		margin-bottom: var(--s6);
		scroll-margin-top: calc(64px + var(--s4));
	}
	article h2 {
		font: 500 21px/1.3 var(--font-serif);
		margin: 0 0 var(--s3);
	}
	article p {
		margin: 0 0 var(--s3);
		color: var(--ink-2);
	}
	.crosslink {
		padding-top: var(--s5);
		border-top: 1px solid var(--line);
		font-size: 14.5px;
		color: var(--ink-2);
	}
	@media (max-width: 600px) {
		h1 {
			font-size: 28px;
		}
		.toc ol {
			columns: 1;
		}
		.doc {
			padding: var(--s5) var(--s4) var(--s6);
		}
	}
</style>
