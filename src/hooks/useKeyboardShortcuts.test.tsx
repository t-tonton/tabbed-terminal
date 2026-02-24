import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useAppStore } from '../stores';

function createWorkspace() {
  const now = new Date().toISOString();
  return {
    id: 'ws-1',
    name: 'Workspace 1',
    template: 'blank' as const,
    projectContext: '',
    panes: [],
    layout: { direction: 'horizontal' as const, sizes: [] },
    promptPresets: [],
    dirty: false,
    createdAt: now,
    updatedAt: now,
  };
}

function KeyboardShortcutHarness() {
  useKeyboardShortcuts();
  return null;
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    useAppStore.setState({
      workspaces: [createWorkspace()],
      activeWorkspaceId: 'ws-1',
      isWorkspaceSearchOpen: false,
      isGridSettingsOpen: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens pane search on Cmd/Ctrl+F', () => {
    const listener = vi.fn();
    window.addEventListener('pane-search-open', listener);

    render(<KeyboardShortcutHarness />);

    const metaEvent = new KeyboardEvent('keydown', {
      key: 'f',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(metaEvent);

    const ctrlEvent = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(ctrlEvent);

    expect(metaEvent.defaultPrevented).toBe(true);
    expect(ctrlEvent.defaultPrevented).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);

    window.removeEventListener('pane-search-open', listener);
  });

  it('opens workspace search on Cmd/Ctrl+Shift+F', () => {
    render(<KeyboardShortcutHarness />);

    const metaEvent = new KeyboardEvent('keydown', {
      key: 'F',
      metaKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(metaEvent);
    expect(metaEvent.defaultPrevented).toBe(true);
    expect(useAppStore.getState().isWorkspaceSearchOpen).toBe(true);

    useAppStore.setState({ isWorkspaceSearchOpen: false });

    const ctrlEvent = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(ctrlEvent);

    expect(ctrlEvent.defaultPrevented).toBe(true);
    expect(useAppStore.getState().isWorkspaceSearchOpen).toBe(true);
  });

  it('opens relay panel on Cmd/Ctrl+Shift+R in non-Tauri runtime', async () => {
    useAppStore.setState({ isRelayPanelOpen: false });
    render(<KeyboardShortcutHarness />);

    const event = new KeyboardEvent('keydown', {
      key: 'r',
      metaKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    await waitFor(() => {
      expect(useAppStore.getState().isRelayPanelOpen).toBe(true);
    });
  });

  it('opens grid settings on Cmd/Ctrl+Shift+G', () => {
    render(<KeyboardShortcutHarness />);

    const event = new KeyboardEvent('keydown', {
      key: 'g',
      metaKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(useAppStore.getState().isGridSettingsOpen).toBe(true);
  });
});
