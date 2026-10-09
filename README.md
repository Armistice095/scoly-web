# scoly-web

Frontend SvelteKit de Scoly — espace établissement + page publique de
vérification. Consomme l'API `scoly-api` via HTTP. Voir `docs/SPEC.md`,
`docs/ARCHITECTURE.md` et `docs/PLAN.md` (dépôt de documentation du projet)
pour le contexte complet.

## Prérequis

- Node.js 20+
- pnpm
- `scoly-api` démarré (par défaut sur `http://localhost:3000`)

## Installation

```bash
pnpm install
cp .env.example .env
```

`PUBLIC_API_URL` dans `.env` doit pointer vers l'API (`http://localhost:3000`
en local).

## Développement

```bash
pnpm run dev --open
```

Vérifié fonctionnel de bout en bout lors de l'initialisation du projet :

- `/` redirige vers `/connexion`
- `/connexion` affiche le formulaire
- `/(app)/documents`, `/eleves`, `/documents`, `/archives`,
  `/parametres` répondent (contenu placeholder, à implémenter phase par
  phase)
- `/verifier/[token]` affiche le token reçu (placeholder Phase 4)
- Appel réel à `GET /health` sur `scoly-api` confirmé (CORS correctement
  configuré entre les deux projets)

## Qualité de code

```bash
pnpm run check   # vérification des types (svelte-check)
pnpm run lint    # prettier --check + eslint
pnpm run format  # prettier --write
pnpm run build   # build de production
```

## Structure

```
src/
├── routes/
│   ├── (app)/                  # Espace établissement authentifié
│   │   ├── +layout.svelte      # Nav bar : Tableau de bord | Élèves | Documents | Archives | Paramètres
│   │   ├── eleves/             # Phase 2
│   │   ├── documents/          # Phase 3
│   │   ├── archives/           # Phase 5
│   │   └── parametres/         # Phase 6
│   ├── connexion/              # Phase 1
│   └── verifier/[token]/       # Phase 4 — page publique, sans authentification
├── lib/
│   ├── api/client.ts           # Client HTTP vers scoly-api
│   └── types/index.ts          # Types reflétant les réponses de l'API
```

## Contrat d'API

Les types dans `src/lib/types/index.ts` reflètent les réponses attendues de
`scoly-api`. Comme les deux projets sont des dépôts séparés (voir
`ARCHITECTURE.md`), **ces types ne sont pas générés automatiquement** — à
resynchroniser manuellement si le contrat d'API évolue (voir le détail par
phase dans `docs/PLAN.md`).

## Prochaine étape

Phase 1 du plan d'implémentation : brancher la page de connexion sur
`POST /auth/login`, gérer le token, et ajouter la garde d'authentification
sur le groupe de routes `(app)`.

## Déploiement (Cloudflare Workers)

Le site est déployé comme **Worker avec assets statiques** (`@sveltejs/adapter-cloudflare`,
configuration dans `wrangler.jsonc`).

1. Pousser le dépôt sur GitHub.
2. Cloudflare → **Workers & Pages → Create → Import a repository** (ou _Connect to Git_).
3. Réglages de build :
   - Build command : `pnpm run build`
   - Deploy command : `npx wrangler deploy`
   - `PUBLIC_API_URL` (`https://api.scoly.ink`) est déjà fixée dans `.env.production`
     (valeur publique, commitée ; lue à la construction : la modifier impose un nouveau build).
4. Côté API (`scoly-api`) : autoriser l'origine `https://app.scoly.ink` dans la configuration CORS
   (en-têtes `Authorization` et `Content-Type`, méthodes `GET, POST, PATCH, DELETE`).
5. Domaine : `app.scoly.ink` est déclaré dans `wrangler.jsonc` (`custom_domain`). La zone `scoly.ink`
   doit être dans le même compte Cloudflare.

Déploiement manuel : `pnpm exec wrangler login` puis `pnpm run deploy`.
Aperçu local dans le runtime Cloudflare : `pnpm run preview:cf`.
