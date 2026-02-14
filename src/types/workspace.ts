import type { Pane } from './pane';

export type WorkspaceTemplate = 'new-product' | 'maintenance' | 'spike' | 'blank';

export interface PromptPreset {
  id: string;
  name: string;
  systemPrompt: string;
  description?: string;
}

export interface LayoutConfig {
  direction: 'horizontal' | 'vertical';
  sizes: number[];
}

export interface Workspace {
  id: string;
  name: string;
  template: WorkspaceTemplate;
  projectContext: string;
  panes: Pane[];
  layout: LayoutConfig;
  promptPresets: PromptPreset[];
  dirty: boolean;
  createdAt: string;
  updatedAt: string;
}
