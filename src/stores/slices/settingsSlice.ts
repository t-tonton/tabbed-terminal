import type { StateCreator } from 'zustand';
import { DEFAULT_MODEL, DEFAULT_MODEL_CONFIG } from '../../utils';
import type { AppStore } from '../appStore';

export interface SettingsSlice {
  apiKeyConfigured: boolean;
  defaultModel: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  isSaving: boolean;
  terminalFontSize: number;
  paneGridSize: 3 | 4;

  // Actions
  setApiKeyConfigured: (configured: boolean) => void;
  setDefaultModel: (model: string) => void;
  setDefaultTemperature: (temp: number) => void;
  setDefaultMaxTokens: (tokens: number) => void;
  setIsSaving: (saving: boolean) => void;
  setPaneGridSize: (size: 3 | 4) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

const DEFAULT_FONT_SIZE = 13;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 24;
const FONT_SIZE_STEP = 1;

export const createSettingsSlice: StateCreator<
  AppStore,
  [],
  [],
  SettingsSlice
> = (set) => ({
  apiKeyConfigured: false,
  defaultModel: DEFAULT_MODEL,
  defaultTemperature: DEFAULT_MODEL_CONFIG.temperature,
  defaultMaxTokens: DEFAULT_MODEL_CONFIG.maxTokens,
  isSaving: false,
  terminalFontSize: DEFAULT_FONT_SIZE,
  paneGridSize: 3,

  setApiKeyConfigured: (configured) => {
    set({ apiKeyConfigured: configured });
  },

  setDefaultModel: (model) => {
    set({ defaultModel: model });
  },

  setDefaultTemperature: (temp) => {
    set({ defaultTemperature: temp });
  },

  setDefaultMaxTokens: (tokens) => {
    set({ defaultMaxTokens: tokens });
  },

  setIsSaving: (saving) => {
    set({ isSaving: saving });
  },

  setPaneGridSize: (size) => {
    set((state) => ({
      paneGridSize: size,
      workspaces: state.workspaces.map((workspace) => {
        let workspaceChanged = false;
        const panes = workspace.panes.map((pane) => {
          const x = Math.max(0, Math.min(size - 1, pane.layout.x));
          const y = Math.max(0, Math.min(size - 1, pane.layout.y));
          const w = Math.max(1, Math.min(size - x, pane.layout.w));
          const h = Math.max(1, Math.min(size - y, pane.layout.h));
          const changed =
            x !== pane.layout.x
            || y !== pane.layout.y
            || w !== pane.layout.w
            || h !== pane.layout.h;
          if (!changed) return pane;
          workspaceChanged = true;
          return {
            ...pane,
            layout: { x, y, w, h },
          };
        });
        if (!workspaceChanged) return workspace;
        return {
          ...workspace,
          panes,
          dirty: true,
        };
      }),
    }));
  },

  zoomIn: () => {
    set((state) => ({
      terminalFontSize: Math.min(state.terminalFontSize + FONT_SIZE_STEP, MAX_FONT_SIZE),
    }));
  },

  zoomOut: () => {
    set((state) => ({
      terminalFontSize: Math.max(state.terminalFontSize - FONT_SIZE_STEP, MIN_FONT_SIZE),
    }));
  },

  resetZoom: () => {
    set({ terminalFontSize: DEFAULT_FONT_SIZE });
  },
});
