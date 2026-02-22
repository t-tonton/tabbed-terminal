import { useState } from 'react';
import { useAppStore } from '../../../stores';
import { Terminal } from './Terminal';

interface PaneProps {
  workspaceId: string;
  paneId: string;
  title: string;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function Pane({ workspaceId, paneId, title, dragHandleProps }: PaneProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);

  const deletePane = useAppStore((state) => state.deletePane);
  const updatePane = useAppStore((state) => state.updatePane);
  const focusedPaneId = useAppStore((state) => state.focusedPaneId);
  const setFocusedPane = useAppStore((state) => state.setFocusedPane);
  const unreadCount = useAppStore((state) => state.unreadCountByPane[paneId] ?? 0);

  const isFocused = focusedPaneId === paneId;

  const handlePaneClick = () => {
    setFocusedPane(paneId);
  };
  const startTitleEdit = () => {
    setEditingTitle(true);
    setDraftTitle(title);
  };

  const commitTitleEdit = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== title) {
      updatePane(workspaceId, paneId, { title: trimmed });
    }
    setEditingTitle(false);
  };

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #131d36 0%, #0f1730 100%)',
        border: isFocused ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
        borderRadius: '7px',
        overflow: 'hidden',
        boxShadow: isFocused ? '0 0 0 1px rgba(134, 164, 255, 0.25) inset' : 'none',
      }}
    >
      {/* Header - drag handle */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))',
          cursor: dragHandleProps ? 'grab' : 'default',
        }}
        {...dragHandleProps}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <h3
            className="text-xs font-medium"
            style={{
              color: isFocused ? 'var(--text-primary)' : 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '0.01em',
              fontSize: '14px',
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              startTitleEdit();
            }}
          >
            {editingTitle ? (
              <input
                autoFocus
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={commitTitleEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitTitleEdit();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setDraftTitle(title);
                    setEditingTitle(false);
                  }
                }}
                style={{
                  width: '100%',
                  height: '22px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  padding: '0 6px',
                  outline: 'none',
                }}
              />
            ) : (
              title
            )}
          </h3>
          <button
            className="flex items-center justify-center rounded transition-colors"
            style={{
              width: '24px',
              height: '24px',
              color: 'var(--text-muted)',
              marginLeft: '0px',
              transform: 'translateX(-2px)',
              flexShrink: 0,
            }}
            onMouseDown={(e) => {
              // Header is the drag handle; keep close button click from starting drag.
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              deletePane(workspaceId, paneId);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(248, 113, 113, 0.12)';
              e.currentTarget.style.color = 'var(--error)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
            aria-label="Close pane"
            title="Close pane"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
          {unreadCount > 0 && !isFocused && (
            <span
              title={`${unreadCount} unread output`}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#fbbf24',
                boxShadow: '0 0 0 2px rgba(251, 191, 36, 0.2)',
                flexShrink: 0,
              }}
            />
          )}
        </div>

      </div>

      {/* Terminal */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Terminal
            paneId={paneId}
            isFocused={isFocused}
            onFocus={handlePaneClick}
          />
        </div>
      </div>
    </div>
  );
}
