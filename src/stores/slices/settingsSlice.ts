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

  // Actions
  setApiKeyConfigured: (configured: boolean) => void;
  setDefaultModel: (model: string) => void;
  setDefaultTemperature: (temp: number) => void;
  setDefaultMaxTokens: (tokens: number) => void;
  setIsSaving: (saving: boolean) => void;
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
