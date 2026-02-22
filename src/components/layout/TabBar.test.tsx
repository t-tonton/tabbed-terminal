import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach } from 'vitest';
import { TabBar } from './TabBar';
import { useAppStore } from '../../stores';
import { DEFAULT_MODEL_CONFIG } from '../../utils';

function createWorkspace(id: string, name: string, dirty = false) {
  const now = new Date().toISOString();
  return {
    id,
    name,
    template: 'blank' as const,
    projectContext: '',
    panes: [],
    layout: { direction: 'horizontal' as const, sizes: [] },
    promptPresets: [],
    dirty,
    createdAt: now,
    updatedAt: now,
  };
}

function createPane(id: string, title: string) {
  return {
    id,
    title,
    systemPrompt: '',
    injectContext: true,
    messages: [],
    modelConfig: { ...DEFAULT_MODEL_CONFIG },
    layout: { x: 0, y: 0, w: 1, h: 1 },
  };
}

describe('TabBar rename behavior', () => {
  beforeEach(() => {
    useAppStore.setState({
      workspaces: [
        createWorkspace('ws-1', 'Workspace 1'),
        createWorkspace('ws-2', 'Workspace 2'),
      ],
      activeWorkspaceId: 'ws-1',
      unreadCountByPane: {},
    });
  });

  it('starts rename on double click', async () => {
    const user = userEvent.setup();
    render(<TabBar />);

    await user.dblClick(screen.getByText('Workspace 1'));

    expect(screen.getByDisplayValue('Workspace 1')).toBeInTheDocument();
  });

  it('commits renamed tab name on Enter', async () => {
    const user = userEvent.setup();
    render(<TabBar />);

    await user.dblClick(screen.getByText('Workspace 1'));

    const input = screen.getByDisplayValue('Workspace 1');
    await user.clear(input);
    await user.type(input, 'Planning{Enter}');

    expect(useAppStore.getState().workspaces[0].name).toBe('Planning');
    expect(screen.getByText('Planning')).toBeInTheDocument();
  });

  it('does not update when the new name is blank', async () => {
    const user = userEvent.setup();
    render(<TabBar />);

    await user.dblClick(screen.getByText('Workspace 1'));

    const input = screen.getByDisplayValue('Workspace 1');
    await user.clear(input);
    await user.type(input, '   {Enter}');

    expect(useAppStore.getState().workspaces[0].name).toBe('Workspace 1');
  });

  it('cancels rename on Escape', async () => {
    const user = userEvent.setup();
    render(<TabBar />);

    await user.dblClick(screen.getByText('Workspace 1'));

    const input = screen.getByDisplayValue('Workspace 1');
    await user.clear(input);
    await user.type(input, 'Draft{Escape}');

    expect(useAppStore.getState().workspaces[0].name).toBe('Workspace 1');
    expect(screen.queryByDisplayValue('Workspace 1')).not.toBeInTheDocument();
  });

  it('closes clean workspace', async () => {
    const user = userEvent.setup();
    render(<TabBar />);

    await user.click(screen.getByLabelText('Close Workspace 1'));

    expect(useAppStore.getState().workspaces).toHaveLength(1);
    expect(useAppStore.getState().workspaces[0].id).toBe('ws-2');
  });

  it('closes dirty workspace', async () => {
    const user = userEvent.setup();
    useAppStore.setState({
      workspaces: [
        createWorkspace('ws-1', 'Workspace 1', true),
        createWorkspace('ws-2', 'Workspace 2'),
      ],
      activeWorkspaceId: 'ws-1',
    });
    render(<TabBar />);

    await user.click(screen.getByLabelText('Close Workspace 1'));

    expect(useAppStore.getState().workspaces).toHaveLength(1);
    expect(useAppStore.getState().workspaces[0].id).toBe('ws-2');
  });

  it('shows unread badge per workspace', () => {
    useAppStore.setState({
      workspaces: [
        {
          ...createWorkspace('ws-1', 'Workspace 1'),
          panes: [createPane('pane-1', 'Pane 1')],
        },
        createWorkspace('ws-2', 'Workspace 2'),
      ],
      unreadCountByPane: { 'pane-1': 2 },
    });

    render(<TabBar />);
    expect(screen.getByLabelText('Workspace 1 unread 2')).toBeInTheDocument();
  });

});
