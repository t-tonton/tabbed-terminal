# Contributing

## Branch Strategy
- `main`: deployable branch. direct push is not allowed.
- `feature/*`: new features and test additions.
- `fix/*`: bug fixes.
- `chore/*`: non-functional changes (docs, config, CI).

Branch name examples:
- `feature/test-tabbar-rename`
- `fix/pane-resize-overlap`
- `chore/update-release-workflow`

## Pull Request Rules
- All changes must be merged via PR.
- 1 PR = 1 logical change (or 1 Issue).
- Link related issue in PR body (`Closes #...` and note issue URL).
- Use `.github/pull_request_template.md`.
- Set exactly one release label on every PR:
  - `release:major` / `release:minor` / `release:patch`
- Keep PR small enough to review quickly.

## Local Quality Gates (pre-commit / pre-push)
Install hooks once after clone:

```bash
npm run hooks:install
```

Hook behavior:
- `pre-commit` runs `npm run check:fast` (`lint + test`)
- `pre-push` runs `npm run check:full` (`lint + test + build + cargo check`)

You can run them manually:

```bash
npm run check:fast
npm run check:full
```

## Required Checks Before Merge
Run these commands locally before opening PR:

```bash
npm run lint
npm run test
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

CI must pass on PR:
- `Web (lint + test + build)`
- `Tauri (cargo check)`
- `Require release:* label` (exactly one required)

## Release Draft Automation
- Release draft is auto-updated by `.github/workflows/release-drafter.yml` on:
  - push to `main`
  - PR label/content updates
- If multiple draft releases exist, workflow keeps only the latest draft automatically.
- Version bump priority is:
  - `release:major` > `release:minor` > `release:patch`
- `release:*` labels are used to classify change impact in draft notes; they do not auto-bump version on every merge.
- Run `.github/workflows/auto-version-bump.yml` manually (`workflow_dispatch`) when preparing a release.
- The workflow creates one version bump PR with title format: `chore: bump version to X.Y.Z`.

## macOS Release Artifacts
- Tagged releases (`v*`) in `.github/workflows/release.yml` publish non-DMG artifacts only.
- DMG files are excluded from CI artifact upload, checksum generation, and GitHub Release assets.
- Apple Developer Program–dependent notarization is not part of the current release pipeline.

## Review and Merge Policy
- At least one reviewer approval is required.
- Do not merge if unresolved review comments remain.
- Use `Squash and merge` by default for a clean history.

## Commit Message Convention
Use concise prefixes:
- `feat:` feature
- `fix:` bug fix
- `test:` tests
- `chore:` tooling/docs/config
- `ci:` CI workflow changes

Examples:
- `test: add Pane rename and close behavior tests`
- `ci: add release workflow for tag builds`

## Issue Management
This project tracks planning issues in:
- `https://github.com/t-tonton/tabbed-terminal/issues`

When work is done:
1. Add `対応PR: <PR URL>` comment to the related issue.
2. Close the related issue.

## Branch Protection (GitHub Settings)
For `main`, enable:
- Require a pull request before merging
- Require status checks to pass before merging
- Require approvals
- Restrict direct pushes
