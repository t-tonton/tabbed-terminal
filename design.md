You are a senior engineer building a production-quality desktop app.

Build a Tauri v2 + React + TypeScript + Tailwind application: a “Tabbed Multi-Pane AI Terminal IDE”.

# Core Goal
Users develop multiple products in parallel.
Each product is a Workspace shown as a Tab.
Inside each tab, users can run multiple independent Claude chat panes in a resizable layout.
Workspaces must keep contexts and chat histories isolated.

# Tech Stack (must follow)
- Tauri v2
- React + TypeScript (strict)
- Tailwind CSS
- Layout: react-resizable-panels
- State: Zustand
- Persistence: local filesystem JSON using Tauri fs plugin
- LLM: Anthropic Claude API (MVP uses fetch; key stored locally; never logged)

# Data Model
App state:
- workspaces[] (tabs)
- activeWorkspaceId
- globalSettings (optional)
Workspace:
- id, name
- projectContext (workspace-specific)
- panes[] (each pane is a Claude session)
- layout config
- promptPresets[] (name + systemPrompt) to quickly create panes
- dirty flag for unsaved changes
Pane:
- id, title
- systemPrompt
- injectContext boolean
- messages[] (role: user|assistant, content)
- modelConfig (model, temperature, max_tokens)

# Workspace Templates (must implement)
Provide 3 workspace templates when creating a new tab:
A) New Product: panes = Planner/Coder/Reviewer/PM
B) Maintenance: panes = Triage/Coder/Reviewer/Release
C) Spike: panes = Researcher/Architect/Skeptic/Summarizer
Each template also installs promptPresets for those roles (system prompts).

# Behavior
- Tab switch changes current workspace, its context, panes, presets, and layout.
- Sending in a pane builds request:
  systemPrompt + (if injectContext) projectContext + messages + new user message
- Call Claude API and append assistant reply.
- Show inline error messages in transcript on failures.

# UI Requirements
- Dark theme, IDE-like.
- Top Toolbar: API status, model selector, “New Pane”, “Save” indicator.
- Tab Bar below toolbar:
  - tabs with workspace names
  - + creates new tab (choose template)
  - x closes tab (confirm if dirty)
- Main area: resizable panes for active workspace.
- Each pane:
  - header (title) with buttons: edit system prompt, clear, duplicate, close
  - toggle: Inject Project Context
  - chat transcript with auto-scroll
  - input area at bottom; Cmd/Ctrl+Enter to send
- Side drawer: Project Context editor (workspace-specific) + Settings (API key, default model).
- Pane creation:
  - choose preset (role template) or blank
  - set title and system prompt

# Keyboard Shortcuts
- Cmd/Ctrl+Enter: send in focused pane
- Cmd/Ctrl+N: new pane in current workspace
- Cmd/Ctrl+S: save all workspaces
- Cmd/Ctrl+K: pane switcher within current workspace
- Cmd/Ctrl+T: new tab (workspace)
- Cmd/Ctrl+W: close current tab
- Cmd/Ctrl+Shift+]: next tab
- Cmd/Ctrl+Shift+[: previous tab

# Persistence
Save/load a single JSON:
- version
- activeWorkspaceId
- workspaces (including panes, presets, layout, context, settings, dirty state optional)
On startup: load last session automatically; if none, create default workspace with New Product template.

# Security
- API key stored locally; never logged.
- Avoid storing API key in the workspace JSON; store separately in settings.
- Provide a “Clear API key” button.

# Deliverables
1) Explain architecture and data flow.
2) Full runnable project with code and folder structure.
3) Exact commands to run locally.
4) README with shortcuts and templates.

Implementation order:
1) state model + tab UI + pane layout skeleton (no API)
2) add Claude API integration + settings
3) add persistence
4) polish UX (dirty indicator, confirmations)
