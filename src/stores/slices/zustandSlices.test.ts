import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../appStore';

function makeWorkspace(id: string, name: string) {
  const now = new Date().toISOString();
  return {
    id,
    name,
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

beforeEach(() => {
  useAppStore.setState({
    workspaces: [],
    activeWorkspaceId: null,
    focusedPaneId: null,
    sendingPaneIds: new Set<string>(),
    terminalHistoryByPane: {},
    terminalRawHistoryByPane: {},
    unreadCountByPane: {},
    isWorkspaceSearchOpen: false,
  });
});

describe('workspacesSlice', () => {
  it('creates workspaces with sequential default names and sets active workspace', () => {
    const state = useAppStore.getState();

    const firstId = state.createWorkspace('blank');
    const secondId = state.createWorkspace('blank');

    const nextState = useAppStore.getState();
    expect(nextState.workspaces).toHaveLength(2);
    expect(nextState.workspaces[0].name).toBe('Workspace 1');
    expect(nextState.workspaces[1].name).toBe('Workspace 2');
    expect(nextState.activeWorkspaceId).toBe(secondId);
    expect(nextState.focusedPaneId).toBe(nextState.workspaces[1].panes[0].id);
    expect(firstId).not.toBe(secondId);
  });

  it('deletes active workspace and falls back to first remaining workspace', () => {
    useAppStore.setState({
      workspaces: [makeWorkspace('ws-1', 'Workspace 1'), makeWorkspace('ws-2', 'Workspace 2')],
      activeWorkspaceId: 'ws-2',
    });

    useAppStore.getState().deleteWorkspace('ws-2');

    const nextState = useAppStore.getState();
    expect(nextState.workspaces).toHaveLength(1);
    expect(nextState.workspaces[0].id).toBe('ws-1');
    expect(nextState.activeWorkspaceId).toBe('ws-1');
  });

  it('deletes workspace and clears related terminal/unread state', () => {
    useAppStore.setState({
      workspaces: [makeWorkspace('ws-1', 'Workspace 1'), makeWorkspace('ws-2', 'Workspace 2')],
      activeWorkspaceId: 'ws-2',
    });
    const paneId = useAppStore.getState().createPane('ws-2', { title: 'Pane 2' });
    useAppStore.setState({
      terminalHistoryByPane: { [paneId]: 'abc' },
      terminalRawHistoryByPane: { [paneId]: 'abc' },
      unreadCountByPane: { [paneId]: 3 },
    });

    useAppStore.getState().deleteWorkspace('ws-2');

    const nextState = useAppStore.getState();
    expect(nextState.workspaces).toHaveLength(1);
    expect(nextState.terminalHistoryByPane[paneId]).toBeUndefined();
    expect(nextState.terminalRawHistoryByPane[paneId]).toBeUndefined();
    expect(nextState.unreadCountByPane[paneId]).toBeUndefined();
  });

  it('reorders workspaces by index', () => {
    useAppStore.setState({
      workspaces: [
        makeWorkspace('ws-1', 'Workspace 1'),
        makeWorkspace('ws-2', 'Workspace 2'),
        makeWorkspace('ws-3', 'Workspace 3'),
      ],
      activeWorkspaceId: 'ws-2',
    });

    useAppStore.getState().reorderWorkspaces(0, 2);

    const nextState = useAppStore.getState();
    expect(nextState.workspaces.map((w) => w.id)).toEqual(['ws-2', 'ws-3', 'ws-1']);
    expect(nextState.activeWorkspaceId).toBe('ws-2');
  });

  it('sets first pane focus when switching active workspace', () => {
    const ws1 = useAppStore.getState().createWorkspace('blank', 'Workspace 1');
    const ws2 = useAppStore.getState().createWorkspace('blank', 'Workspace 2');
    const ws1PaneId = useAppStore.getState().workspaces.find((w) => w.id === ws1)?.panes[0].id;
    const ws2PaneId = useAppStore.getState().workspaces.find((w) => w.id === ws2)?.panes[0].id;

    useAppStore.getState().setActiveWorkspace(ws1);
    expect(useAppStore.getState().focusedPaneId).toBe(ws1PaneId);

    useAppStore.getState().setActiveWorkspace(ws2);
    expect(useAppStore.getState().focusedPaneId).toBe(ws2PaneId);
  });
});

describe('panesSlice', () => {
  beforeEach(() => {
    useAppStore.setState({
      workspaces: [makeWorkspace('ws-1', 'Workspace 1')],
      activeWorkspaceId: 'ws-1',
      terminalHistoryByPane: {},
      terminalRawHistoryByPane: {},
      unreadCountByPane: {},
    });
  });

  it('creates a pane in workspace and marks it dirty', () => {
    const paneId = useAppStore.getState().createPane('ws-1', { title: 'Pane 1' });

    const nextState = useAppStore.getState();
    const workspace = nextState.workspaces[0];

    expect(paneId).toBeTypeOf('string');
    expect(workspace.panes).toHaveLength(1);
    expect(workspace.panes[0].title).toBe('Pane 1');
    expect(workspace.dirty).toBe(true);
  });

  it('updates pane title and keeps change in store', () => {
    const paneId = useAppStore.getState().createPane('ws-1', { title: 'Pane 1' });

    useAppStore.getState().updatePane('ws-1', paneId, { title: 'Renamed Pane' });

    const pane = useAppStore.getState().workspaces[0].panes[0];
    expect(pane.title).toBe('Renamed Pane');
  });

  it('deletes focused pane and clears focus', () => {
    const paneId = useAppStore.getState().createPane('ws-1', { title: 'Pane 1' });
    useAppStore.setState({ focusedPaneId: paneId });

    useAppStore.getState().deletePane('ws-1', paneId);

    const nextState = useAppStore.getState();
    expect(nextState.workspaces[0].panes).toHaveLength(0);
    expect(nextState.focusedPaneId).toBeNull();
  });

  it('duplicates pane with copy suffix and empty messages', () => {
    const paneId = useAppStore.getState().createPane('ws-1', { title: 'Pane 1' });
    useAppStore.getState().addMessage('ws-1', paneId, {
      id: 'm-1',
      role: 'user',
      content: 'hello',
      timestamp: new Date().toISOString(),
    });

    const duplicateId = useAppStore.getState().duplicatePane('ws-1', paneId);

    const panes = useAppStore.getState().workspaces[0].panes;
    const duplicated = panes.find((p) => p.id === duplicateId);

    expect(panes).toHaveLength(2);
    expect(duplicated).toBeDefined();
    expect(duplicated?.title).toBe('Pane 1 (Copy)');
    expect(duplicated?.messages).toHaveLength(0);
  });

  it('stores terminal output per pane and clears it when pane is deleted', () => {
    const paneId = useAppStore.getState().createPane('ws-1', { title: 'Pane 1' });

    useAppStore.getState().appendTerminalOutput(paneId, 'hello');
    useAppStore.getState().appendTerminalOutput(paneId, '\nworld');

    expect(useAppStore.getState().terminalHistoryByPane[paneId]).toContain('hello');
    expect(useAppStore.getState().terminalHistoryByPane[paneId]).toContain('world');

    useAppStore.getState().deletePane('ws-1', paneId);

    expect(useAppStore.getState().terminalHistoryByPane[paneId]).toBeUndefined();
  });

  it('increments unread count only for inactive pane output', () => {
    const paneId = useAppStore.getState().createPane('ws-1', { title: 'Pane 1' });

    useAppStore.getState().setFocusedPane(paneId);
    useAppStore.getState().appendTerminalOutput(paneId, 'active output');
    expect(useAppStore.getState().unreadCountByPane[paneId]).toBe(0);

    const ws2Id = useAppStore.getState().createWorkspace('blank', 'Workspace 2');
    useAppStore.getState().setActiveWorkspace(ws2Id);
    useAppStore.getState().appendTerminalOutput(paneId, 'inactive output');
    expect(useAppStore.getState().unreadCountByPane[paneId]).toBe(1);
  });

  it('does not increment unread when active workspace has no explicit focused pane yet', () => {
    const paneId = useAppStore.getState().createPane('ws-1', { title: 'Pane 1' });
    useAppStore.setState({ focusedPaneId: null });

    useAppStore.getState().appendTerminalOutput(paneId, 'initial prompt');
    expect(useAppStore.getState().unreadCountByPane[paneId]).toBe(0);
  });

  it('clears unread count when pane is focused', () => {
    const paneId = useAppStore.getState().createPane('ws-1', { title: 'Pane 1' });
    const ws2Id = useAppStore.getState().createWorkspace('blank', 'Workspace 2');
    useAppStore.getState().setActiveWorkspace(ws2Id);

    useAppStore.getState().appendTerminalOutput(paneId, 'inactive output');
    expect(useAppStore.getState().unreadCountByPane[paneId]).toBe(1);

    useAppStore.getState().setActiveWorkspace('ws-1');
    useAppStore.getState().setFocusedPane(paneId);
    expect(useAppStore.getState().unreadCountByPane[paneId]).toBe(0);
  });
});
