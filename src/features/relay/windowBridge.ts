import { useEffect, useMemo, useRef } from 'react';
import { useActiveWorkspace, useAppStore } from '../../stores';

export interface RelayPaneSnapshot {
  id: string;
  title: string;
}

export interface RelayStateSnapshot {
  sourcePaneId: string | null;
  panes: RelayPaneSnapshot[];
}

export const RELAY_WINDOW_LABEL = 'relay';
const RELAY_STATE_REQUEST_EVENT = 'relay-sync-state-request';
const RELAY_STATE_EVENT = 'relay-sync-state';

function computeRelaySnapshot(
  panes: RelayPaneSnapshot[],
  focusedPaneId: string | null
): RelayStateSnapshot {
  const sourcePaneId = panes.some((pane) => pane.id === focusedPaneId)
    ? focusedPaneId
    : (panes[0]?.id ?? null);
  return { sourcePaneId, panes };
}

export async function openRelayWindow(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const existing = await WebviewWindow.getByLabel(RELAY_WINDOW_LABEL);
    if (existing) {
      await existing.show();
      await existing.setFocus();
      return true;
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('view', 'relay');
    const relayWindow = new WebviewWindow(RELAY_WINDOW_LABEL, {
      url: nextUrl.toString(),
      title: 'Relay',
      width: 520,
      height: 700,
      minWidth: 420,
      minHeight: 520,
      resizable: true,
      center: true,
    });

    const created = await new Promise<boolean>((resolve) => {
      relayWindow.once('tauri://created', () => resolve(true));
      relayWindow.once('tauri://error', (event) => {
        console.error('[relay] failed to create relay window:', event.payload);
        resolve(false);
      });
    });

    if (created) {
      await relayWindow.show();
      await relayWindow.setFocus();
    }
    return created;
  } catch {
    return false;
  }
}

export function useRelayStateBridge(): void {
  const activeWorkspace = useActiveWorkspace();
  const focusedPaneId = useAppStore((state) => state.focusedPaneId);

  const panes = useMemo(
    () =>
      (activeWorkspace?.panes ?? []).map((pane) => ({
        id: pane.id,
        title: pane.title,
      })),
    [activeWorkspace]
  );
  const snapshot = useMemo(
    () => computeRelaySnapshot(panes, focusedPaneId),
    [focusedPaneId, panes]
  );
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      try {
        const [{ emitTo, listen }, { getCurrentWebviewWindow }] = await Promise.all([
          import('@tauri-apps/api/event'),
          import('@tauri-apps/api/webviewWindow'),
        ]);

        if (getCurrentWebviewWindow().label !== 'main') return;

        unlisten = await listen(RELAY_STATE_REQUEST_EVENT, async () => {
          await emitTo(RELAY_WINDOW_LABEL, RELAY_STATE_EVENT, snapshotRef.current);
        });
      } catch {
        // Non-Tauri runtime.
      }
    };

    void setup();
    return () => {
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    const broadcast = async () => {
      try {
        const [{ emitTo }, { getCurrentWebviewWindow }] = await Promise.all([
          import('@tauri-apps/api/event'),
          import('@tauri-apps/api/webviewWindow'),
        ]);
        if (getCurrentWebviewWindow().label !== 'main') return;
        await emitTo(RELAY_WINDOW_LABEL, RELAY_STATE_EVENT, snapshot);
      } catch {
        // Non-Tauri runtime.
      }
    };

    void broadcast();
  }, [snapshot]);
}

export async function requestRelayStateFromMain(): Promise<void> {
  try {
    const { emitTo } = await import('@tauri-apps/api/event');
    await emitTo('main', RELAY_STATE_REQUEST_EVENT);
  } catch {
    // Non-Tauri runtime.
  }
}

export function relayStateEventName(): string {
  return RELAY_STATE_EVENT;
}
