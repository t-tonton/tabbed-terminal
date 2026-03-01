import type { StateCreator } from 'zustand';
import type { AppStore } from '../appStore';

export interface LayoutSlice {
  // UI state
  sideDrawerOpen: boolean;
  isNewTabModalOpen: boolean;
  isNewPaneModalOpen: boolean;
  isPaneSwitcherOpen: boolean;
  isSnippetPickerOpen: boolean;
  isFileTreeOpen: boolean;
  isGridSettingsOpen: boolean;
  isWorkspaceSearchOpen: boolean;
  isRelayPanelOpen: boolean;
  editingPaneId: string | null;

  // Actions
  toggleSideDrawer: () => void;
  setSideDrawerOpen: (open: boolean) => void;
  openNewTabModal: () => void;
  closeNewTabModal: () => void;
  openNewPaneModal: () => void;
  closeNewPaneModal: () => void;
  openPaneSwitcher: () => void;
  closePaneSwitcher: () => void;
  openPaneEditor: (paneId: string) => void;
  closePaneEditor: () => void;
  openSnippetPicker: () => void;
  closeSnippetPicker: () => void;
  openFileTree: () => void;
  closeFileTree: () => void;
  toggleFileTree: () => void;
  openGridSettings: () => void;
  closeGridSettings: () => void;
  openWorkspaceSearch: () => void;
  closeWorkspaceSearch: () => void;
  openRelayPanel: () => void;
  closeRelayPanel: () => void;
}

export const createLayoutSlice: StateCreator<
  AppStore,
  [],
  [],
  LayoutSlice
> = (set) => ({
  sideDrawerOpen: false,
  isNewTabModalOpen: false,
  isNewPaneModalOpen: false,
  isPaneSwitcherOpen: false,
  isSnippetPickerOpen: false,
  isFileTreeOpen: false,
  isGridSettingsOpen: false,
  isWorkspaceSearchOpen: false,
  isRelayPanelOpen: false,
  editingPaneId: null,

  toggleSideDrawer: () => {
    set((state) => ({ sideDrawerOpen: !state.sideDrawerOpen }));
  },

  setSideDrawerOpen: (open) => {
    set({ sideDrawerOpen: open });
  },

  openNewTabModal: () => {
    set({ isNewTabModalOpen: true });
  },

  closeNewTabModal: () => {
    set({ isNewTabModalOpen: false });
  },

  openNewPaneModal: () => {
    set({ isNewPaneModalOpen: true });
  },

  closeNewPaneModal: () => {
    set({ isNewPaneModalOpen: false });
  },

  openPaneSwitcher: () => {
    set({ isPaneSwitcherOpen: true });
  },

  closePaneSwitcher: () => {
    set({ isPaneSwitcherOpen: false });
  },

  openPaneEditor: (paneId) => {
    set({ editingPaneId: paneId });
  },

  closePaneEditor: () => {
    set({ editingPaneId: null });
  },

  openSnippetPicker: () => {
    set({ isSnippetPickerOpen: true });
  },

  closeSnippetPicker: () => {
    set({ isSnippetPickerOpen: false });
  },

  openFileTree: () => {
    set({ isFileTreeOpen: true });
  },

  closeFileTree: () => {
    set({ isFileTreeOpen: false });
  },

  toggleFileTree: () => {
    set((state) => ({ isFileTreeOpen: !state.isFileTreeOpen }));
  },

  openGridSettings: () => {
    set({ isGridSettingsOpen: true });
  },

  closeGridSettings: () => {
    set({ isGridSettingsOpen: false });
  },

  openWorkspaceSearch: () => {
    set({ isWorkspaceSearchOpen: true });
  },

  closeWorkspaceSearch: () => {
    set({ isWorkspaceSearchOpen: false });
  },

  openRelayPanel: () => {
    set({ isRelayPanelOpen: true });
  },

  closeRelayPanel: () => {
    set({ isRelayPanelOpen: false });
  },
});
