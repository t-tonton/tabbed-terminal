import type { StateCreator } from 'zustand';
import type { AppStore } from '../appStore';

export interface LayoutSlice {
  // UI state
  sideDrawerOpen: boolean;
  isNewTabModalOpen: boolean;
  isNewPaneModalOpen: boolean;
  isPaneSwitcherOpen: boolean;
  isSnippetPickerOpen: boolean;
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
});
