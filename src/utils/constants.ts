export const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export const DEFAULT_MODEL_CONFIG = {
  model: DEFAULT_MODEL,
  temperature: 0.7,
  maxTokens: 4096,
} as const;

export const AVAILABLE_MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
] as const;
