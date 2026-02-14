import type { StateCreator } from 'zustand';
import type { Pane, CreatePaneOptions, Message, PaneLayout } from '../../types';
import { generateId, DEFAULT_MODEL_CONFIG } from '../../utils';
import type { AppStore } from '../appStore';

export interface PanesSlice {
  focusedPaneId: string | null;
  sendingPaneIds: Set<string>;

  // Actions
  createPane: (workspaceId: string, options?: CreatePaneOptions) => string;
  deletePane: (workspaceId: string, paneId: string) => void;
  duplicatePane: (workspaceId: string, paneId: string) => string;
  updatePane: (workspaceId: string, paneId: string, updates: Partial<Pane>) => void;
  clearPane: (workspaceId: string, paneId: string) => void;
  updatePaneLayouts: (workspaceId: string, layouts: { id: string; layout: PaneLayout }[]) => void;
  reorderPanes: (workspaceId: string, oldIndex: number, newIndex: number) => void;

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
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === workspaceId
          ? { ...w, panes: w.panes.filter((p) => p.id !== paneId), dirty: true }
          : w
      ),
      focusedPaneId: state.focusedPaneId === paneId ? null : state.focusedPaneId,
    }));
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
    set({ focusedPaneId: paneId });
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
    const workspace = get().workspaces.find((w) => w.id === workspaceId);
    return workspace?.panes.find((p) => p.id === paneId);
  },

  getActiveWorkspacePanes: () => {
    const { workspaces, activeWorkspaceId } = get();
    return workspaces.find((w) => w.id === activeWorkspaceId)?.panes ?? [];
  },
});
