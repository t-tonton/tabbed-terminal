import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
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

const GRID_COLS = 3;
const GRID_ROWS = 3;
const GAP = 8;

interface GridPaneProps {
  pane: PaneType;
  workspaceId: string;
  onResizeStart: (paneId: string, direction: 'left' | 'right' | 'bottom' | 'corner') => void;
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
  const { setNodeRef, isOver } = useDroppable({ id: cellId });

  return (
    <div
      ref={setNodeRef}
      style={{
        gridColumn: `${x + 1}`,
        gridRow: `${y + 1}`,
        backgroundColor: isOver ? 'var(--accent-muted)' : 'transparent',
        borderRadius: '8px',
        border: isOver ? '2px dashed var(--accent)' : '2px dashed transparent',
        transition: 'all 150ms ease',
      }}
    />
  );
}

export function WorkspaceContainer() {
  const activeWorkspace = useActiveWorkspace();
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const panes = activeWorkspace?.panes ?? [];
  // Max 9 panes (3x3)
  const visiblePanes = panes.slice(0, 9);

  const [resizing, setResizing] = useState<{
    paneId: string;
    direction: 'left' | 'right' | 'bottom' | 'corner';
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
  }, [visiblePanes]);

  const handleResizeStart = useCallback((paneId: string, direction: 'left' | 'right' | 'bottom' | 'corner') => {
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

      // Calculate desired width/height based on direction and start position
      let desiredW = startLayout.w;
      let desiredH = startLayout.h;

      if (direction === 'right' || direction === 'corner') {
        desiredW = Math.max(1, Math.min(GRID_COLS - startLayout.x, mouseCol - startLayout.x + 1));
      }
      if (direction === 'bottom' || direction === 'corner') {
        desiredH = Math.max(1, Math.min(GRID_ROWS - startLayout.y, mouseRow - startLayout.y + 1));
      }

      // Get current state from store
      const state = useAppStore.getState();
      const workspace = state.workspaces.find(w => w.id === activeWorkspaceId);
      if (!workspace) return;

      // Get other panes' layouts (mutable copies)
      const otherPanes = workspace.panes
        .filter(p => p.id !== paneId)
        .map(p => ({ id: p.id, layout: { ...p.layout } }));

      // Left resize keeps the right edge fixed and moves x/w.
      if (direction === 'left') {
        const fixedRight = startLayout.x + startLayout.w;
        const targetX = Math.max(0, Math.min(fixedRight - 1, mouseCol));
        let resolvedX = startLayout.x;

        // Moving the left edge to the right is always a shrink inside current bounds.
        if (targetX >= startLayout.x) {
          resolvedX = targetX;
        } else {
          // Moving left may collide with other panes, so find the first non-overlapping position.
          for (let candidateX = targetX; candidateX <= startLayout.x; candidateX++) {
            const candidateW = fixedRight - candidateX;
            const overlaps = otherPanes.some((pane) => {
              const pRight = pane.layout.x + pane.layout.w;
              const pBottom = pane.layout.y + pane.layout.h;
              const cRight = candidateX + candidateW;
              const cBottom = startLayout.y + startLayout.h;
              return !(
                candidateX >= pRight ||
                cRight <= pane.layout.x ||
                startLayout.y >= pBottom ||
                cBottom <= pane.layout.y
              );
            });
            if (!overlaps) {
              resolvedX = candidateX;
              break;
            }
          }
        }

        state.updatePaneLayouts(activeWorkspaceId, [
          {
            id: paneId,
            layout: {
              ...startLayout,
              x: resolvedX,
              w: fixedRight - resolvedX,
            },
          },
        ]);
        return;
      }

      // Check which cells the resizing pane wants to occupy
      const wantedCells = new Set<string>();
      for (let row = startLayout.y; row < startLayout.y + desiredH; row++) {
        for (let col = startLayout.x; col < startLayout.x + desiredW; col++) {
          wantedCells.add(`${col},${row}`);
        }
      }

      // Find panes that collide and try to push them
      const pushPanes = (targetW: number, targetH: number): { success: boolean; updates: { id: string; layout: PaneLayout }[] } => {
        const updates: { id: string; layout: PaneLayout }[] = [];
        const pushedPanes = otherPanes.map(p => ({ id: p.id, layout: { ...p.layout } }));

        // Target area cells
        const targetCells = new Set<string>();
        for (let row = startLayout.y; row < startLayout.y + targetH; row++) {
          for (let col = startLayout.x; col < startLayout.x + targetW; col++) {
            targetCells.add(`${col},${row}`);
          }
        }

        // Find and push colliding panes
        for (const pane of pushedPanes) {
          // Check if pane collides with target area
          let collidesHorizontally = false;
          let collidesVertically = false;

          for (let row = pane.layout.y; row < pane.layout.y + pane.layout.h; row++) {
            for (let col = pane.layout.x; col < pane.layout.x + pane.layout.w; col++) {
              if (targetCells.has(`${col},${row}`)) {
                // Determine collision direction
                if (col >= startLayout.x + startLayout.w && col < startLayout.x + targetW) {
                  collidesHorizontally = true;
                }
                if (row >= startLayout.y + startLayout.h && row < startLayout.y + targetH) {
                  collidesVertically = true;
                }
                // If pane was already in the original area, push based on resize direction
                if (col >= startLayout.x && col < startLayout.x + startLayout.w &&
                    row >= startLayout.y && row < startLayout.y + startLayout.h) {
                  if (direction === 'right') collidesHorizontally = true;
                  else if (direction === 'bottom') collidesVertically = true;
                  else { collidesHorizontally = true; collidesVertically = true; }
                }
              }
            }
          }

          if (collidesHorizontally || collidesVertically) {
            let pushed = false;

            // Try to push right first for horizontal collision
            if (collidesHorizontally && !collidesVertically) {
              const pushAmount = (startLayout.x + targetW) - pane.layout.x;
              const newX = pane.layout.x + pushAmount;
              if (newX + pane.layout.w <= GRID_COLS) {
                pane.layout.x = newX;
                pushed = true;
              }
            }
            // Try to push down for vertical collision
            else if (collidesVertically && !collidesHorizontally) {
              const pushAmount = (startLayout.y + targetH) - pane.layout.y;
              const newY = pane.layout.y + pushAmount;
              if (newY + pane.layout.h <= GRID_ROWS) {
                pane.layout.y = newY;
                pushed = true;
              }
            }
            // For corner/both directions, try down first then right
            else {
              // Try push down
              const pushDownAmount = (startLayout.y + targetH) - pane.layout.y;
              const newY = pane.layout.y + pushDownAmount;
              if (newY + pane.layout.h <= GRID_ROWS) {
                pane.layout.y = newY;
                pushed = true;
              } else {
                // Try push right
                const pushRightAmount = (startLayout.x + targetW) - pane.layout.x;
                const newX = pane.layout.x + pushRightAmount;
                if (newX + pane.layout.w <= GRID_COLS) {
                  pane.layout.x = newX;
                  pushed = true;
                }
              }
            }

            if (!pushed) {
              return { success: false, updates: [] };
            }
            updates.push({ id: pane.id, layout: { ...pane.layout } });
          }
        }

        // Verify no overlaps after pushing (include the resizing pane's target area)
        const finalGrid = new Map<string, string>();

        // First, add the resizing pane's target cells
        for (let row = startLayout.y; row < startLayout.y + targetH; row++) {
          for (let col = startLayout.x; col < startLayout.x + targetW; col++) {
            const key = `${col},${row}`;
            finalGrid.set(key, paneId);
          }
        }

        // Then check pushed panes for overlaps
        for (const pane of pushedPanes) {
          for (let row = pane.layout.y; row < pane.layout.y + pane.layout.h; row++) {
            for (let col = pane.layout.x; col < pane.layout.x + pane.layout.w; col++) {
              const key = `${col},${row}`;
              if (finalGrid.has(key)) {
                return { success: false, updates: [] };
              }
              finalGrid.set(key, pane.id);
            }
          }
        }

        return { success: true, updates };
      };

      // Try to resize with push
      let result = pushPanes(desiredW, desiredH);
      let newW = desiredW;
      let newH = desiredH;

      if (!result.success) {
        // Try smaller sizes
        for (let h = desiredH; h >= startLayout.h; h--) {
          for (let w = desiredW; w >= startLayout.w; w--) {
            result = pushPanes(w, h);
            if (result.success) {
              newW = w;
              newH = h;
              break;
            }
          }
          if (result.success) break;
        }

        // If still no success, allow shrinking without push
        if (!result.success) {
          newW = desiredW < startLayout.w ? desiredW : startLayout.w;
          newH = desiredH < startLayout.h ? desiredH : startLayout.h;
          result = { success: true, updates: [] };
        }
      }

      // Apply all updates
      const allUpdates = [
        { id: paneId, layout: { ...startLayout, w: newW, h: newH } },
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
  }, [activeWorkspaceId]);

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
    const { active, over } = event;
    if (over && active.id !== over.id && activeWorkspaceId) {
      const activePane = panes.find((p) => p.id === active.id);
      if (!activePane) return;

      // Check if dropped on an empty cell
      const overId = String(over.id);
      if (overId.startsWith('empty-')) {
        // Parse empty cell coordinates: "empty-x-y"
        const parts = overId.split('-');
        const targetX = parseInt(parts[1], 10);
        const targetY = parseInt(parts[2], 10);

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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
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
