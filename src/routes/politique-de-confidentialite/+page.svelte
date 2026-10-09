<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
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

<Seo
	titre="Politique de confidentialité"
	description="Comment Scoly collecte, utilise et protège les données de votre établissement et de ses élèves."
/>

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
	<h1>Politique de confidentialité</h1>
	<p class="meta">Dernière mise à jour : 26 septembre 2026</p>

	<nav class="toc" aria-label="Sommaire">
		<p>Sommaire</p>
		<ol>
			<li><a href="#s1">Objet</a></li>
			<li><a href="#s2">Données collectées</a></li>
			<li><a href="#s3">Finalités du traitement</a></li>
			<li><a href="#s4">Base légale</a></li>
			<li><a href="#s5">Durée de conservation</a></li>
			<li><a href="#s6">Destinataires des données</a></li>
			<li><a href="#s7">Sécurité des données</a></li>
			<li><a href="#s8">Droits des personnes concernées</a></li>
			<li><a href="#s9">Cookies et traceurs</a></li>
			<li><a href="#s10">Modification de la politique</a></li>
			<li><a href="#s11">Contact</a></li>
		</ol>
	</nav>

	<article>
		<section id="s1">
			<h2>1. Objet</h2>
			<p>
				La présente politique décrit comment Scoly collecte, utilise et protège les données à
				caractère personnel traitées dans le cadre du service, qu’il s’agisse des données des
				utilisateurs de l’établissement ou de celles des élèves dont les dossiers sont gérés dans
				Scoly.
			</p>
		</section>

		<section id="s2">
			<h2>2. Données collectées</h2>
			<p>Scoly traite trois catégories de données :</p>
			<ul>
				<li>
					<strong>Données de l’établissement :</strong> nom, ordre d’enseignement, adresse, département,
					commune, contacts et informations utilisées dans l’en-tête des documents.
				</li>
				<li>
					<strong>Données des utilisateurs :</strong> nom, fonction, e-mail professionnel, téléphone,
					rôle et historique de connexion.
				</li>
				<li>
					<strong>Données des élèves :</strong> identité, date et lieu de naissance, classe, matricule,
					et informations relatives au parent ou tuteur (nom, téléphone, adresse), nécessaires à l’établissement
					des documents administratifs.
				</li>
			</ul>
		</section>

		<section id="s3">
			<h2>3. Finalités du traitement</h2>
			<p>
				Ces données sont traitées pour permettre la création et la gestion des comptes,
				l’établissement et l’archivage des documents administratifs, la gestion des dossiers
				d’élèves, ainsi que l’amélioration et la sécurité du service.
			</p>
		</section>

		<section id="s4">
			<h2>4. Base légale</h2>
			<p>
				Le traitement repose sur l’exécution du contrat qui lie l’établissement à Scoly, ainsi que
				sur l’intérêt légitime de l’établissement à dématérialiser ses documents administratifs. Le
				traitement des données des élèves est effectué pour le compte de l’établissement, qui en
				détermine les finalités.
			</p>
		</section>

		<section id="s5">
			<h2>5. Durée de conservation</h2>
			<p>
				Les données sont conservées pendant la durée d’utilisation du service par l’établissement,
				puis archivées ou supprimées selon les délais applicables aux documents administratifs
				scolaires. Un document annulé reste visible dans les archives, à titre d’historique, mais
				n’est plus délivré.
			</p>
		</section>

		<section id="s6">
			<h2>6. Destinataires des données</h2>
			<p>
				Les données sont accessibles aux utilisateurs de l’établissement selon leur rôle. Elles ne
				sont ni vendues ni communiquées à des tiers à des fins commerciales. Elles peuvent être
				communiquées à des prestataires techniques strictement nécessaires au fonctionnement du
				service, dans les limites de cette politique.
			</p>
		</section>

		<section id="s7">
			<h2>7. Sécurité des données</h2>
			<p>
				Scoly met en œuvre des mesures techniques et organisationnelles destinées à protéger les
				données contre l’accès non autorisé, la perte ou l’altération, notamment le chiffrement des
				mots de passe et la vérification de l’identité par code à l’activation du compte et à la
				réinitialisation du mot de passe.
			</p>
		</section>

		<section id="s8">
			<h2>8. Droits des personnes concernées</h2>
			<p>
				Toute personne dont les données sont traitées dans Scoly (utilisateur ou, par
				l’intermédiaire de l’établissement, parent ou tuteur d’un élève) peut demander l’accès à ses
				données, leur rectification, ou leur suppression dans les limites permises par les
				obligations légales de conservation des documents administratifs scolaires.
			</p>
			<p>
				Ces demandes s’adressent en premier lieu à l’établissement, qui reste responsable des
				données de ses élèves, ou à l’administrateur du compte pour les données d’un utilisateur.
			</p>
		</section>

		<section id="s9">
			<h2>9. Cookies et traceurs</h2>
			<p>
				Scoly utilise uniquement les cookies strictement nécessaires au fonctionnement du service,
				notamment pour maintenir la session de connexion. Aucun cookie publicitaire ou de mesure
				d’audience tiers n’est utilisé.
			</p>
		</section>

		<section id="s10">
			<h2>10. Modification de la politique</h2>
			<p>
				Cette politique peut être mise à jour pour refléter des évolutions du service ou de la
				réglementation. La date de dernière mise à jour figure en haut de cette page.
			</p>
		</section>

		<section id="s11">
			<h2>11. Contact</h2>
			<p>
				Pour toute question relative au traitement de ses données, l’utilisateur peut s’adresser à
				l’administrateur de son établissement ou, dans la version finale du service, à un contact
				dédié qui sera précisé ici.
			</p>
		</section>

		<p class="crosslink">
			Voir aussi :
			<a class="lnk-a" href={resolve('/conditions-d-utilisation')}>Conditions d’utilisation</a>
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
	article p,
	article ul {
		margin: 0 0 var(--s3);
		color: var(--ink-2);
	}
	article ul {
		padding-left: 20px;
		list-style: disc;
	}
	article li {
		margin-bottom: 6px;
	}
	article strong {
		color: var(--ink);
		font-weight: 500;
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
