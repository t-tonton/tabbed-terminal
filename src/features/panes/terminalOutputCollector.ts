import { useEffect } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useAppStore } from '../../stores';

/**
 * Always-on PTY output collector.
 *
 * Previously each `Terminal` component owned the only `pty-output-<id>`
 * listener. Because inactive tabs unmount their `Terminal`, the listener (and
 * the store append it performed) was torn down whenever the user switched
 * tabs, so any output a backgrounded shell produced was emitted by the backend
 * with nobody listening and silently lost. Switching back then replayed an
 * incomplete history, corrupting the rendered screen.
 *
 * This module keeps one listener alive per pane for the pane's whole lifetime,
 * independent of which tab is mounted. Incoming chunks are always persisted to
 * the store, and additionally forwarded to a live xterm instance when one is
 * registered (i.e. when that pane's tab is currently visible).
 */

interface LiveTerminal {
  write: (data: string) => void;
  scrollToBottom: () => void;
}

const EXIT_MARKER = '\r\n\x1b[1;31m[Process exited]\x1b[0m\r\n';

/** Pending/active listener handles, keyed by paneId. Presence = listener owned. */
const listeners = new Map<string, Promise<UnlistenFn[]>>();
/** Live xterm instances for currently-mounted panes, keyed by paneId. */
const liveTerminals = new Map<string, LiveTerminal>();

function pushChunk(paneId: string, chunk: string): void {
  if (!chunk) return;
  // Persist first so a remount always replays the complete stream.
  useAppStore.getState().appendTerminalOutput(paneId, chunk);
  // Forward to the visible terminal, if any, for live rendering.
  const live = liveTerminals.get(paneId);
  if (live) {
    live.write(chunk);
    live.scrollToBottom();
  }
}

/**
 * Ensure a persistent listener exists for `paneId`. Idempotent and safe to call
 * concurrently. Callers should await this before spawning the PTY so the very
 * first bytes of shell output are captured.
 */
export async function ensurePtyListener(paneId: string): Promise<void> {
  const existing = listeners.get(paneId);
  if (existing) {
    await existing;
    return;
  }

  const handlesPromise = Promise.all([
    listen<string>(`pty-output-${paneId}`, (event) => {
      pushChunk(paneId, event.payload);
    }),
    listen(`pty-exit-${paneId}`, () => {
      pushChunk(paneId, EXIT_MARKER);
    }),
  ]);

  listeners.set(paneId, handlesPromise);
  await handlesPromise;
}

/** Tear down the listener for a pane that no longer exists. */
export function removePtyListener(paneId: string): void {
  const handlesPromise = listeners.get(paneId);
  if (handlesPromise) {
    listeners.delete(paneId);
    handlesPromise
      .then((handles) => handles.forEach((unlisten) => unlisten()))
      .catch(() => {});
  }
  liveTerminals.delete(paneId);
}

/**
 * Attach a visible xterm so subsequent chunks render live. Must be called
 * synchronously right after replaying the stored history, so no chunk slips
 * through between the snapshot read and attachment.
 */
export function registerLiveTerminal(paneId: string, terminal: LiveTerminal): void {
  liveTerminals.set(paneId, terminal);
}

export function unregisterLiveTerminal(paneId: string, terminal: LiveTerminal): void {
  if (liveTerminals.get(paneId) === terminal) {
    liveTerminals.delete(paneId);
  }
}

function collectPaneIds(workspaces: ReturnType<typeof useAppStore.getState>['workspaces']): Set<string> {
  const ids = new Set<string>();
  workspaces.forEach((workspace) => workspace.panes.forEach((pane) => ids.add(pane.id)));
  return ids;
}

/**
 * Mount once (at the app root) to keep listeners in sync with the set of panes
 * that exist across all workspaces, creating listeners for new panes and
 * removing them when a pane is destroyed.
 */
export function useTerminalOutputCollector(): void {
  useEffect(() => {
    // `workspaces` keeps a stable reference while only terminal output changes,
    // so this guard makes the high-frequency output path essentially free.
    let lastWorkspaces: ReturnType<typeof useAppStore.getState>['workspaces'] | null = null;

    const sync = (state: ReturnType<typeof useAppStore.getState>) => {
      if (state.workspaces === lastWorkspaces) return;
      lastWorkspaces = state.workspaces;

      const ids = collectPaneIds(state.workspaces);
      ids.forEach((id) => {
        void ensurePtyListener(id);
      });
      for (const id of [...listeners.keys()]) {
        if (!ids.has(id)) removePtyListener(id);
      }
    };

    sync(useAppStore.getState());
    const unsubscribe = useAppStore.subscribe(sync);
    return () => unsubscribe();
  }, []);
}
