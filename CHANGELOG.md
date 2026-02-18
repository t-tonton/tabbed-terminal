# Changelog

All notable changes to this project are documented in this file.

## v0.2.0 - 2026-02-18

### Added
- Workspace-wide pane history search (`Cmd/Ctrl + Shift + F`) with result navigation.
- In-pane search (`Cmd/Ctrl + F`) for terminal output.
- Workspace save and restore workflow via `Cmd/Ctrl + S` and startup restore.
- Test coverage for keyboard shortcuts, initialization flow, TabBar behavior, and store slices.
- Local quality gates and CI checks to run lint/test/build/cargo-check consistently.

### Fixed
- Workspace close behavior to avoid blocked close actions in dirty state.
- Tab close affordance visibility improvements in the tab bar.
- Pane terminal history handling and related search wiring stability.
