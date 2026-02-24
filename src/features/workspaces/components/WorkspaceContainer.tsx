import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragOverEvent,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useCallback, useMemo } from 'react';
import { Pane } from '../../panes/components/Pane';
import { useAppStore, useActiveWorkspace } from '../../../stores';
import type { Pane as PaneType, PaneLayout } from '../../../types';

const GAP = 8;
const EMPTY_PANES: PaneType[] = [];

interface GridPaneProps {
  pane: PaneType;
  workspaceId: string;
  onResizeStart: (paneId: string, direction: 'left' | 'right' | 'top' | 'bottom' | 'corner') => void;
  isResizing: boolean;
}

function GridPane({ pane, workspaceId, onResizeStart, isResizing }: GridPaneProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pane.id });

  const { x, y, w, h } = pane.layout;

  const style: React.CSSProperties = {
    gridColumn: `${x + 1} / span ${w}`,
    gridRow: `${y + 1} / span ${h}`,
    transform: CSS.Transform.toString(transform),
    transition: isResizing ? 'none' : transition,
    opacity: isDragging ? 0.5 : 1,
    overflow: 'hidden',
    borderRadius: '8px',
    position: 'relative',
    minHeight: 0,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Pane
        workspaceId={workspaceId}
        paneId={pane.id}
        title={pane.title}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
      {/* Resize handle - left edge */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: '20%',
          width: '8px',
          height: '60%',
          cursor: 'w-resize',
          zIndex: 10,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(pane.id, 'left');
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '2px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '4px',
            height: '30px',
            borderRadius: '2px',
            backgroundColor: 'var(--text-muted)',
            opacity: 0.3,
          }}
        />
      </div>
      {/* Resize handle - right edge */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: '20%',
          width: '8px',
          height: '60%',
          cursor: 'e-resize',
          zIndex: 10,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(pane.id, 'right');
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: '2px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '4px',
            height: '30px',
            borderRadius: '2px',
            backgroundColor: 'var(--text-muted)',
            opacity: 0.3,
          }}
        />
      </div>
      {/* Resize handle - bottom edge */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '10%',
          width: '80%',
          height: '16px',
          cursor: 's-resize',
          zIndex: 10,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(pane.id, 'bottom');
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: '4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '40px',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: 'var(--text-muted)',
            opacity: 0.5,
          }}
        />
      </div>
      {/* Resize handle - top edge */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          width: '80%',
          height: '16px',
          cursor: 'n-resize',
          zIndex: 10,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(pane.id, 'top');
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '40px',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: 'var(--text-muted)',
            opacity: 0.5,
          }}
        />
      </div>
      {/* Resize handle - corner */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '16px',
          height: '16px',
          cursor: 'se-resize',
          zIndex: 11,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(pane.id, 'corner');
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: '4px',
            bottom: '4px',
            width: '8px',
            height: '8px',
            borderRight: '2px solid var(--text-muted)',
            borderBottom: '2px solid var(--text-muted)',
            opacity: 0.5,
          }}
        />
      </div>
    </div>
  );
}

// Empty cell that can receive dropped panes
interface EmptyCellProps {
  x: number;
  y: number;
}

function EmptyCell({ x, y }: EmptyCellProps) {
  const cellId = `empty-${x}-${y}`;
  const { setNodeRef } = useDroppable({ id: cellId });

  return (
    <div
      ref={setNodeRef}
      style={{
        gridColumn: `${x + 1}`,
        gridRow: `${y + 1}`,
        backgroundColor: 'transparent',
        borderRadius: '8px',
        border: '2px dashed transparent',
      }}
    />
  );
}

function parseEmptyCellId(id: string): { x: number; y: number } | null {
  if (!id.startsWith('empty-')) return null;
  const parts = id.split('-');
  const x = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  return { x, y };
}

function layoutsOverlap(a: PaneLayout, b: PaneLayout): boolean {
  const aRight = a.x + a.w;
  const aBottom = a.y + a.h;
  const bRight = b.x + b.w;
  const bBottom = b.y + b.h;
  return !(a.x >= bRight || aRight <= b.x || a.y >= bBottom || aBottom <= b.y);
}

