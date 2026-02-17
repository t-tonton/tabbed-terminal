import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createWorkspacesSlice, type WorkspacesSlice } from './slices/workspacesSlice';
import { createPanesSlice, type PanesSlice } from './slices/panesSlice';
import { createLayoutSlice, type LayoutSlice } from './slices/layoutSlice';
import { createSettingsSlice, type SettingsSlice } from './slices/settingsSlice';
import { createSnippetsSlice, type SnippetsSlice } from './slices/snippetsSlice';

export type AppStore = WorkspacesSlice & PanesSlice & LayoutSlice & SettingsSlice & SnippetsSlice;

export const useAppStore = create<AppStore>()(
  devtools(
    (...args) => ({
      ...createWorkspacesSlice(...args),
      ...createPanesSlice(...args),
      ...createLayoutSlice(...args),
      ...createSettingsSlice(...args),
      ...createSnippetsSlice(...args),
    }),
    { name: 'TabbedTerminalStore' }
  )
);

// Selector hooks for common patterns
export const useWorkspaces = () => useAppStore((state) => state.workspaces);
export const useActiveWorkspaceId = () => useAppStore((state) => state.activeWorkspaceId);
export const useActiveWorkspace = () =>
  useAppStore((state) =>
    state.workspaces.find((w) => w.id === state.activeWorkspaceId)
  );
