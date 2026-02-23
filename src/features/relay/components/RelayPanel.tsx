import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useActiveWorkspace, useAppStore } from '../../../stores';

export function RelayPanel() {
  const isOpen = useAppStore((state) => state.isRelayPanelOpen);
  const close = useAppStore((state) => state.closeRelayPanel);
  const sendCommandToPaneTargets = useAppStore((state) => state.sendCommandToPaneTargets);
  const focusedPaneId = useAppStore((state) => state.focusedPaneId);
  const paneDispatchLogsByParent = useAppStore((state) => state.paneDispatchLogsByParent);
  const activeWorkspace = useActiveWorkspace();

  const [command, setCommand] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [position, setPosition] = useState(() => ({
    x: Math.max(16, window.innerWidth - 580),
    y: Math.max(16, window.innerHeight - 520),
  }));
  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  const panes = useMemo(() => activeWorkspace?.panes ?? [], [activeWorkspace]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const panelWidth = panelRef.current?.offsetWidth ?? 560;
      const panelHeight = panelRef.current?.offsetHeight ?? 520;
      const maxX = Math.max(16, window.innerWidth - panelWidth - 16);
      const maxY = Math.max(16, window.innerHeight - panelHeight - 16);
      const nextX = Math.min(maxX, Math.max(16, e.clientX - dragOffsetRef.current.x));
      const nextY = Math.min(maxY, Math.max(16, e.clientY - dragOffsetRef.current.y));
      setPosition({ x: nextX, y: nextY });
    };

    const onMouseUp = () => {
      draggingRef.current = false;
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setFeedback('');
  }, [isOpen]);

  const sourcePaneId = useMemo(() => {
    if (focusedPaneId && panes.some((pane) => pane.id === focusedPaneId)) return focusedPaneId;
    return panes[0]?.id ?? '';
  }, [focusedPaneId, panes]);

  const targetPanes = useMemo(
    () => panes.filter((pane) => pane.id !== sourcePaneId),
    [panes, sourcePaneId]
  );

  const autoTargetPaneIds = useMemo(() => {
    if (!sourcePaneId) return [];
    if (targetPanes.length > 0) return targetPanes.map((pane) => pane.id);
    return [sourcePaneId];
  }, [sourcePaneId, targetPanes]);

  const dispatchLogs = useMemo(() => {
    if (!sourcePaneId) return [];
    return (paneDispatchLogsByParent[sourcePaneId] ?? []).slice(0, 5);
  }, [paneDispatchLogsByParent, sourcePaneId]);

  if (!isOpen) return null;

  const send = async () => {
    const trimmed = command.trim();
    if (!sourcePaneId || !trimmed || autoTargetPaneIds.length === 0 || isSending) return;
    setIsSending(true);
    setFeedback('');
    try {
      const result = await sendCommandToPaneTargets(sourcePaneId, autoTargetPaneIds, trimmed);
      setFeedback(`Sent: ${result.successPaneIds.length}, Failed: ${result.failedPaneIds.length}`);
      setCommand('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={dockStyle(position.x, position.y)}>
      <div ref={panelRef} style={panelStyle}>
        <div
          style={headerStyle}
          onMouseDown={(e) => {
            const rect = panelRef.current?.getBoundingClientRect();
            if (!rect) return;
            draggingRef.current = true;
            dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            document.body.style.userSelect = 'none';
          }}
        >
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Relay</h2>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={close}
            style={ghostButtonStyle}
          >
            Close
          </button>
        </div>

        <div style={{ display: 'grid', gap: '8px' }}>
          <label style={labelStyle}>Source pane (active)</label>
          <div style={readOnlyFieldStyle}>{sourcePaneId ? panes.find((pane) => pane.id === sourcePaneId)?.title : 'No pane selected'}</div>
          <div style={hintStyle}>
            {targetPanes.length > 0
              ? `Send target: all other panes (${targetPanes.length})`
              : 'Send target: current pane (single-pane mode)'}
          </div>
        </div>

        <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
          <label style={labelStyle}>Command</label>
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="pwd"
            style={inputStyle}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Targets: {autoTargetPaneIds.length}
            </span>
            <button
              onClick={() => void send()}
              style={primaryButtonStyle}
              disabled={isSending || !command.trim() || autoTargetPaneIds.length === 0}
            >
              Send
            </button>
          </div>
          {feedback && <div style={{ color: '#a7f3d0', fontSize: '12px' }}>{feedback}</div>}
        </div>

        {dispatchLogs.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ ...labelStyle, marginBottom: '6px' }}>Dispatch log</div>
            <div style={{ display: 'grid', gap: '6px' }}>
              {dispatchLogs.map((log) => (
                <div key={log.id} style={logItemStyle}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {new Date(log.createdAt).toLocaleTimeString()} · {log.status.toUpperCase()} · {log.targetPaneIds.length} target(s)
                  </div>
                  <code style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{log.command}</code>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const dockStyle = (x: number, y: number): CSSProperties => ({
  position: 'fixed',
  left: `${x}px`,
  top: `${y}px`,
  width: 'min(560px, calc(100vw - 80px))',
  maxHeight: 'calc(100vh - 90px)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'flex-end',
  zIndex: 60,
  pointerEvents: 'none',
});

const panelStyle: CSSProperties = {
  width: '100%',
  maxHeight: '100%',
  overflow: 'auto',
  borderRadius: '12px',
  border: '1px solid var(--border-default)',
  background: 'linear-gradient(180deg, rgba(17,26,51,0.82) 0%, rgba(12,19,40,0.82) 100%)',
  backdropFilter: 'blur(6px)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  padding: '14px',
  color: 'var(--text-primary)',
  pointerEvents: 'auto',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '12px',
};

const labelStyle: CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '12px',
};

const inputStyle: CSSProperties = {
  width: '100%',
  borderRadius: '8px',
  border: '1px solid var(--border-default)',
  background: 'rgba(12, 18, 36, 0.68)',
  color: 'var(--text-primary)',
  padding: '8px 10px',
  fontSize: '13px',
};

const readOnlyFieldStyle: CSSProperties = {
  width: '100%',
  borderRadius: '8px',
  border: '1px solid var(--border-default)',
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--text-primary)',
  padding: '8px 10px',
  fontSize: '13px',
  minHeight: '34px',
  display: 'flex',
  alignItems: 'center',
};

const hintStyle: CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '12px',
  padding: '2px 2px 0 2px',
};

const logItemStyle: CSSProperties = {
  borderRadius: '8px',
  border: '1px solid var(--border-subtle)',
  background: 'rgba(255,255,255,0.02)',
  padding: '8px 10px',
  display: 'grid',
  gap: '4px',
};

const primaryButtonStyle: CSSProperties = {
  border: '1px solid rgba(74, 222, 128, 0.45)',
  background: 'rgba(74, 222, 128, 0.16)',
  color: '#dcfce7',
  borderRadius: '7px',
  padding: '6px 10px',
  fontSize: '12px',
  cursor: 'pointer',
};

const ghostButtonStyle: CSSProperties = {
  border: '1px solid var(--border-default)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  borderRadius: '7px',
  padding: '6px 10px',
  fontSize: '12px',
  cursor: 'pointer',
};
