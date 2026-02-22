import type { StateCreator } from 'zustand';
import type { Pane, CreatePaneOptions, Message, PaneLayout } from '../../types';
import { generateId, DEFAULT_MODEL_CONFIG } from '../../utils';
import type { AppStore } from '../appStore';

const TERMINAL_HISTORY_LIMIT = 240000;

function normalizeTerminalChunk(chunk: string): string {
  let out = '';

  for (let i = 0; i < chunk.length; i += 1) {
    const code = chunk.charCodeAt(i);

    if (code === 27) {
      const next = chunk[i + 1];

      if (next === '[') {
        i += 2;
        while (i < chunk.length) {
          const c = chunk.charCodeAt(i);
          if (c >= 64 && c <= 126) break;
          i += 1;
        }
        continue;
      }

      if (next === ']') {
        i += 2;
        while (i < chunk.length) {
          const c = chunk.charCodeAt(i);
          if (c === 7) break;
          if (c === 27 && chunk[i + 1] === '\\') {
            i += 1;
            break;
          }
          i += 1;
        }
        continue;
      }

      continue;
    }

    if (code === 13 || code === 127) continue;
    if (code < 32 && code !== 10 && code !== 9) continue;

    out += chunk[i];
  }

  return out;
}

export interface PanesSlice {
  focusedPaneId: string | null;
  sendingPaneIds: Set<string>;
  terminalHistoryByPane: Record<string, string>;
  terminalRawHistoryByPane: Record<string, string>;
  unreadCountByPane: Record<string, number>;

  // Actions
  createPane: (workspaceId: string, options?: CreatePaneOptions) => string;
  deletePane: (workspaceId: string, paneId: string) => void;
  duplicatePane: (workspaceId: string, paneId: string) => string;
  updatePane: (workspaceId: string, paneId: string, updates: Partial<Pane>) => void;
  clearPane: (workspaceId: string, paneId: string) => void;
  updatePaneLayouts: (workspaceId: string, layouts: { id: string; layout: PaneLayout }[]) => void;
  reorderPanes: (workspaceId: string, oldIndex: number, newIndex: number) => void;

  // Terminal history
  appendTerminalOutput: (paneId: string, chunk: string) => void;
  clearTerminalHistory: (paneId: string) => void;
  markPaneRead: (paneId: string) => void;

  // Messages
  addMessage: (workspaceId: string, paneId: string, message: Message) => void;

  // Focus & sending state
  setFocusedPane: (paneId: string | null) => void;
  setSendingPane: (paneId: string, sending: boolean) => void;

  // Helpers
  getPane: (workspaceId: string, paneId: string) => Pane | undefined;
  getActiveWorkspacePanes: () => Pane[];
}

export const createPanesSlice: StateCreator<
  AppStore,
  [],
  [],
  PanesSlice
