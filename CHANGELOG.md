# Changelog

All notable changes to this project are documented in this file.

## v0.4.1 - 2026-02-22

### Maintenance
- Automated patch version bump to `v0.4.1`.
- Source merged PR: (not provided).
## v0.4.0 - 2026-02-22

### Added
- Unread indicators for inactive panes and tab-level unread count badges.
- Initial focus handling for newly created/switching workspaces to reduce missed context.

### Fixed
- False unread notifications on initial/empty terminal output chunks.
- Pane close button usability (larger hit area, drag interference prevention, icon/hit-area alignment).
- Pane resize behavior for symmetric left-right resizing and top-edge expansion.
- Drag preview sizing mismatch during pane move operations.

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
