import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { WorkspaceContainer } from './WorkspaceContainer';
import { useAppStore } from '../../../stores';

let dndContextProps: Record<string, unknown> = {};

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, ...props }: { children: React.ReactNode }) => {
    dndContextProps = props as Record<string, unknown>;
    return <>{children}</>;
  },
  closestCenter: vi.fn(),
  PointerSensor: class {},
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
  useDroppable: vi.fn(() => ({ setNodeRef: vi.fn(), isOver: false })),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  rectSortingStrategy: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

vi.mock('../../panes/components/Pane', () => ({
  Pane: ({ title }: { title: string }) => <div>{title}</div>,
}));

function createPane(id: string, layout: { x: number; y: number; w: number; h: number }) {
  return {
    id,
    title: id,
    systemPrompt: '',
    injectContext: true,
    messages: [],
    modelConfig: {
      model: 'claude-3-5-sonnet',
      temperature: 0.7,
      maxTokens: 4000,
    },
    layout,
  };
}

function createWorkspace(panes: ReturnType<typeof createPane>[]) {
  const now = new Date().toISOString();
  return {
    id: 'ws-1',
    name: 'Workspace 1',
    template: 'blank' as const,
    projectContext: '',
    panes,
    layout: { direction: 'horizontal' as const, sizes: [] },
    promptPresets: [],
    dirty: false,
    createdAt: now,
    updatedAt: now,
  };
}

function setGridRect() {
  const grid = document.getElementById('pane-grid-container');
  if (!grid) throw new Error('grid not found');

  Object.defineProperty(grid, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 332,
      bottom: 332,
      width: 332,
      height: 332,
      toJSON: () => ({}),
    }),
  });

  return grid;
}

