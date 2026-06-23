import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { handlers } = vi.hoisted(() => ({
  handlers: new Map<string, (event: { payload: unknown }) => void>(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async (event: string, cb: (event: { payload: unknown }) => void) => {
    handlers.set(event, cb);
    return () => handlers.delete(event);
  }),
}));

import {
  ensurePtyListener,
  registerLiveTerminal,
  removePtyListener,
  unregisterLiveTerminal,
} from './terminalOutputCollector';
import { useAppStore } from '../../stores';

function emit(paneId: string, payload: string) {
  handlers.get(`pty-output-${paneId}`)?.({ payload });
}

describe('terminalOutputCollector', () => {
  beforeEach(() => {
    handlers.clear();
  });

  afterEach(() => {
    removePtyListener('pane-bg');
    removePtyListener('pane-live');
    useAppStore.getState().clearTerminalHistory('pane-bg');
    useAppStore.getState().clearTerminalHistory('pane-live');
  });

  it('persists output to the store even when no live terminal is attached', async () => {
    await ensurePtyListener('pane-bg');

    // Simulate the backend emitting while the pane's tab is backgrounded
    // (no Terminal component mounted, so no live terminal registered).
    emit('pane-bg', 'background output');

    expect(useAppStore.getState().terminalRawHistoryByPane['pane-bg']).toBe('background output');
  });

  it('forwards output to a registered live terminal and stops after unregister', async () => {
    await ensurePtyListener('pane-live');
    const live = { write: vi.fn(), scrollToBottom: vi.fn() };
    registerLiveTerminal('pane-live', live);

    emit('pane-live', 'visible chunk');
    expect(live.write).toHaveBeenCalledWith('visible chunk');
    expect(useAppStore.getState().terminalRawHistoryByPane['pane-live']).toBe('visible chunk');

    unregisterLiveTerminal('pane-live', live);
    emit('pane-live', ' more');

    // Live terminal no longer receives chunks, but the store keeps accumulating.
    expect(live.write).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().terminalRawHistoryByPane['pane-live']).toBe('visible chunk more');
  });

  it('only registers a listener once per pane', async () => {
    const { listen } = await import('@tauri-apps/api/event');
    const callsBefore = (listen as ReturnType<typeof vi.fn>).mock.calls.length;

    await ensurePtyListener('pane-bg');
    await ensurePtyListener('pane-bg');

    // Two listen() calls (pty-output + pty-exit) for the first ensure, none for the second.
    expect((listen as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsBefore + 2);
  });
});
