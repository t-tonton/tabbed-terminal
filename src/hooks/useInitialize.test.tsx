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
});
