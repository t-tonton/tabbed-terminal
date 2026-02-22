import { useMemo, useState } from 'react';
import { useAppStore } from '../../../stores';
import { Terminal } from './Terminal';

interface PaneProps {
  workspaceId: string;
  paneId: string;
  title: string;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

const EMPTY_IDS: string[] = [];
const EMPTY_LOGS: {
  id: string;
  parentPaneId: string;
  targetPaneIds: string[];
  command: string;
  createdAt: string;
  status: 'success' | 'partial' | 'failed';
  failedPaneIds: string[];
}[] = [];

function getLatestVisibleLine(raw: string): string {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines[lines.length - 1] : '(no output yet)';
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
}

export function Pane({ workspaceId, paneId, title, dragHandleProps }: PaneProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [commandDraft, setCommandDraft] = useState('');
  const [orchestrationOpen, setOrchestrationOpen] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchMessage, setDispatchMessage] = useState('');

  const deletePane = useAppStore((state) => state.deletePane);
  const updatePane = useAppStore((state) => state.updatePane);
  const focusedPaneId = useAppStore((state) => state.focusedPaneId);
  const setFocusedPane = useAppStore((state) => state.setFocusedPane);
  const unreadCount = useAppStore((state) => state.unreadCountByPane[paneId] ?? 0);
  const workspaces = useAppStore((state) => state.workspaces);
  const managedPaneIds = useAppStore((state) => state.managedPaneIdsByParent[paneId] ?? EMPTY_IDS);
  const setManagedPaneIds = useAppStore((state) => state.setManagedPaneIds);
  const sendCommandToPaneTargets = useAppStore((state) => state.sendCommandToPaneTargets);
  const paneDispatchLogs = useAppStore(
    (state) => state.paneDispatchLogsByParent[paneId] ?? EMPTY_LOGS
  );
  const terminalHistoryByPane = useAppStore((state) => state.terminalHistoryByPane);

  const workspace = workspaces.find((w) => w.id === workspaceId);
  const childPanes = useMemo(
    () => (workspace?.panes ?? []).filter((pane) => pane.id !== paneId),
    [workspace, paneId]
  );

  const selectedManagedPaneIds = useMemo(() => {
    const childPaneIdSet = new Set(childPanes.map((pane) => pane.id));
    return managedPaneIds.filter((id) => childPaneIdSet.has(id));
  }, [childPanes, managedPaneIds]);

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

  const toggleManagedPane = (targetPaneId: string) => {
    const next = selectedManagedPaneIds.includes(targetPaneId)
      ? selectedManagedPaneIds.filter((id) => id !== targetPaneId)
      : [...selectedManagedPaneIds, targetPaneId];
    setManagedPaneIds(paneId, next);
  };

  const sendCommand = async (targetPaneIds: string[]) => {
    const command = commandDraft.trim();
    if (command.length === 0 || targetPaneIds.length === 0 || isDispatching) return;

    if (targetPaneIds.length > 1) {
      const ok = window.confirm(
        `${targetPaneIds.length} panes to receive this command. Continue?`
      );
      if (!ok) return;
    }

    setIsDispatching(true);
    setDispatchMessage('');

    try {
      const result = await sendCommandToPaneTargets(paneId, targetPaneIds, command);
      const successCount = result.successPaneIds.length;
      const failedCount = result.failedPaneIds.length;
      setDispatchMessage(`Sent: ${successCount}, Failed: ${failedCount}`);
    } finally {
      setIsDispatching(false);
    }
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
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setOrchestrationOpen((prev) => !prev);
              setFocusedPane(paneId);
            }}
            aria-label="Toggle orchestration panel"
            title="Toggle orchestration panel"
            style={{
              minWidth: '64px',
              height: '24px',
              border: '1px solid var(--border-default)',
              borderRadius: '4px',
              backgroundColor: orchestrationOpen ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              color: orchestrationOpen ? '#c7d2fe' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 600,
              padding: '0 8px',
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: orchestrationOpen ? '#6366f1' : 'var(--text-muted)',
              }}
            />
            Relay
          </button>
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

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {orchestrationOpen && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              right: '8px',
              zIndex: 40,
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              backgroundColor: 'rgba(8, 14, 30, 0.95)',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '56%',
              overflow: 'auto',
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                value={commandDraft}
                onChange={(e) => setCommandDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void sendCommand(selectedManagedPaneIds);
                  }
                }}
                placeholder="Send command to selected child panes"
                style={{
                  flex: 1,
                  height: '28px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  padding: '0 8px',
                  fontSize: '12px',
                }}
              />
              <button
                type="button"
                onClick={() => void sendCommand(selectedManagedPaneIds)}
                disabled={
                  isDispatching ||
                  selectedManagedPaneIds.length === 0 ||
                  commandDraft.trim().length === 0
                }
                style={{
                  height: '28px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: '#1d4ed8',
                  color: '#fff',
                  padding: '0 8px',
                  fontSize: '12px',
                }}
              >
                Send
              </button>
              <button
                type="button"
                onClick={() => setOrchestrationOpen(false)}
                style={{
                  height: '28px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  padding: '0 8px',
                  fontSize: '12px',
                }}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
              <button
                type="button"
                onClick={() => setManagedPaneIds(paneId, childPanes.map((pane) => pane.id))}
                style={{
                  height: '24px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  padding: '0 8px',
                }}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => setManagedPaneIds(paneId, [])}
                style={{
                  height: '24px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  padding: '0 8px',
                }}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => void sendCommand(childPanes.map((pane) => pane.id))}
                disabled={
                  isDispatching ||
                  childPanes.length === 0 ||
                  commandDraft.trim().length === 0
                }
                style={{
                  height: '24px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  padding: '0 8px',
                }}
              >
                Send All Children
              </button>
              {dispatchMessage && (
                <span style={{ color: 'var(--text-muted)' }}>{dispatchMessage}</span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Auto relay from parent output: lines starting with <code>@2 ...</code>,{' '}
              <code>@2,3 ...</code>, or <code>@all ...</code>.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {childPanes.length === 0 && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  No child panes in this workspace.
                </div>
              )}
              {childPanes.map((childPane) => {
                const selected = selectedManagedPaneIds.includes(childPane.id);
                const latestOutput = getLatestVisibleLine(terminalHistoryByPane[childPane.id] ?? '');
                return (
                  <label
                    key={childPane.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '4px',
                      padding: '5px 6px',
                      cursor: 'pointer',
                    }}
                    title={`Latest: ${latestOutput}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleManagedPane(childPane.id)}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--text-primary)', flex: 1 }}>
                      {childPane.title}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        void sendCommand([childPane.id]);
                      }}
                      disabled={isDispatching || commandDraft.trim().length === 0}
                      style={{
                        height: '22px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-primary)',
                        padding: '0 6px',
                        fontSize: '11px',
                      }}
                    >
                      Send
                    </button>
                  </label>
                );
              })}
            </div>

            {paneDispatchLogs.length > 0 && (
              <details>
                <summary style={{ fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Dispatch Log
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  {paneDispatchLogs.slice(0, 5).map((log) => (
                    <div key={log.id} style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      [{formatTime(log.createdAt)}] {log.status.toUpperCase()} ({log.targetPaneIds.length}): {log.command}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0 }}>
          <Terminal paneId={paneId} isFocused={isFocused} onFocus={handlePaneClick} />
        </div>
      </div>
    </div>
  );
}