> = (set, get) => ({
  focusedPaneId: null,
  sendingPaneIds: new Set(),
  terminalHistoryByPane: {},
  terminalRawHistoryByPane: {},
  unreadCountByPane: {},

  createPane: (workspaceId, options = {}) => {
    const id = generateId();
    const workspace = get().workspaces.find((w) => w.id === workspaceId);
    const existingPanes = workspace?.panes || [];

    // Build occupancy grid to find empty cell
    const GRID_COLS = 3;
    const GRID_ROWS = 3;
    const grid = new Set<string>();

    for (const p of existingPanes) {
      for (let row = p.layout.y; row < p.layout.y + p.layout.h; row++) {
        for (let col = p.layout.x; col < p.layout.x + p.layout.w; col++) {
          grid.add(`${col},${row}`);
        }
      }
    }

    // Find first empty cell
    let x = 0;
    let y = 0;
    let found = false;

    for (let row = 0; row < GRID_ROWS && !found; row++) {
      for (let col = 0; col < GRID_COLS && !found; col++) {
        if (!grid.has(`${col},${row}`)) {
          x = col;
          y = row;
          found = true;
        }
      }
    }

    // If no empty cell found, don't create pane (grid is full)
    if (!found && existingPanes.length >= GRID_COLS * GRID_ROWS) {
      return '';
    }

    const pane: Pane = {
      id,
      title: options.title || 'New Pane',
      systemPrompt: options.systemPrompt || '',
      injectContext: options.injectContext ?? true,
      messages: [],
      modelConfig: { ...DEFAULT_MODEL_CONFIG, ...options.modelConfig },
      layout: { x, y, w: 1, h: 1 },
    };

    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === workspaceId
          ? { ...w, panes: [...w.panes, pane], dirty: true }
          : w
      ),
    }));

    return id;
  },

  deletePane: (workspaceId, paneId) => {
    set((state) => {
      const nextHistory = { ...state.terminalHistoryByPane };
      const nextRawHistory = { ...state.terminalRawHistoryByPane };
      const nextUnread = { ...state.unreadCountByPane };
      delete nextHistory[paneId];
      delete nextRawHistory[paneId];
      delete nextUnread[paneId];

      return {
        workspaces: state.workspaces.map((w) =>
          w.id === workspaceId
            ? { ...w, panes: w.panes.filter((p) => p.id !== paneId), dirty: true }
            : w
        ),
        focusedPaneId: state.focusedPaneId === paneId ? null : state.focusedPaneId,
        terminalHistoryByPane: nextHistory,
        terminalRawHistoryByPane: nextRawHistory,
        unreadCountByPane: nextUnread,
      };
    });
  },

  duplicatePane: (workspaceId, paneId) => {
    const pane = get().getPane(workspaceId, paneId);
    if (!pane) return '';

    const workspace = get().workspaces.find((w) => w.id === workspaceId);
    const existingPanes = workspace?.panes || [];

    // Build occupancy grid to find empty cell
    const GRID_COLS = 3;
    const GRID_ROWS = 3;
    const grid = new Set<string>();

    for (const p of existingPanes) {
      for (let row = p.layout.y; row < p.layout.y + p.layout.h; row++) {
        for (let col = p.layout.x; col < p.layout.x + p.layout.w; col++) {
          grid.add(`${col},${row}`);
        }
      }
    }

    // Find first empty cell
    let x = 0;
    let y = 0;
    let found = false;

    for (let row = 0; row < GRID_ROWS && !found; row++) {
      for (let col = 0; col < GRID_COLS && !found; col++) {
        if (!grid.has(`${col},${row}`)) {
          x = col;
          y = row;
          found = true;
        }
      }
    }

    // If no empty cell found, don't duplicate
    if (!found) {
      console.log('[panesSlice] Grid is full, cannot duplicate pane');
      return '';
    }

    const newId = generateId();
    const duplicated: Pane = {
      ...pane,
      id: newId,
      title: `${pane.title} (Copy)`,
      messages: [], // Start with empty messages
      layout: { x, y, w: 1, h: 1 }, // Place in empty cell with default size
    };

    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === workspaceId
          ? { ...w, panes: [...w.panes, duplicated], dirty: true }
          : w
      ),
    }));

    return newId;
  },

  updatePane: (workspaceId, paneId, updates) => {
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === workspaceId
          ? {
              ...w,
              panes: w.panes.map((p) =>
                p.id === paneId ? { ...p, ...updates } : p
              ),
              dirty: true,
            }
          : w
      ),
    }));
  },

  clearPane: (workspaceId, paneId) => {
    get().updatePane(workspaceId, paneId, { messages: [] });
  },

  updatePaneLayouts: (workspaceId, layouts) => {
    const GRID_COLS = 3;
    const GRID_ROWS = 3;

    // Validate and clamp layouts to grid bounds
    const validatedLayouts = layouts.map((l) => ({
      id: l.id,
      layout: {
        x: Math.max(0, Math.min(GRID_COLS - 1, l.layout.x)),
        y: Math.max(0, Math.min(GRID_ROWS - 1, l.layout.y)),
        w: Math.max(1, Math.min(GRID_COLS - l.layout.x, l.layout.w)),
        h: Math.max(1, Math.min(GRID_ROWS - l.layout.y, l.layout.h)),
      },
    }));

    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === workspaceId
          ? {
              ...w,
              panes: w.panes.map((p) => {
                const layoutUpdate = validatedLayouts.find((l) => l.id === p.id);
                return layoutUpdate ? { ...p, layout: layoutUpdate.layout } : p;
              }),
              dirty: true,
            }
          : w
      ),
    }));
  },

  reorderPanes: (workspaceId, oldIndex, newIndex) => {
    set((state) => ({
      workspaces: state.workspaces.map((w) => {
        if (w.id !== workspaceId) return w;
        const newPanes = [...w.panes];
        const [removed] = newPanes.splice(oldIndex, 1);
        newPanes.splice(newIndex, 0, removed);
        return { ...w, panes: newPanes, dirty: true };
      }),
    }));
  },

  appendTerminalOutput: (paneId, chunk) => {
    if (!chunk) return;

    set((state) => {
      const prevSearch = state.terminalHistoryByPane[paneId] ?? '';
      const appendedSearch = `${prevSearch}${normalizeTerminalChunk(chunk)}`;
      const nextSearch =
        appendedSearch.length > TERMINAL_HISTORY_LIMIT
          ? appendedSearch.slice(appendedSearch.length - TERMINAL_HISTORY_LIMIT)
          : appendedSearch;

      const prevRaw = state.terminalRawHistoryByPane[paneId] ?? '';
      const appendedRaw = `${prevRaw}${chunk}`;
      const nextRaw =
        appendedRaw.length > TERMINAL_HISTORY_LIMIT
          ? appendedRaw.slice(appendedRaw.length - TERMINAL_HISTORY_LIMIT)
          : appendedRaw;

      let paneWorkspaceId: string | null = null;
      for (const workspace of state.workspaces) {
        if (workspace.panes.some((p) => p.id === paneId)) {
          paneWorkspaceId = workspace.id;
          break;
        }
      }
      const isActiveWorkspacePane = paneWorkspaceId === state.activeWorkspaceId;
      const hasNoExplicitFocusInActiveWorkspace =
        isActiveWorkspacePane && state.focusedPaneId === null;
      const isFocusedActivePane =
        paneWorkspaceId === state.activeWorkspaceId && state.focusedPaneId === paneId;
      const nextUnreadCount = isFocusedActivePane
        || hasNoExplicitFocusInActiveWorkspace
        ? (state.unreadCountByPane[paneId] ?? 0)
        : (state.unreadCountByPane[paneId] ?? 0) + 1;

      return {
        terminalHistoryByPane: {
          ...state.terminalHistoryByPane,
          [paneId]: nextSearch,
        },
        terminalRawHistoryByPane: {
          ...state.terminalRawHistoryByPane,
          [paneId]: nextRaw,
        },
        unreadCountByPane: {
          ...state.unreadCountByPane,
          [paneId]: nextUnreadCount,
        },
      };
    });
  },

  clearTerminalHistory: (paneId) => {
    set((state) => {
      if (!state.terminalHistoryByPane[paneId] && !state.terminalRawHistoryByPane[paneId]) {
        return state;
      }
      const nextHistory = { ...state.terminalHistoryByPane };
      delete nextHistory[paneId];
      const nextRawHistory = { ...state.terminalRawHistoryByPane };
      delete nextRawHistory[paneId];
      return {
        terminalHistoryByPane: nextHistory,
        terminalRawHistoryByPane: nextRawHistory,
      };
    });
  },

  markPaneRead: (paneId) => {
    set((state) => {
      if (!state.unreadCountByPane[paneId]) return state;
      return {
        unreadCountByPane: {
          ...state.unreadCountByPane,
          [paneId]: 0,
        },
      };
    });
  },

  addMessage: (workspaceId, paneId, message) => {
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === workspaceId
          ? {
              ...w,
              panes: w.panes.map((p) =>
                p.id === paneId
                  ? { ...p, messages: [...p.messages, message] }
                  : p
              ),
              dirty: true,
            }
          : w
      ),
    }));
  },

  setFocusedPane: (paneId) => {
    set((state) => {
      if (!paneId) return { focusedPaneId: null };
      return {
        focusedPaneId: paneId,
        unreadCountByPane: state.unreadCountByPane[paneId]
          ? { ...state.unreadCountByPane, [paneId]: 0 }
          : state.unreadCountByPane,
      };
    });
  },

  setSendingPane: (paneId, sending) => {
    set((state) => {
      const newSet = new Set(state.sendingPaneIds);
      if (sending) {
        newSet.add(paneId);
      } else {
        newSet.delete(paneId);
      }
      return { sendingPaneIds: newSet };
    });
  },

  getPane: (workspaceId, paneId) => {
    return get()
      .workspaces.find((w) => w.id === workspaceId)
      ?.panes.find((p) => p.id === paneId);
  },

  getActiveWorkspacePanes: () => {
    const activeId = get().activeWorkspaceId;
    if (!activeId) return [];

    return get().workspaces.find((w) => w.id === activeId)?.panes || [];
  },
});
