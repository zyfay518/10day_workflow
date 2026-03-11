# Branching Workflow

## Goal
Keep `main` clean and releasable. Do daily work on branch lines, then merge to `main` only when ready to release.

## Branch Strategy
- `main`: release/stable only
- `develop`: integration branch for normal day-to-day work
- `feature/*`: optional short-lived branches for specific tasks (recommended for medium/large changes)

## Daily Flow
1. Start from `develop`:
   - `git checkout develop`
   - `git pull`
2. Create task branch (optional but recommended):
   - `git checkout -b feature/<topic>`
3. Develop + commit
4. Push branch and open PR to `develop`
5. After testing/verification, open PR: `develop` -> `main`
6. Tag release on `main` when needed

## Release Gate (before merge to main)
- `npm run lint`
- `npm run build`
- smoke check critical flows (Record / History / Goals / i18n switch)

## Hotfix
For urgent production fixes:
1. Create `hotfix/<topic>` from `main`
2. Fix + PR to `main`
3. Cherry-pick or merge same fix back to `develop`

## Branch Protection (GitHub settings recommended)
Protect `main`:
- Require pull request before merge
- Require at least 1 approval
- Require status checks to pass (lint/build)
- Disable force push
- Disable direct deletion
