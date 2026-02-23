import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useAppStore } from '../../../stores';
import {
  type RelayStateSnapshot,
  relayStateEventName,
  requestRelayStateFromMain,
} from '../windowBridge';

const EMPTY_STATE: RelayStateSnapshot = {
  sourcePaneId: null,
  panes: [],
};

export function RelayWindow() {
  const sendCommandToPaneTargets = useAppStore((state) => state.sendCommandToPaneTargets);
  const [snapshot, setSnapshot] = useState<RelayStateSnapshot>(EMPTY_STATE);
  const [command, setCommand] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState('');

  const sourcePane = useMemo(
    () => snapshot.panes.find((pane) => pane.id === snapshot.sourcePaneId) ?? null,
    [snapshot]
  );
  const targetPanes = useMemo(
    () => snapshot.panes.filter((pane) => pane.id !== snapshot.sourcePaneId),
    [snapshot]
  );
  const autoTargetPaneIds = useMemo(() => {
    if (!snapshot.sourcePaneId) return [];
    if (targetPanes.length > 0) return targetPanes.map((pane) => pane.id);
    return [snapshot.sourcePaneId];
  }, [snapshot.sourcePaneId, targetPanes]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let active = true;

    const setup = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      unlisten = await listen<RelayStateSnapshot>(relayStateEventName(), (event) => {
        if (!active) return;
        setSnapshot(event.payload);
      });
      await requestRelayStateFromMain();
    };

    void setup();
    return () => {
      active = false;
      unlisten?.();
    };
  }, []);

  const send = async () => {
    const trimmed = command.trim();
    if (!snapshot.sourcePaneId || !trimmed || autoTargetPaneIds.length === 0 || isSending) {
      return;
    }

    setIsSending(true);
    setFeedback('');
    try {
      const result = await sendCommandToPaneTargets(
        snapshot.sourcePaneId,
        autoTargetPaneIds,
        trimmed
      );
      setFeedback(`Sent: ${result.successPaneIds.length}, Failed: ${result.failedPaneIds.length}`);
      setCommand('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={rootStyle}>
      <div style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Relay</h1>
        <button
          style={ghostButtonStyle}
          onClick={() => {
            void getCurrentWebviewWindow().close();
          }}
        >
          Close
        </button>
      </div>

      <div style={{ display: 'grid', gap: '8px' }}>
        <label style={labelStyle}>Active source</label>
        <div style={readOnlyFieldStyle}>{sourcePane?.title ?? 'No pane selected'}</div>
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
    </div>
  );
}

const rootStyle: CSSProperties = {
  height: '100vh',
  overflow: 'auto',
  background: 'linear-gradient(180deg, rgba(17,26,51,0.82) 0%, rgba(12,19,40,0.82) 100%)',
  backdropFilter: 'blur(6px)',
  padding: '14px',
  color: 'var(--text-primary)',
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
