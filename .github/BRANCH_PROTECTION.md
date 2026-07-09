# Configuration des règles de protection de branches
# À appliquer via GitHub UI : Settings > Branches > Branch protection rules

# Workflow: feature/* → dev → test → main

## Règle pour `main`

### Branch protection rule: main
- Branch name pattern: main

#### Protect matching branches
- [x] Require a pull request before merging
  - [x] Require approvals: 2
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners (si CODEOWNER existe)
  
- [x] Require status checks to pass before merging
  - Required checks:
    - lint
    - test-unit
    - test-e2e
    - build
  - [x] Require branches to be up to date before merging

- [x] Require conversation resolution before merging

- [x] Do not allow bypassing the above settings

#### Restrict pushes
- [x] Restrict who can push to matching branches
  - (Laisser vide = tous les collaborateurs peuvent push via PR)

#### Allow specific actors
- [ ] Allow force pushes (DÉSACTIVÉ)
- [ ] Allow deletions (DÉSACTIVÉ)

---


## Règle pour `test`

### Branch protection rule: test
- Branch name pattern: test
- **Merge autorisé depuis** : `dev` uniquement

#### Protect matching branches
- [x] Require a pull request before merging
  - [x] Require approvals: 1
  - [x] Dismiss stale pull request approvals when new commits are pushed

- [x] Require status checks to pass before merging
  - Required checks:
    - lint
    - test-unit
    - test-e2e
    - build

- [x] Require conversation resolution before merging

- [x] Do not allow bypassing the above settings

- [ ] Allow force pushes (DÉSACTIVÉ)

---

## Règle pour `dev`

### Branch protection rule: dev
- Branch name pattern: dev
- **Merge autorisé depuis** : `feature/*`, `fix/*`, `chore/*`, `docs/*`

#### Protect matching branches
- [x] Require a pull request before merging
  - [x] Require approvals: 1
  - [x] Dismiss stale pull request approvals when new commits are pushed

- [x] Require status checks to pass before merging
  - Required checks:
    - lint
    - test-unit
    - build

- [x] Require conversation resolution before merging

- [x] Do not allow bypassing the above settings

- [ ] Allow force pushes (DÉSACTIVÉ)

---

## Commandes GitHub CLI (alternative)

Si GitHub CLI est installé (`gh`), appliquer les règles :

```bash
# Protection main
gh api -X PUT repos/:owner/:repo/branches/main/protection \
  --input - <<EOF
{
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "required_approving_review_count": 2
  },
  "required_status_checks": {
    "strict": true,
    "contexts": ["lint", "test-unit", "test-e2e", "build"]
  },
  "enforce_admins": true,
  "restrictions": null
}
EOF

# Protection dev (merge depuis feature/*)
gh api -X PUT repos/:owner/:repo/branches/dev/protection \
  --input - <<EOF
{
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "required_approving_review_count": 1
  },
  "required_status_checks": {
    "strict": true,
    "contexts": ["lint", "test-unit", "build"]
  },
  "enforce_admins": false,
  "restrictions": null
}
EOF

# Protection test (merge depuis dev)
gh api -X PUT repos/:owner/:repo/branches/test/protection \
  --input - <<EOF
{
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "required_approving_review_count": 1
  },
  "required_status_checks": {
    "strict": true,
    "contexts": ["lint", "test-unit", "test-e2e", "build"]
  },
  "enforce_admins": false,
  "restrictions": null
}
EOF
```

---

## CODEOWNERS (optionnel)

Créer `.github/CODEOWNERS` :

```
# Les owners par défaut
* @team-backend

# Modules spécifiques
/go_pharma_api/src/auth/ @team-auth
/go_pharma_api/src/admin/ @team-admin
```