describe('WorkspaceContainer resize behavior', () => {
  beforeEach(() => {
    dndContextProps = {};
    useAppStore.setState({
      workspaces: [createWorkspace([createPane('pane-1', { x: 0, y: 0, w: 1, h: 1 })])],
      activeWorkspaceId: 'ws-1',
    });
  });

  it('expands pane width when dragging right resize handle', () => {
    const { container } = render(<WorkspaceContainer />);
    setGridRect();

    const rightHandle = container.querySelector('div[style*="cursor: e-resize"]');
    expect(rightHandle).toBeTruthy();

    fireEvent.mouseDown(rightHandle!);
    fireEvent.mouseMove(document, { clientX: 280, clientY: 20 });
    fireEvent.mouseUp(document);

    const layout = useAppStore.getState().workspaces[0].panes[0].layout;
    expect(layout.w).toBe(3);
    expect(layout.x).toBe(0);
  });

  it('expands pane to the left while keeping right edge fixed', () => {
    useAppStore.setState({
      workspaces: [createWorkspace([createPane('pane-1', { x: 1, y: 0, w: 1, h: 1 })])],
      activeWorkspaceId: 'ws-1',
    });

    const { container } = render(<WorkspaceContainer />);
    setGridRect();

    const leftHandle = container.querySelector('div[style*="cursor: w-resize"]');
    expect(leftHandle).toBeTruthy();

    fireEvent.mouseDown(leftHandle!);
    fireEvent.mouseMove(document, { clientX: 10, clientY: 20 });
    fireEvent.mouseUp(document);

    const layout = useAppStore.getState().workspaces[0].panes[0].layout;
    expect(layout.x).toBe(0);
    expect(layout.w).toBe(2);
  });

  it('shrinks pane from the left when dragging handle to the right', () => {
    useAppStore.setState({
      workspaces: [createWorkspace([createPane('pane-1', { x: 0, y: 0, w: 2, h: 1 })])],
      activeWorkspaceId: 'ws-1',
    });

    const { container } = render(<WorkspaceContainer />);
    setGridRect();

    const leftHandle = container.querySelector('div[style*="cursor: w-resize"]');
    expect(leftHandle).toBeTruthy();

    fireEvent.mouseDown(leftHandle!);
    fireEvent.mouseMove(document, { clientX: 180, clientY: 20 });
    fireEvent.mouseUp(document);

    const layout = useAppStore.getState().workspaces[0].panes[0].layout;
    expect(layout.x).toBe(1);
    expect(layout.w).toBe(1);
  });

  it('expands pane height when dragging bottom resize handle', () => {
    const { container } = render(<WorkspaceContainer />);
    setGridRect();

    const bottomHandle = container.querySelector('div[style*="cursor: s-resize"]');
    expect(bottomHandle).toBeTruthy();

    fireEvent.mouseDown(bottomHandle!);
    fireEvent.mouseMove(document, { clientX: 20, clientY: 280 });
    fireEvent.mouseUp(document);

    const layout = useAppStore.getState().workspaces[0].panes[0].layout;
    expect(layout.h).toBe(3);
    expect(layout.y).toBe(0);
  });

  it('expands right while shrinking the adjacent pane in one drag', () => {
    useAppStore.setState({
      workspaces: [createWorkspace([
        createPane('pane-1', { x: 0, y: 0, w: 1, h: 1 }),
        createPane('pane-2', { x: 1, y: 0, w: 2, h: 1 }),
      ])],
      activeWorkspaceId: 'ws-1',
    });

    const { container } = render(<WorkspaceContainer />);
    setGridRect();

    const rightHandle = container.querySelector('div[style*="cursor: e-resize"]');
    expect(rightHandle).toBeTruthy();

    fireEvent.mouseDown(rightHandle!);
    fireEvent.mouseMove(document, { clientX: 180, clientY: 20 });
    fireEvent.mouseUp(document);

    const panes = useAppStore.getState().workspaces[0].panes;
    const pane1 = panes.find((p) => p.id === 'pane-1')?.layout;
    const pane2 = panes.find((p) => p.id === 'pane-2')?.layout;
    expect(pane1).toEqual({ x: 0, y: 0, w: 2, h: 1 });
    expect(pane2).toEqual({ x: 2, y: 0, w: 1, h: 1 });
  });

  it('expands downward while shrinking the pane below in one drag', () => {
    useAppStore.setState({
      workspaces: [createWorkspace([
        createPane('pane-1', { x: 0, y: 0, w: 1, h: 1 }),
        createPane('pane-2', { x: 0, y: 1, w: 1, h: 2 }),
      ])],
      activeWorkspaceId: 'ws-1',
    });

    const { container } = render(<WorkspaceContainer />);
    setGridRect();

    const bottomHandle = container.querySelector('div[style*="cursor: s-resize"]');
    expect(bottomHandle).toBeTruthy();

    fireEvent.mouseDown(bottomHandle!);
    fireEvent.mouseMove(document, { clientX: 20, clientY: 180 });
    fireEvent.mouseUp(document);

    const panes = useAppStore.getState().workspaces[0].panes;
    const pane1 = panes.find((p) => p.id === 'pane-1')?.layout;
    const pane2 = panes.find((p) => p.id === 'pane-2')?.layout;
    expect(pane1).toEqual({ x: 0, y: 0, w: 1, h: 2 });
    expect(pane2).toEqual({ x: 0, y: 2, w: 1, h: 1 });
  });

  it('expands left while shrinking the adjacent pane in one drag', () => {
    useAppStore.setState({
      workspaces: [createWorkspace([
        createPane('pane-1', { x: 0, y: 0, w: 2, h: 1 }),
        createPane('pane-2', { x: 2, y: 0, w: 1, h: 1 }),
      ])],
      activeWorkspaceId: 'ws-1',
    });

    const { container } = render(<WorkspaceContainer />);
    setGridRect();

    const leftHandles = container.querySelectorAll('div[style*="cursor: w-resize"]');
    expect(leftHandles.length).toBeGreaterThan(1);

    fireEvent.mouseDown(leftHandles[1]!);
    fireEvent.mouseMove(document, { clientX: 130, clientY: 20 });
    fireEvent.mouseUp(document);

    const panes = useAppStore.getState().workspaces[0].panes;
    const pane1 = panes.find((p) => p.id === 'pane-1')?.layout;
    const pane2 = panes.find((p) => p.id === 'pane-2')?.layout;
    expect(pane1).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    expect(pane2).toEqual({ x: 1, y: 0, w: 2, h: 1 });
  });

  it('expands pane upward when dragging top resize handle', () => {
    useAppStore.setState({
      workspaces: [createWorkspace([createPane('pane-1', { x: 0, y: 1, w: 1, h: 1 })])],
      activeWorkspaceId: 'ws-1',
    });

    const { container } = render(<WorkspaceContainer />);
    setGridRect();

    const topHandle = container.querySelector('div[style*="cursor: n-resize"]');
    expect(topHandle).toBeTruthy();

    fireEvent.mouseDown(topHandle!);
    fireEvent.mouseMove(document, { clientX: 20, clientY: 10 });
    fireEvent.mouseUp(document);

    const layout = useAppStore.getState().workspaces[0].panes[0].layout;
    expect(layout.y).toBe(0);
    expect(layout.h).toBe(2);
  });

  it('shows drop preview with the same span as dragged pane', () => {
    useAppStore.setState({
      workspaces: [createWorkspace([
        createPane('pane-1', { x: 0, y: 0, w: 2, h: 1 }),
      ])],
      activeWorkspaceId: 'ws-1',
    });

    const { getByTestId } = render(<WorkspaceContainer />);

    act(() => {
      (dndContextProps.onDragStart as (event: { active: { id: string } }) => void)({
        active: { id: 'pane-1' },
      });
      (dndContextProps.onDragOver as (event: { over: { id: string } }) => void)({
        over: { id: 'empty-2-2' },
      });
    });

    const preview = getByTestId('drag-drop-preview');
    expect(preview.style.gridColumn).toBe('2 / span 2');
    expect(preview.style.gridRow).toBe('3 / span 1');
  });
});
