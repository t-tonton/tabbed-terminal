import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { useAppStore } from '../../stores';
import type { Workspace } from '../../types';

export function TabBar() {
  const workspaces = useAppStore((state) => state.workspaces);
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const setActiveWorkspace = useAppStore((state) => state.setActiveWorkspace);
  const createWorkspace = useAppStore((state) => state.createWorkspace);
  const deleteWorkspace = useAppStore((state) => state.deleteWorkspace);
  const updateWorkspace = useAppStore((state) => state.updateWorkspace);
  const reorderWorkspaces = useAppStore((state) => state.reorderWorkspaces);

  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleCloseTab = (e: React.MouseEvent, workspaceId: string) => {
    e.stopPropagation();
    e.preventDefault();
    deleteWorkspace(workspaceId);
  };

  const startRename = (workspaceId: string, currentName: string) => {
    setEditingTabId(workspaceId);
    setEditingName(currentName);
  };

  const commitRename = (workspaceId: string) => {
    const trimmed = editingName.trim();
    if (trimmed) {
      updateWorkspace(workspaceId, { name: trimmed });
    }
    setEditingTabId(null);
    setEditingName('');
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const fromIndex = workspaces.findIndex((workspace) => workspace.id === active.id);
    const toIndex = workspaces.findIndex((workspace) => workspace.id === over.id);
    reorderWorkspaces(fromIndex, toIndex);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: '42px',
        background: 'linear-gradient(180deg, #121c36 0%, #0c1328 100%)',
        borderBottom: '1px solid var(--border-subtle)',
        paddingLeft: '6px',
        paddingRight: '6px',
        gap: '2px',
        overflowX: 'auto',
        overflowY: 'hidden',
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={workspaces.map((workspace) => workspace.id)}
          strategy={horizontalListSortingStrategy}
        >
          {workspaces.map((workspace) => (
            <WorkspaceTab
              key={workspace.id}
              workspace={workspace}
              isActive={workspace.id === activeWorkspaceId}
              isHovered={workspace.id === hoveredTabId}
              isEditing={editingTabId === workspace.id}
              hasAnyEditing={Boolean(editingTabId)}
              editingName={editingName}
              onHover={() => setHoveredTabId(workspace.id)}
              onUnhover={() => setHoveredTabId(null)}
              onSelect={() => {
                if (!editingTabId) {
                  setActiveWorkspace(workspace.id);
                }
              }}
              onStartRename={() => startRename(workspace.id, workspace.name)}
              onRenameInputChange={(value) => setEditingName(value)}
              onCommitRename={() => commitRename(workspace.id)}
              onCancelRename={() => {
                setEditingTabId(null);
                setEditingName('');
              }}
              onClose={(e) => handleCloseTab(e, workspace.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* New tab button */}
      <button
        onClick={() => createWorkspace('blank')}
        title="New Workspace (⌘T)"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '34px',
          border: 'none',
          backgroundColor: 'transparent',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          borderRadius: '8px',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M7 3v8M3 7h8" />
        </svg>
      </button>
    </div>
  );
}

interface WorkspaceTabProps {
  workspace: Workspace;
  isActive: boolean;
  isHovered: boolean;
  isEditing: boolean;
  hasAnyEditing: boolean;
  editingName: string;
  onHover: () => void;
  onUnhover: () => void;
  onSelect: () => void;
  onStartRename: () => void;
  onRenameInputChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onClose: (event: React.MouseEvent) => void;
}

function WorkspaceTab({
  workspace,
  isActive,
  isHovered,
  isEditing,
  hasAnyEditing,
  editingName,
  onHover,
  onUnhover,
  onSelect,
  onStartRename,
  onRenameInputChange,
  onCommitRename,
  onCancelRename,
  onClose,
}: WorkspaceTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: workspace.id,
    disabled: hasAnyEditing,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      onDoubleClick={onStartRename}
      onMouseEnter={onHover}
      onMouseLeave={onUnhover}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '7px',
        padding: '0 10px',
        height: '34px',
        background: isActive
          ? 'linear-gradient(180deg, rgba(74, 222, 128, 0.18) 0%, rgba(74, 222, 128, 0.08) 100%)'
          : isHovered
          ? 'var(--bg-elevated)'
          : 'transparent',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
        borderStyle: 'solid',
        borderWidth: '1px',
        borderTopColor: isDragging
          ? 'rgba(125, 211, 252, 0.5)'
          : isActive
          ? 'rgba(74, 222, 128, 0.45)'
          : 'transparent',
        borderRightColor: isDragging
          ? 'rgba(125, 211, 252, 0.5)'
          : isActive
          ? 'rgba(74, 222, 128, 0.45)'
          : 'transparent',
        borderLeftColor: isDragging
          ? 'rgba(125, 211, 252, 0.5)'
          : isActive
          ? 'rgba(74, 222, 128, 0.45)'
          : 'transparent',
        borderBottomColor: isActive ? 'rgba(74, 222, 128, 0.2)' : 'transparent',
        cursor: hasAnyEditing ? 'text' : 'grab',
        flexShrink: 0,
        minWidth: '120px',
        maxWidth: '200px',
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {workspace.dirty && (
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isActive ? 'var(--success)' : 'var(--warning)',
            flexShrink: 0,
          }}
        />
      )}

      {isEditing ? (
        <input
          autoFocus
          value={editingName}
          onChange={(e) => onRenameInputChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={onCommitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onCommitRename();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancelRename();
            }
          }}
          style={{
            flex: 1,
            minWidth: 0,
            height: '24px',
            borderRadius: '4px',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            padding: '0 6px',
          }}
        />
      ) : (
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: isActive ? '#dcfce7' : 'var(--text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
          }}
          title="Double-click to rename"
        >
          {workspace.name}
        </span>
      )}

      <button
        onClick={onClose}
        aria-label={`Close ${workspace.name}`}
        title={`Close ${workspace.name}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: 'transparent',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          opacity: workspace.dirty || isHovered || isActive ? 1 : 0.45,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M8 2.5L7.5 2 5 4.5 2.5 2 2 2.5 4.5 5 2 7.5l.5.5L5 5.5 7.5 8l.5-.5L5.5 5z" />
        </svg>
      </button>
    </div>
  );
}
