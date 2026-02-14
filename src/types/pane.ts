import type { Message } from './message';

export interface ModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface PaneLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Pane {
  id: string;
  title: string;
  systemPrompt: string;
  injectContext: boolean;
  messages: Message[];
  modelConfig: ModelConfig;
  layout: PaneLayout;
}

export interface CreatePaneOptions {
  title?: string;
  systemPrompt?: string;
  injectContext?: boolean;
  modelConfig?: Partial<ModelConfig>;
}
