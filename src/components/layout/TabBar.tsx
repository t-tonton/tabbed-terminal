import { useState } from 'react';
import { useAppStore } from '../../stores';

export function TabBar() {
  const workspaces = useAppStore((state) => state.workspaces);
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const setActiveWorkspace = useAppStore((state) => state.setActiveWorkspace);
  const createWorkspace = useAppStore((state) => state.createWorkspace);
  const deleteWorkspace = useAppStore((state) => state.deleteWorkspace);
  const updateWorkspace = useAppStore((state) => state.updateWorkspace);

  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

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
      {/* Workspace tabs - horizontal */}
      {workspaces.map((workspace) => {
        const isActive = workspace.id === activeWorkspaceId;
        const isHovered = workspace.id === hoveredTabId;

        return (
          <div
            key={workspace.id}
            onClick={() => {
              if (!editingTabId) {
                setActiveWorkspace(workspace.id);
              }
            }}
            onDoubleClick={() => startRename(workspace.id, workspace.name)}
            onMouseEnter={() => setHoveredTabId(workspace.id)}
            onMouseLeave={() => setHoveredTabId(null)}
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
              border: isActive ? '1px solid rgba(74, 222, 128, 0.45)' : '1px solid transparent',
              borderBottom: isActive ? '1px solid rgba(74, 222, 128, 0.2)' : '1px solid transparent',
              cursor: 'pointer',
              flexShrink: 0,
              minWidth: '120px',
              maxWidth: '200px',
            }}
          >
            {/* Dirty indicator */}
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

            {/* Tab name */}
            {editingTabId === workspace.id ? (
              <input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={() => commitRename(workspace.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitRename(workspace.id);
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setEditingTabId(null);
                    setEditingName('');
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

            {/* Close button */}
            <button
              onClick={(e) => handleCloseTab(e, workspace.id)}
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
      })}

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
