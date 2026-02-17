import type { StateCreator } from 'zustand';
import type { Snippet } from '../../types';
import { generateId } from '../../utils';
import type { AppStore } from '../appStore';

const STORAGE_KEY = 'tabbed-terminal-snippets-v1';

function readSnippetsFromStorage(): Snippet[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Snippet => {
        return typeof item?.id === 'string' &&
          typeof item?.title === 'string' &&
          typeof item?.command === 'string' &&
          typeof item?.createdAt === 'string' &&
          typeof item?.updatedAt === 'string';
      })
      .slice(0, 500);
  } catch {
    return [];
  }
}

function writeSnippetsToStorage(snippets: Snippet[]) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
  } catch {
    // Best-effort persistence.
  }
}

export interface SnippetsSlice {
  snippets: Snippet[];

  addSnippet: (title: string, command: string) => string;
  updateSnippet: (id: string, updates: { title?: string; command?: string }) => void;
  deleteSnippet: (id: string) => void;
}

export const createSnippetsSlice: StateCreator<
  AppStore,
  [],
  [],
  SnippetsSlice
> = (set) => ({
  snippets: readSnippetsFromStorage(),

  addSnippet: (title, command) => {
    const trimmedTitle = title.trim();
    const trimmedCommand = command.trim();
    if (!trimmedTitle || !trimmedCommand) return '';

    const now = new Date().toISOString();
    const id = generateId();
    const snippet: Snippet = {
      id,
      title: trimmedTitle,
      command: trimmedCommand,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      const next = [snippet, ...state.snippets];
      writeSnippetsToStorage(next);
      return { snippets: next };
    });

    return id;
  },

  updateSnippet: (id, updates) => {
    set((state) => {
      const next = state.snippets.map((snippet) => {
        if (snippet.id !== id) return snippet;

        const title = updates.title?.trim();
        const command = updates.command?.trim();

        return {
          ...snippet,
          title: title || snippet.title,
          command: command || snippet.command,
          updatedAt: new Date().toISOString(),
        };
      });

      writeSnippetsToStorage(next);
      return { snippets: next };
    });
  },

  deleteSnippet: (id) => {
    set((state) => {
      const next = state.snippets.filter((snippet) => snippet.id !== id);
      writeSnippetsToStorage(next);
      return { snippets: next };
    });
  },
});
