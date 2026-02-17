import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useAppStore } from '../../../stores';
import type { Snippet } from '../../../types';

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function SnippetPicker() {
  const isOpen = useAppStore((state) => state.isSnippetPickerOpen);
  const close = useAppStore((state) => state.closeSnippetPicker);
  const snippets = useAppStore((state) => state.snippets);
  const addSnippet = useAppStore((state) => state.addSnippet);
  const updateSnippet = useAppStore((state) => state.updateSnippet);
  const deleteSnippet = useAppStore((state) => state.deleteSnippet);

  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingCommand, setEditingCommand] = useState('');
  const [feedback, setFeedback] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return snippets;
    return snippets.filter((snippet) =>
      snippet.title.toLowerCase().includes(q) ||
      snippet.command.toLowerCase().includes(q)
    );
  }, [search, snippets]);

  const copySnippet = async (snippet: Snippet | undefined) => {
    if (!snippet) return;
    const ok = await copyToClipboard(snippet.command);
    setFeedback(ok ? `Copied: ${snippet.title}` : 'Copy failed');
  };

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }

      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void copySnippet(filtered[0]);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close, filtered]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(''), 1400);
    return () => clearTimeout(timer);
  }, [feedback]);

  if (!isOpen) return null;

  const onAdd = () => {
    const id = addSnippet(newTitle, newCommand);
    if (!id) return;
    setNewTitle('');
    setNewCommand('');
    setFeedback('Added');
  };

  const startEdit = (snippet: Snippet) => {
    setEditingId(snippet.id);
    setEditingTitle(snippet.title);
    setEditingCommand(snippet.command);
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateSnippet(editingId, { title: editingTitle, command: editingCommand });
    setEditingId(null);
    setEditingTitle('');
    setEditingCommand('');
    setFeedback('Updated');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 6, 18, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        backdropFilter: 'blur(2px)',
      }}
      onClick={close}
    >
      <div
        style={{
          width: 'min(820px, 92vw)',
          maxHeight: '86vh',
          overflow: 'auto',
          borderRadius: '12px',
          border: '1px solid var(--border-default)',
          background: 'linear-gradient(180deg, #111a33 0%, #0c1328 100%)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          padding: '14px',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Snippets</h2>
          <button onClick={close} style={ghostButtonStyle}>Close</button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search snippets..."
          style={inputStyle}
        />

        <div style={{ display: 'grid', gap: '8px', marginTop: '10px', marginBottom: '12px' }}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New snippet title"
            style={inputStyle}
          />
          <textarea
            value={newCommand}
            onChange={(e) => setNewCommand(e.target.value)}
            placeholder="Command"
            style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Cmd/Ctrl+Enter copies top result</span>
            <button onClick={onAdd} style={primaryButtonStyle}>Add Snippet</button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '8px' }}>
          {filtered.map((snippet) => {
            const isEditing = editingId === snippet.id;

            if (isEditing) {
              return (
                <div key={snippet.id} style={cardStyle}>
                  <input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    style={inputStyle}
                  />
                  <textarea
                    value={editingCommand}
                    onChange={(e) => setEditingCommand(e.target.value)}
                    style={{ ...inputStyle, minHeight: '80px', marginTop: '8px', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                    <button onClick={() => setEditingId(null)} style={ghostButtonStyle}>Cancel</button>
                    <button onClick={saveEdit} style={primaryButtonStyle}>Save</button>
                  </div>
                </div>
              );
            }

            return (
              <div key={snippet.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{snippet.title}</div>
                    <pre style={{ margin: '6px 0 0 0', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: '12px' }}>{snippet.command}</pre>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'flex-start' }}>
                    <button onClick={() => void copySnippet(snippet)} style={primaryButtonStyle}>Copy</button>
                    <button onClick={() => startEdit(snippet)} style={ghostButtonStyle}>Edit</button>
                    <button onClick={() => deleteSnippet(snippet.id)} style={dangerButtonStyle}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {feedback ? (
          <div style={{ marginTop: '10px', color: '#a7f3d0', fontSize: '12px' }}>{feedback}</div>
        ) : null}
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  borderRadius: '8px',
  border: '1px solid var(--border-default)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  padding: '8px 10px',
  fontSize: '13px',
};

const cardStyle: CSSProperties = {
  borderRadius: '9px',
  border: '1px solid var(--border-subtle)',
  background: 'rgba(255,255,255,0.02)',
  padding: '10px',
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

const dangerButtonStyle: CSSProperties = {
  border: '1px solid rgba(248, 113, 113, 0.55)',
  background: 'rgba(248, 113, 113, 0.12)',
  color: '#fecaca',
  borderRadius: '7px',
  padding: '6px 10px',
  fontSize: '12px',
  cursor: 'pointer',
};
