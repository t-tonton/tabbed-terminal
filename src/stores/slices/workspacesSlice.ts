import type { StateCreator } from 'zustand';
import type { Workspace, WorkspaceTemplate } from '../../types';
import { generateId } from '../../utils';
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
    const now = new Date().toISOString();

    const workspace: Workspace = {
      id,
      name: name || `Workspace ${get().workspaces.length + 1}`,
      template,
      projectContext: '',
      panes: [],
      layout: { direction: 'horizontal', sizes: [] },
      promptPresets: [],
      dirty: false,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      workspaces: [...state.workspaces, workspace],
      activeWorkspaceId: id,
    }));

    return id;
  },

  deleteWorkspace: (id) => {
    set((state) => {
      const newWorkspaces = state.workspaces.filter((w) => w.id !== id);
      const newActiveId =
        state.activeWorkspaceId === id
          ? newWorkspaces[0]?.id ?? null
          : state.activeWorkspaceId;
      return { workspaces: newWorkspaces, activeWorkspaceId: newActiveId };
    });
  },

  setActiveWorkspace: (id) => {
    set({ activeWorkspaceId: id });
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
    const { workspaces, activeWorkspaceId } = get();
    if (workspaces.length === 0) return;

    const currentIndex = workspaces.findIndex((w) => w.id === activeWorkspaceId);
    const nextIndex = (currentIndex + 1) % workspaces.length;
    set({ activeWorkspaceId: workspaces[nextIndex].id });
  },

  prevTab: () => {
    const { workspaces, activeWorkspaceId } = get();
    if (workspaces.length === 0) return;

    const currentIndex = workspaces.findIndex((w) => w.id === activeWorkspaceId);
    const prevIndex = (currentIndex - 1 + workspaces.length) % workspaces.length;
    set({ activeWorkspaceId: workspaces[prevIndex].id });
  },
});
