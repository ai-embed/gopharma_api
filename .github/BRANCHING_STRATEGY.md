# Stratégie de Branches Gopharma

## Vue d'ensemble

Nous utilisons un modèle **GitFlow simplifié** avec 3 branches principales.

## Branches

### `main` - Production
- **Usage** : Code en production
- **Protection** : Maximale
- **Merge** : Uniquement depuis `test` via PR validée
- **Tags** : Versions release (v1.0.0, v1.1.0...)

### `dev` - Développement
- **Usage** : Intégration des features, staging
- **Protection** : Moyenne
- **Merge** : Depuis `feature/*` via PR validée
- **Déploiement** : Environnement de staging/recette

### `test` - Tests
- **Usage** : Tests d'intégration, validation QA
- **Protection** : Faible
- **Merge** : Depuis `dev` via PR validée
- **Déploiement** : Environnement de test

## Workflow

```
feature/* → dev → test → main
              ↓        ↓
           staging   production
```

### Pour une nouvelle feature

```bash
# 1. Créer une branche depuis dev
git checkout dev
git pull origin dev
git checkout -b feature/ma-feature

# 2. Développer et commiter
git add .
git commit -m "feat: description de ma feature"

# 3. Pousser et créer PR vers dev
git push origin feature/ma-feature
# Créer PR sur GitHub: feature/ma-feature → dev

# 4. Après validation en staging, PR vers test
# Créer PR sur GitHub: dev → test

# 5. Après validation QA, PR vers main
# Créer PR sur GitHub: test → main
```

### Pour un hotfix

```bash
# 1. Créer depuis main
git checkout main
git pull origin main
git checkout -b hotfix/description

# 2. Corriger et commiter
git add .
git commit -m "fix: description du fix"

# 3. PR vers main ET dev
git push origin hotfix/description
# Créer 2 PRs: hotfix → main, hotfix → dev
```

## Nommage des branches

| Type | Pattern | Exemple |
|------|---------|---------|
| Feature | `feature/*` | `feature/auth-google` |
| Fix | `fix/*` | `fix/login-validation` |
| Hotfix | `hotfix/*` | `hotfix/security-patch` |
| Chore | `chore/*` | `chore/update-deps` |
| Docs | `docs/*` | `docs/api-documentation` |

## Conventions de commit

Format : `type(scope): description`

| Type | Usage |
|------|-------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `style` | Formatage (pas de code) |
| `refactor` | Refactoring |
| `test` | Ajout/modification de tests |
| `chore` | Maintenance, CI, deps |

## Règles de protection

### `main`
- ✅ Reviews requises : 2 approbations
- ✅ CI doit passer (`lint`, `test-unit`, `test-e2e`, `build`)
- ✅ Pas de push direct
- ✅ Pas de force push
- ✅ Branches à jour avant merge

### `dev`
- ✅ Reviews requises : 1 approbation
- ✅ CI doit passer (`lint`, `test-unit`, `build`)
- ✅ Pas de push direct
- ✅ Pas de force push

### `test`
- ✅ Reviews requises : 1 approbation
- ✅ CI doit passer (`lint`, `test-unit`, `test-e2e`, `build`)
- ✅ Pas de push direct
- ✅ Pas de force push

## Environnements CI/CD

| Branche | Environnement | Déploiement auto |
|---------|---------------|------------------|
| `main` | Production | ✅ |
| `dev` | Staging | ✅ |
| `test` | Test | ❌ (manuel) |
