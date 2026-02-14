import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createWorkspacesSlice, type WorkspacesSlice } from './slices/workspacesSlice';
import { createPanesSlice, type PanesSlice } from './slices/panesSlice';
import { createLayoutSlice, type LayoutSlice } from './slices/layoutSlice';
import { createSettingsSlice, type SettingsSlice } from './slices/settingsSlice';

export type AppStore = WorkspacesSlice & PanesSlice & LayoutSlice & SettingsSlice;

export const useAppStore = create<AppStore>()(
  devtools(
    (...args) => ({
      ...createWorkspacesSlice(...args),
      ...createPanesSlice(...args),
      ...createLayoutSlice(...args),
      ...createSettingsSlice(...args),
    }),
    { name: 'AgentTabStore' }
  )
);

// Selector hooks for common patterns
export const useWorkspaces = () => useAppStore((state) => state.workspaces);
export const useActiveWorkspaceId = () => useAppStore((state) => state.activeWorkspaceId);
export const useActiveWorkspace = () =>
  useAppStore((state) =>
    state.workspaces.find((w) => w.id === state.activeWorkspaceId)
  );
