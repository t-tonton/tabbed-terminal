import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pane } from './Pane';
import { useAppStore } from '../../../stores';

vi.mock('./Terminal', () => ({
  Terminal: ({ onFocus }: { onFocus: () => void }) => (
    <div data-testid="mock-terminal" onClick={onFocus} />
  ),
}));

function createPane(id: string, title: string) {
  return {
    id,
    title,
    systemPrompt: '',
    injectContext: true,
    messages: [],
    modelConfig: {
      model: 'claude-3-5-sonnet',
      temperature: 0.7,
      maxTokens: 4000,
    },
    layout: { x: 0, y: 0, w: 1, h: 1 },
  };
}

function createWorkspaceWithPane(paneTitle = 'Pane 1') {
  const now = new Date().toISOString();
  return {
    id: 'ws-1',
    name: 'Workspace 1',
    template: 'blank' as const,
    projectContext: '',
    panes: [createPane('pane-1', paneTitle)],
    layout: { direction: 'horizontal' as const, sizes: [] },
    promptPresets: [],
    dirty: false,
    createdAt: now,
    updatedAt: now,
  };
}

describe('Pane rename and close behavior', () => {
  beforeEach(() => {
    useAppStore.setState({
      workspaces: [createWorkspaceWithPane()],
      activeWorkspaceId: 'ws-1',
      focusedPaneId: null,
      terminalHistoryByPane: {},
      terminalRawHistoryByPane: {},
      unreadCountByPane: {},
      managedPaneIdsByParent: {},
      paneDispatchLogsByParent: {},
    });
  });

  it('starts title edit on double click', async () => {
    const user = userEvent.setup();
    render(<Pane workspaceId="ws-1" paneId="pane-1" title="Pane 1" />);

    await user.dblClick(screen.getByText('Pane 1'));

    expect(screen.getByDisplayValue('Pane 1')).toBeInTheDocument();
  });

  it('commits title edit on Enter', async () => {
    const user = userEvent.setup();
    render(<Pane workspaceId="ws-1" paneId="pane-1" title="Pane 1" />);

    await user.dblClick(screen.getByText('Pane 1'));
    const input = screen.getByDisplayValue('Pane 1');
    await user.clear(input);
    await user.type(input, 'Build Pane{Enter}');

    const updatedTitle = useAppStore.getState().workspaces[0].panes[0].title;
    expect(updatedTitle).toBe('Build Pane');
  });

  it('does not update title when input is blank', async () => {
    const user = userEvent.setup();
    render(<Pane workspaceId="ws-1" paneId="pane-1" title="Pane 1" />);

    await user.dblClick(screen.getByText('Pane 1'));
    const input = screen.getByDisplayValue('Pane 1');
    await user.clear(input);
    await user.type(input, '   {Enter}');

    const updatedTitle = useAppStore.getState().workspaces[0].panes[0].title;
    expect(updatedTitle).toBe('Pane 1');
  });

  it('cancels title edit on Escape', async () => {
    const user = userEvent.setup();
    render(<Pane workspaceId="ws-1" paneId="pane-1" title="Pane 1" />);

    await user.dblClick(screen.getByText('Pane 1'));
    const input = screen.getByDisplayValue('Pane 1');
    await user.clear(input);
    await user.type(input, 'Draft Name{Escape}');

    const updatedTitle = useAppStore.getState().workspaces[0].panes[0].title;
    expect(updatedTitle).toBe('Pane 1');
    expect(screen.queryByDisplayValue('Pane 1')).not.toBeInTheDocument();
  });

  it('closes pane from header close button', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ focusedPaneId: 'pane-1' });

    render(<Pane workspaceId="ws-1" paneId="pane-1" title="Pane 1" />);

    await user.click(screen.getByTitle('Close pane'));

    const state = useAppStore.getState();
    expect(state.workspaces[0].panes).toHaveLength(0);
    expect(state.focusedPaneId).toBeNull();
  });
});
