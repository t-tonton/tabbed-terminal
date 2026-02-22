# Tabbed Terminal

A desktop terminal workspace app built with Tauri + React.

[日本語版 README](README.ja.md)

## Features

- Multiple workspaces (tabs)
- Reorder workspace tabs with drag and drop
- Multiple panes per workspace
- Pane rename / close / resize
- Native terminal copy & paste (`Cmd/Ctrl + C`, `Cmd/Ctrl + V`)
- Snippets picker for frequently used commands
  - Save / edit / delete snippets
  - Search snippets
  - Copy command to clipboard

## Demo

![Demo](docs/demo/demo.gif)
[Watch demo video](docs/demo/demo.webm)

Local recording command:

```bash
npm run demo:record
```

The generated file is saved to `docs/demo/demo.webm`.

## Shortcuts

- `Cmd/Ctrl + T`: New workspace
- `Cmd/Ctrl + W`: Close current workspace
- `Cmd/Ctrl + N`: New pane
- `Cmd/Ctrl + S`: Save current workspace snapshot
- `Cmd/Ctrl + Shift + P`: Open snippets picker
- `Cmd/Ctrl + F`: Find in focused pane
- `Cmd/Ctrl + Shift + F`: Search across all pane history in workspaces
- `Cmd/Ctrl + 1..9`: Switch workspace by number
- `Cmd/Ctrl + Shift + [` / `]`: Previous / next workspace
- `Cmd/Ctrl + =`, `-`, `0`: Zoom in / out / reset

## Known Limitations

- Sidebar currently shows only active features (search / new pane / snippets)
- Snippets picker is currently modal (background is locked while open)
- Snippets are stored in local browser storage for now
- Workspace save/restore currently uses local storage (Tauri fs persistence is planned)
- Build shows chunk-size warning in Vite output (not a release blocker)

## Development

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run build
npm run tauri build
```

## Quality Gates

```bash
npm run lint
npm run test
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## Issue Reporting

- Report bugs and feature requests via:
  - `https://github.com/t-tonton/tabbed-terminal/issues`

## Contribution Guide

See `CONTRIBUTING.md` for branch strategy, PR rules, and merge policy.

## License

MIT. See `LICENSE`.
