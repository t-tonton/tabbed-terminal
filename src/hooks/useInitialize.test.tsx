import { beforeEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { useInitialize } from './useInitialize';
import { useAppStore } from '../stores';

function InitializeHarness() {
  useInitialize();
  return null;
}

describe('useInitialize', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      workspaces: [],
      activeWorkspaceId: null,
      focusedPaneId: null,
      sendingPaneIds: new Set<string>(),
      terminalHistoryByPane: {},
      isWorkspaceSearchOpen: false,
    });
  });

  it('creates default workspace and pane when no snapshot exists', () => {
    render(<InitializeHarness />);

    const state = useAppStore.getState();
    expect(state.workspaces).toHaveLength(1);
    expect(state.workspaces[0].name).toBe('Workspace 1');
    expect(state.workspaces[0].panes).toHaveLength(1);
    expect(state.workspaces[0].dirty).toBe(false);
  });

  it('loads workspace snapshot from localStorage', () => {
    const now = new Date().toISOString();
    localStorage.setItem(
      'tabbed-terminal.workspace-state.v1',
      JSON.stringify({
        version: 1,
        savedAt: now,
        activeWorkspaceId: 'ws-a',
        workspaces: [
          {
            id: 'ws-a',
            name: 'Restored Workspace',
            template: 'blank',
            projectContext: '',
            panes: [],
            layout: { direction: 'horizontal', sizes: [] },
            promptPresets: [],
            dirty: false,
            createdAt: now,
            updatedAt: now,
          },
        ],
      })
    );

    render(<InitializeHarness />);

    const state = useAppStore.getState();
    expect(state.workspaces).toHaveLength(1);
    expect(state.workspaces[0].id).toBe('ws-a');
    expect(state.workspaces[0].name).toBe('Restored Workspace');
    expect(state.activeWorkspaceId).toBe('ws-a');
  });
});
