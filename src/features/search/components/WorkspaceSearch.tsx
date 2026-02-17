import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useAppStore } from '../../../stores';

interface SearchResult {
  workspaceId: string;
  workspaceName: string;
  paneId: string;
  paneTitle: string;
  lineNumber: number;
  preview: string;
}

const MAX_RESULTS = 120;

export function WorkspaceSearch() {
  const isOpen = useAppStore((state) => state.isWorkspaceSearchOpen);
  const close = useAppStore((state) => state.closeWorkspaceSearch);
  const workspaces = useAppStore((state) => state.workspaces);
  const terminalHistoryByPane = useAppStore((state) => state.terminalHistoryByPane);
  const setActiveWorkspace = useAppStore((state) => state.setActiveWorkspace);
  const setFocusedPane = useAppStore((state) => state.setFocusedPane);

  const [query, setQuery] = useState('');

  const handleClose = useCallback(() => {
    close();
    setQuery('');
  }, [close]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as SearchResult[];

    const found: SearchResult[] = [];

    for (const workspace of workspaces) {
      for (const pane of workspace.panes) {
        const history = terminalHistoryByPane[pane.id] ?? '';
        if (!history) continue;

        const lines = history.split('\n');
        for (let i = 0; i < lines.length; i += 1) {
          const line = lines[i];
          if (!line) continue;
          if (!line.toLowerCase().includes(q)) continue;

          found.push({
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            paneId: pane.id,
            paneTitle: pane.title,
            lineNumber: i + 1,
            preview: line.length > 140 ? `${line.slice(0, 140)}...` : line,
          });

          if (found.length >= MAX_RESULTS) return found;
        }
      }
    }

    return found;
  }, [query, terminalHistoryByPane, workspaces]);

  const jumpToResult = useCallback(
    (result: SearchResult) => {
      const q = query.trim();
      setActiveWorkspace(result.workspaceId);
      setFocusedPane(result.paneId);
      handleClose();

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('pane-search-open', {
            detail: { paneId: result.paneId, query: q },
          }),
        );
      }, 0);
    },
    [handleClose, query, setActiveWorkspace, setFocusedPane],
  );

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        jumpToResult(results[0]);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handleClose, isOpen, jumpToResult, results]);

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={handleClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Workspace Search</h2>
          <button onClick={handleClose} style={ghostButtonStyle}>Close</button>
        </div>

        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search across pane history..."
          style={inputStyle}
        />

        <div style={{ marginTop: '10px', color: 'var(--text-muted)', fontSize: '12px' }}>
          {query.trim() ? `${results.length} result(s)` : 'Type to search all panes in this app session'}
        </div>

        <div style={{ display: 'grid', gap: '8px', marginTop: '10px', maxHeight: '56vh', overflowY: 'auto' }}>
          {results.map((result, index) => (
            <button
              key={`${result.workspaceId}-${result.paneId}-${result.lineNumber}-${index}`}
              onClick={() => jumpToResult(result)}
              style={resultButtonStyle}
              title="Open pane and highlight match"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ fontSize: '12px', color: '#a7f3d0' }}>{result.workspaceName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Line {result.lineNumber}</div>
              </div>
              <div style={{ marginTop: '3px', fontSize: '13px', color: 'var(--text-primary)', textAlign: 'left' }}>{result.paneTitle}</div>
              <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                {result.preview}
              </div>
            </button>
          ))}

          {query.trim() && results.length === 0 ? (
            <div style={emptyStyle}>No matches in pane history.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(3, 6, 18, 0.46)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 61,
  backdropFilter: 'blur(2px)',
};

const panelStyle: CSSProperties = {
  width: 'min(900px, 92vw)',
  maxHeight: '84vh',
  overflow: 'hidden',
  borderRadius: '12px',
  border: '1px solid var(--border-default)',
  background: 'linear-gradient(180deg, #111a33 0%, #0c1328 100%)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  padding: '14px',
  color: 'var(--text-primary)',
};

const inputStyle: CSSProperties = {
  width: '100%',
  borderRadius: '8px',
  border: '1px solid var(--border-default)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  padding: '8px 10px',
  fontSize: '13px',
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

const resultButtonStyle: CSSProperties = {
  width: '100%',
  textAlign: 'left',
  borderRadius: '9px',
  border: '1px solid var(--border-subtle)',
  background: 'rgba(255,255,255,0.02)',
  padding: '10px',
  cursor: 'pointer',
};

const emptyStyle: CSSProperties = {
  borderRadius: '9px',
  border: '1px dashed var(--border-default)',
  padding: '12px',
  color: 'var(--text-muted)',
  fontSize: '12px',
};
