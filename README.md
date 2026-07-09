# GoPharma API et Infrastructure

Ce dépôt contient l’API NestJS de GoPharma et les fichiers d’infrastructure Docker Compose pour les environnements test et production.

Le frontend Next.js est dans un dépôt séparé: `NXTCV/go_pharma`. Les déploiements runtime consomment donc deux images GHCR distinctes:

```text
ghcr.io/nxtcv/go-pharma-api
ghcr.io/nxtcv/go-pharma-front
```

## Rôle De Ce Dépôt

- API backend NestJS dans `go_pharma_api/`.
- Tests API Docker isolés avec `docker-compose-api-test.yml`.
- Déploiement runtime test avec `docker-compose-test.yml`.
- Déploiement runtime production avec `docker-compose-production.yml`.
- Workflow GitHub Actions API dans `.github/workflows/api-ci.yml`.

Le fichier qui décrit l’ensemble du projet côté API/infra est ce fichier: `README.md`.

## Architecture

- API: NestJS REST, MongoDB, Mongoose, GridFS.
- Authentification: JWT access/refresh, OAuth Google, RBAC.
- Rôles: `PATIENT`, `PHARMACY_MANAGER`, `ADMIN`.
- Recherche: produits, pharmacies, catégories, autocomplete, géolocalisation optionnelle.
- Intégrations: SMTP, Google Maps, Google OAuth, Cloudinary optionnel.
- Documentation API: Swagger sur `/api/docs`.
- Déploiement runtime: Traefik, HTTPS Let’s Encrypt, frontend, API, MongoDB.

## Dépôts Et Images

| Partie | Dépôt | Image test | Image production |
| --- | --- | --- | --- |
| API | `NXTCV/go_pharma_api` | `ghcr.io/nxtcv/go-pharma-api:test` | `ghcr.io/nxtcv/go-pharma-api:latest` |
| Frontend | `NXTCV/go_pharma` | `ghcr.io/nxtcv/go-pharma-front:test` | `ghcr.io/nxtcv/go-pharma-front:latest` |

Le dépôt API ne build pas le frontend. Il tire simplement l’image frontend publiée par le dépôt frontend.

## Démarrage Local API

```bash
cd go_pharma_api
cp .env.example .env
npm install
npm run start:dev
```

Tests:

```bash
cd go_pharma_api
npm test
npm run test:e2e
```

## Fichiers Docker Compose

| Fichier | Usage | Durée de vie |
| --- | --- | --- |
| `docker-compose-api-test.yml` | Lance les tests API dans GitHub Actions | Jetable, détruit après les tests |
| `docker-compose-test.yml` | Déploie la stack test sur VM GCP | Long-running |
| `docker-compose-production.yml` | Déploie la stack production | Long-running |

Les stacks runtime exposent uniquement Traefik sur `80` et `443`. Les services `frontend`, `api` et `mongo` restent sur les réseaux Docker internes.

## Déploiement Test

Documentation dédiée: `deploy/test/README.md`.

Le runtime test utilise:

```text
ghcr.io/nxtcv/go-pharma-front:test
ghcr.io/nxtcv/go-pharma-api:test
```

Validation locale du compose:

```bash
docker compose --env-file deploy/test/.env.example -f docker-compose-test.yml config
```

## Déploiement Production

Documentation dédiée: `deploy/production/README.md`.

Le runtime production utilise:

```text
ghcr.io/nxtcv/go-pharma-front:latest
ghcr.io/nxtcv/go-pharma-api:latest
```

Validation locale du compose:

```bash
docker compose --env-file deploy/production/.env.example -f docker-compose-production.yml config
```

## Variables Et Secrets

Les fichiers `.env.example` ne contiennent pas de secrets réels. Les valeurs sensibles doivent rester dans GitHub Actions environments/secrets ou sur la VM.

Secrets communs importants:

```text
MONGO_INITDB_ROOT_USERNAME
MONGO_INITDB_ROOT_PASSWORD
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
SMTP_HOST
SMTP_USER
SMTP_PASS
SMTP_FROM
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL
GOOGLE_SUCCESS_REDIRECT_URL
GOOGLE_FAILURE_REDIRECT_URL
```

Secrets et variables infra GitHub Actions:

```text
GCP_CREDENTIALS
USERNAME
TOKEN
GCP_TEST_INSTANCE
GCP_ZONE
FRONTEND_HOST
API_HOST
TRAEFIK_ACME_EMAIL
```

`GCP_PROJECT_ID` peut être déduit de `GCP_CREDENTIALS` si le JSON du service account contient `project_id`.

## Endpoints Principaux

- Auth: `/api/auth/register-patient`, `/api/auth/register-pharmacy`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/google`, `/api/auth/google/callback`.
- Users: `/api/users/me`, `/api/users/me/preferences`, `/api/users/me/photo`.
- Pharmacies: `/api/pharmacies`, `/api/pharmacies/:id/products`, `/api/pharmacies/:id/schedule`.
- Manager: `/api/manager/pharmacy`, `/api/manager/products`, `/api/manager/schedules`, `/api/manager/stats/visits`.
- Search: `/api/search/products`, `/api/search/products/multi`, `/api/search/pharmacies`, `/api/search/categories`, `/api/search/autocomplete`.
- Admin: `/api/admin/validations`, `/api/admin/users`, `/api/admin/pharmacies`, `/api/admin/medicaments`, `/api/admin/integrations/status`.
- Assistant: `/api/assistant/chat`, `/api/assistant/conversations`.
- System: `/api/health`, `/api/system/health`, `/api/system/integrations/test`.
- Files: `/api/files`.

## État Actuel

- API NestJS implémentée en monolithe modulaire.
- Auth locale, OAuth Google, JWT, RBAC, validation pharmacie, recherche, notifications, fichiers, audit logs et Swagger en place.
- Assistant IA backend conservé en fallback mock; l’intégration provider réelle est prévue côté frontend serveur Next.js.
- Tests API CI et compose de test opérationnels.
- Runtime test avec Traefik en place.
- Runtime production Compose créé, mais le job GitHub `deploy-production` doit encore être branché pour déployer réellement sur la VM production.
