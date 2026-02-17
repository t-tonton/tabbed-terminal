import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
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
    localStorage.clear();
    useAppStore.setState({
      workspaces: [createWorkspace()],
      activeWorkspaceId: 'ws-1',
      isWorkspaceSearchOpen: false,
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

  it('saves workspace snapshot and marks dirty workspace as clean on Cmd/Ctrl+S', () => {
    useAppStore.setState({
      workspaces: [{ ...createWorkspace(), dirty: true }],
      activeWorkspaceId: 'ws-1',
    });
    render(<KeyboardShortcutHarness />);

    const metaEvent = new KeyboardEvent('keydown', {
      key: 's',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(metaEvent);

    expect(metaEvent.defaultPrevented).toBe(true);
    expect(useAppStore.getState().workspaces[0].dirty).toBe(false);

    const raw = localStorage.getItem('tabbed-terminal.workspace-state.v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw ?? '{}');
    expect(parsed.activeWorkspaceId).toBe('ws-1');
    expect(parsed.workspaces[0].dirty).toBe(false);
  });
});
