import type { StateCreator } from 'zustand';
import type { Workspace, WorkspaceTemplate } from '../../types';
import { DEFAULT_MODEL_CONFIG, generateId } from '../../utils';
import type { AppStore } from '../appStore';

export interface WorkspacesSlice {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;

  // Actions
  createWorkspace: (template?: WorkspaceTemplate, name?: string) => string;
  deleteWorkspace: (id: string) => void;
  setActiveWorkspace: (id: string) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  setProjectContext: (workspaceId: string, context: string) => void;
  markDirty: (workspaceId: string) => void;
  markClean: (workspaceId: string) => void;
  reorderWorkspaces: (fromIndex: number, toIndex: number) => void;

  // Tab navigation
  nextTab: () => void;
  prevTab: () => void;
}

export const createWorkspacesSlice: StateCreator<
  AppStore,
  [],
  [],
  WorkspacesSlice
> = (set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,

  createWorkspace: (template = 'blank', name) => {
    const id = generateId();
    const defaultPaneId = generateId();
    const now = new Date().toISOString();

    const workspace: Workspace = {
      id,
      name: name || `Workspace ${get().workspaces.length + 1}`,
      template,
      projectContext: '',
      panes: [
        {
          id: defaultPaneId,
          title: 'Pane 1',
          systemPrompt: '',
          injectContext: true,
          messages: [],
          modelConfig: { ...DEFAULT_MODEL_CONFIG },
          layout: { x: 0, y: 0, w: 1, h: 1 },
        },
      ],
      layout: { direction: 'horizontal', sizes: [] },
      promptPresets: [],
      dirty: false,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      workspaces: [...state.workspaces, workspace],
      activeWorkspaceId: id,
      focusedPaneId: defaultPaneId,
    }));

    return id;
  },

  deleteWorkspace: (id) => {
    set((state) => {
      const removedWorkspace = state.workspaces.find((w) => w.id === id);
      const removedPaneIds = new Set(removedWorkspace?.panes.map((pane) => pane.id) ?? []);
      const newWorkspaces = state.workspaces.filter((w) => w.id !== id);
      const newActiveId =
        state.activeWorkspaceId === id
          ? newWorkspaces[0]?.id ?? null
          : state.activeWorkspaceId;

      if (removedPaneIds.size === 0) {
        return { workspaces: newWorkspaces, activeWorkspaceId: newActiveId };
      }

      const nextTerminalHistoryByPane: Record<string, string> = {};
      for (const [paneId, history] of Object.entries(state.terminalHistoryByPane)) {
        if (!removedPaneIds.has(paneId)) {
          nextTerminalHistoryByPane[paneId] = history;
        }
      }

      const nextTerminalRawHistoryByPane: Record<string, string> = {};
      for (const [paneId, history] of Object.entries(state.terminalRawHistoryByPane)) {
        if (!removedPaneIds.has(paneId)) {
          nextTerminalRawHistoryByPane[paneId] = history;
        }
      }

      const nextUnreadCountByPane: Record<string, number> = {};
      for (const [paneId, unread] of Object.entries(state.unreadCountByPane)) {
        if (!removedPaneIds.has(paneId)) {
          nextUnreadCountByPane[paneId] = unread;
        }
      }

      const newActiveWorkspace = newWorkspaces.find((w) => w.id === newActiveId);
      const nextFocusedPaneId =
        state.focusedPaneId &&
        !removedPaneIds.has(state.focusedPaneId) &&
        newActiveWorkspace?.panes.some((pane) => pane.id === state.focusedPaneId)
          ? state.focusedPaneId
          : newActiveWorkspace?.panes[0]?.id ?? null;

      return {
        workspaces: newWorkspaces,
        activeWorkspaceId: newActiveId,
        focusedPaneId: nextFocusedPaneId,
        terminalHistoryByPane: nextTerminalHistoryByPane,
        terminalRawHistoryByPane: nextTerminalRawHistoryByPane,
        unreadCountByPane: nextUnreadCountByPane,
      };
    });
  },

  setActiveWorkspace: (id) => {
    set((state) => {
      const targetWorkspace = state.workspaces.find((workspace) => workspace.id === id);
      if (!targetWorkspace) return state;

      const keepFocused =
        state.focusedPaneId &&
        targetWorkspace.panes.some((pane) => pane.id === state.focusedPaneId);

      return {
        activeWorkspaceId: id,
        focusedPaneId: keepFocused ? state.focusedPaneId : targetWorkspace.panes[0]?.id ?? null,
      };
    });
  },

  updateWorkspace: (id, updates) => {
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === id
          ? { ...w, ...updates, updatedAt: new Date().toISOString() }
          : w
      ),
    }));
  },

  setProjectContext: (workspaceId, context) => {
    const { updateWorkspace, markDirty } = get();
    updateWorkspace(workspaceId, { projectContext: context });
    markDirty(workspaceId);
  },

  markDirty: (workspaceId) => {
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === workspaceId ? { ...w, dirty: true } : w
      ),
    }));
  },

  markClean: (workspaceId) => {
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === workspaceId ? { ...w, dirty: false } : w
      ),
    }));
  },

  reorderWorkspaces: (fromIndex, toIndex) => {
    set((state) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.workspaces.length ||
        toIndex >= state.workspaces.length ||
        fromIndex === toIndex
      ) {
        return state;
      }

      const next = [...state.workspaces];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { workspaces: next };
    });
  },

  nextTab: () => {
    const { workspaces, activeWorkspaceId, setActiveWorkspace } = get();
    if (workspaces.length === 0) return;

    const currentIndex = workspaces.findIndex((w) => w.id === activeWorkspaceId);
    const nextIndex = (currentIndex + 1) % workspaces.length;
    setActiveWorkspace(workspaces[nextIndex].id);
  },

  prevTab: () => {
    const { workspaces, activeWorkspaceId, setActiveWorkspace } = get();
    if (workspaces.length === 0) return;

    const currentIndex = workspaces.findIndex((w) => w.id === activeWorkspaceId);
    const prevIndex = (currentIndex - 1 + workspaces.length) % workspaces.length;
    setActiveWorkspace(workspaces[prevIndex].id);
  },
});