export function WorkspaceContainer() {
  const activeWorkspace = useActiveWorkspace();
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const paneGridSize = useAppStore((state) => state.paneGridSize);
  const panes = activeWorkspace?.panes ?? EMPTY_PANES;
  const GRID_COLS = paneGridSize;
  const GRID_ROWS = paneGridSize;
  const visiblePanes = panes.slice(0, GRID_COLS * GRID_ROWS);
  const [draggingPaneId, setDraggingPaneId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ x: number; y: number } | null>(null);

  const [resizing, setResizing] = useState<{
    paneId: string;
    direction: 'left' | 'right' | 'top' | 'bottom' | 'corner';
    startX: number;
    startY: number;
    startLayout: PaneLayout;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Calculate empty cells (must stay before any conditional return to keep hook order stable)
  const emptyCells = useMemo(() => {
    const occupied = new Set<string>();
    for (const pane of visiblePanes) {
      for (let row = pane.layout.y; row < pane.layout.y + pane.layout.h; row++) {
        for (let col = pane.layout.x; col < pane.layout.x + pane.layout.w; col++) {
          occupied.add(`${col},${row}`);
        }
      }
    }

    const empty: { x: number; y: number }[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (!occupied.has(`${col},${row}`)) {
          empty.push({ x: col, y: row });
        }
      }
    }
    return empty;
  }, [visiblePanes, GRID_COLS, GRID_ROWS]);

  const dragPreview = useMemo(() => {
    if (!draggingPaneId || !dragOverCell) return null;
    const draggingPane = panes.find((p) => p.id === draggingPaneId);
    if (!draggingPane) return null;

    const x = Math.min(dragOverCell.x, GRID_COLS - draggingPane.layout.w);
    const y = Math.min(dragOverCell.y, GRID_ROWS - draggingPane.layout.h);
    const previewLayout: PaneLayout = { ...draggingPane.layout, x, y };

    const isValid = !panes.some((p) => p.id !== draggingPane.id && layoutsOverlap(previewLayout, p.layout));
    return {
      ...previewLayout,
      isValid,
    };
  }, [dragOverCell, draggingPaneId, panes, GRID_COLS, GRID_ROWS]);

  const handleResizeStart = useCallback((paneId: string, direction: 'left' | 'right' | 'top' | 'bottom' | 'corner') => {
    if (!activeWorkspaceId) return;

    // Store the initial layout at drag start
    const initialPane = useAppStore.getState().workspaces
      .find(w => w.id === activeWorkspaceId)?.panes
      .find(p => p.id === paneId);
    if (!initialPane) return;

    const startLayout = { ...initialPane.layout };

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById('pane-grid-container');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const cellWidth = (rect.width - GAP * (GRID_COLS - 1)) / GRID_COLS;
      const cellHeight = (rect.height - GAP * (GRID_ROWS - 1)) / GRID_ROWS;

      // Calculate which cell the mouse is in
      const mouseCol = Math.floor((e.clientX - rect.left) / (cellWidth + GAP));
      const mouseRow = Math.floor((e.clientY - rect.top) / (cellHeight + GAP));

      // Calculate desired layout based on direction and start position.
      let desiredX = startLayout.x;
      let desiredY = startLayout.y;
      let desiredW = startLayout.w;
      let desiredH = startLayout.h;
      const startRight = startLayout.x + startLayout.w;
      const startBottom = startLayout.y + startLayout.h;

      if (direction === 'right' || direction === 'corner') {
        desiredW = Math.max(1, Math.min(GRID_COLS - startLayout.x, mouseCol - startLayout.x + 1));
      }
      if (direction === 'left') {
        const targetX = Math.max(0, Math.min(startRight - 1, mouseCol));
        desiredX = targetX;
        desiredW = startRight - targetX;
      }
      if (direction === 'bottom' || direction === 'corner') {
        desiredH = Math.max(1, Math.min(GRID_ROWS - startLayout.y, mouseRow - startLayout.y + 1));
      }
      if (direction === 'top') {
        const targetY = Math.max(0, Math.min(startBottom - 1, mouseRow));
        desiredY = targetY;
        desiredH = startBottom - targetY;
      }

      // Get current state from store
      const state = useAppStore.getState();
      const workspace = state.workspaces.find(w => w.id === activeWorkspaceId);
      if (!workspace) return;

      // Get other panes' layouts (mutable copies)
      const otherPanes = workspace.panes
        .filter(p => p.id !== paneId)
        .map(p => ({ id: p.id, layout: { ...p.layout } }));
      const desiredLayout: PaneLayout = {
        ...startLayout,
        x: desiredX,
        y: desiredY,
        w: desiredW,
        h: desiredH,
      };

      const overlaps = (a: PaneLayout, b: PaneLayout) => {
        const aRight = a.x + a.w;
        const aBottom = a.y + a.h;
        const bRight = b.x + b.w;
        const bBottom = b.y + b.h;
        return !(a.x >= bRight || aRight <= b.x || a.y >= bBottom || aBottom <= b.y);
      };

      // Find panes that collide and shrink neighbors to make room in one action.
      const resolveWithNeighborShrink = (target: PaneLayout): { success: boolean; updates: { id: string; layout: PaneLayout }[] } => {
        const updates: { id: string; layout: PaneLayout }[] = [];
        const adjustedPanes = otherPanes.map((p) => ({ id: p.id, layout: { ...p.layout } }));
        if (adjustedPanes.length === 0) {
          return { success: true, updates };
        }

        // Shrink panes from the colliding edge. This keeps each adjusted pane inside its original bounds.
        for (let pass = 0; pass < adjustedPanes.length * 3; pass++) {
          const colliding = adjustedPanes.find((pane) => overlaps(target, pane.layout));
          if (!colliding) {
            for (const pane of adjustedPanes) {
              const original = otherPanes.find((p) => p.id === pane.id);
              if (!original) continue;
              if (
                original.layout.x !== pane.layout.x ||
                original.layout.y !== pane.layout.y ||
                original.layout.w !== pane.layout.w ||
                original.layout.h !== pane.layout.h
              ) {
                updates.push({ id: pane.id, layout: { ...pane.layout } });
              }
            }
            return { success: true, updates };
          }

          const pane = colliding.layout;
          const targetRight = target.x + target.w;
          const targetBottom = target.y + target.h;
          const expandsLeft = target.x < startLayout.x;
          const expandsRight = targetRight > startRight;
          const expandsUp = target.y < startLayout.y;
          const expandsDown = targetBottom > startBottom;

          let adjusted = false;

          if (expandsLeft) {
            // Expanding to the left: shrink colliding pane from its right edge.
            const newW = target.x - pane.x;
            if (newW >= 1) {
              pane.w = newW;
              adjusted = true;
            }
          }

          if (!adjusted && expandsRight) {
            // Expanding to the right: shrink colliding pane from its left edge.
            const shrink = targetRight - pane.x;
            const newW = pane.w - shrink;
            if (newW >= 1) {
              pane.x += shrink;
              pane.w = newW;
              adjusted = true;
            }
          }

          if (!adjusted && expandsUp) {
            // Expanding upward: shrink colliding pane from its bottom edge.
            const newH = target.y - pane.y;
            if (newH >= 1) {
              pane.h = newH;
              adjusted = true;
            }
          }

          if (!adjusted && expandsDown) {
            // Expanding downward: shrink colliding pane from its top edge.
            const shrink = targetBottom - pane.y;
            const newH = pane.h - shrink;
            if (newH >= 1) {
              pane.y += shrink;
              pane.h = newH;
              adjusted = true;
            }
          }

          if (!adjusted) {
            return { success: false, updates: [] };
          }
        }

        return { success: false, updates: [] };
      };

      // Try requested size first, then back off until neighbor shrinking is feasible.
      let result = resolveWithNeighborShrink(desiredLayout);
      let newW = desiredW;
      let newH = desiredH;
      let newX = desiredLayout.x;
      let newY = desiredLayout.y;

      if (!result.success) {
        // Try smaller sizes to find the largest feasible one.
        const minW = direction === 'left' ? 1 : startLayout.w;
        const minH = direction === 'top' ? 1 : startLayout.h;
        for (let h = desiredH; h >= minH; h--) {
          for (let w = desiredW; w >= minW; w--) {
            const candidateX = direction === 'left' ? (startRight - w) : startLayout.x;
            const candidateY = direction === 'top' ? (startBottom - h) : startLayout.y;
            result = resolveWithNeighborShrink({
              ...startLayout,
              x: candidateX,
              y: candidateY,
              w,
              h,
            });
            if (result.success) {
              newW = w;
              newH = h;
              newX = candidateX;
              newY = candidateY;
              break;
            }
          }
          if (result.success) break;
        }

        // If still no success, keep original size (or plain edge-shrink when dragging inward).
        if (!result.success) {
          if (direction === 'left' && desiredLayout.x >= startLayout.x) {
            newW = desiredW;
            newX = desiredLayout.x;
          } else if (direction === 'top' && desiredLayout.y >= startLayout.y) {
            newH = desiredH;
            newY = desiredLayout.y;
          } else {
            newW = startLayout.w;
            newH = startLayout.h;
            newX = startLayout.x;
            newY = startLayout.y;
          }
          result = { success: true, updates: [] };
        }
      }

      // Apply all updates
      const allUpdates = [
        { id: paneId, layout: { ...startLayout, x: newX, y: newY, w: newW, h: newH } },
        ...result.updates
      ];

      state.updatePaneLayouts(activeWorkspaceId, allUpdates);
    };

    const handleMouseUp = () => {
      setResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    setResizing({
      paneId,
      direction,
      startX: 0,
      startY: 0,
      startLayout
    });

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [activeWorkspaceId, GRID_COLS, GRID_ROWS]);

  // Empty states
  if (!activeWorkspace || !activeWorkspaceId) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-panel)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <p style={{ color: 'var(--text-secondary)' }}>No workspace selected</p>
      </div>
    );
  }

  if (panes.length === 0) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-panel)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No panes yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Add a pane with ⌘N</p>
        </div>
      </div>
    );
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingPaneId(null);
    setDragOverCell(null);

    const { active, over } = event;
    if (over && active.id !== over.id && activeWorkspaceId) {
      const activePane = panes.find((p) => p.id === active.id);
      if (!activePane) return;

      // Check if dropped on an empty cell
      const overId = String(over.id);
      const targetCell = parseEmptyCellId(overId);
      if (targetCell) {
        const targetX = targetCell.x;
        const targetY = targetCell.y;

        // Clamp position so pane fits within grid bounds
        const newX = Math.min(targetX, GRID_COLS - activePane.layout.w);
        const newY = Math.min(targetY, GRID_ROWS - activePane.layout.h);

        // Skip if position didn't change
        if (newX === activePane.layout.x && newY === activePane.layout.y) return;

        // Check for collisions at new position (excluding the active pane itself)
        const wouldCollide = panes.some((p) => {
          if (p.id === activePane.id) return false;
          const pRight = p.layout.x + p.layout.w;
          const pBottom = p.layout.y + p.layout.h;
          const newRight = newX + activePane.layout.w;
          const newBottom = newY + activePane.layout.h;
          return !(newX >= pRight || newRight <= p.layout.x || newY >= pBottom || newBottom <= p.layout.y);
        });

        if (!wouldCollide) {
          useAppStore.getState().updatePaneLayouts(activeWorkspaceId, [
            { id: activePane.id, layout: { ...activePane.layout, x: newX, y: newY } },
          ]);
        }
      } else {
        // Swap positions between two panes
        const overPane = panes.find((p) => p.id === over.id);
        if (overPane) {
          // Check if both panes would fit after swap
          const activeNewX = overPane.layout.x;
          const activeNewY = overPane.layout.y;
          const overNewX = activePane.layout.x;
          const overNewY = activePane.layout.y;

          const activeFits = activeNewX + activePane.layout.w <= GRID_COLS && activeNewY + activePane.layout.h <= GRID_ROWS;
          const overFits = overNewX + overPane.layout.w <= GRID_COLS && overNewY + overPane.layout.h <= GRID_ROWS;

          if (activeFits && overFits) {
            useAppStore.getState().updatePaneLayouts(activeWorkspaceId, [
              { id: activePane.id, layout: { x: activeNewX, y: activeNewY, w: activePane.layout.w, h: activePane.layout.h } },
              { id: overPane.id, layout: { x: overNewX, y: overNewY, w: overPane.layout.w, h: overPane.layout.h } },
            ]);
          }
        }
      }
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingPaneId(String(event.active.id));
    setDragOverCell(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!event.over) {
      setDragOverCell(null);
      return;
    }
    const targetCell = parseEmptyCellId(String(event.over.id));
    setDragOverCell(targetCell);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={() => {
        setDraggingPaneId(null);
        setDragOverCell(null);
      }}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={visiblePanes.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div
          id="pane-grid-container"
          style={{
            height: '100%',
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
            gap: `${GAP}px`,
            backgroundColor: '#0a1021',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
            padding: '8px',
          }}
        >
          {/* Render empty cells as drop targets */}
          {emptyCells.map(({ x, y }) => (
            <EmptyCell key={`empty-${x}-${y}`} x={x} y={y} />
          ))}
          {dragPreview && (
            <div
              data-testid="drag-drop-preview"
              style={{
                gridColumn: `${dragPreview.x + 1} / span ${dragPreview.w}`,
                gridRow: `${dragPreview.y + 1} / span ${dragPreview.h}`,
                borderRadius: '8px',
                border: `2px dashed ${dragPreview.isValid ? 'var(--accent)' : 'var(--danger, #ff6b6b)'}`,
                backgroundColor: dragPreview.isValid ? 'var(--accent-muted)' : 'rgba(255, 107, 107, 0.15)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
          )}
          {/* Render panes */}
          {visiblePanes.map((pane) => (
            <GridPane
              key={pane.id}
              pane={pane}
              workspaceId={activeWorkspaceId}
              onResizeStart={handleResizeStart}
              isResizing={resizing?.paneId === pane.id}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
