import type { CSSProperties } from 'react';
import { useAppStore } from '../../../stores';

export function GridSettingsPanel() {
  const isOpen = useAppStore((state) => state.isGridSettingsOpen);
  const close = useAppStore((state) => state.closeGridSettings);
  const paneGridSize = useAppStore((state) => state.paneGridSize);
  const setPaneGridSize = useAppStore((state) => state.setPaneGridSize);

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={close}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Grid Settings</h2>
          <button style={ghostButtonStyle} onClick={close}>Close</button>
        </div>

        <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
          <label style={optionStyle}>
            <input
              type="radio"
              name="pane-grid-size"
              checked={paneGridSize === 3}
              onChange={() => setPaneGridSize(3)}
            />
            <span>3 x 3 (max 9 panes)</span>
          </label>
          <label style={optionStyle}>
            <input
              type="radio"
              name="pane-grid-size"
              checked={paneGridSize === 4}
              onChange={() => setPaneGridSize(4)}
            />
            <span>4 x 4 (max 16 panes)</span>
          </label>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(3, 6, 18, 0.48)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 60,
  backdropFilter: 'blur(2px)',
};

const panelStyle: CSSProperties = {
  width: 'min(420px, 92vw)',
  borderRadius: '12px',
  border: '1px solid var(--border-default)',
  background: 'linear-gradient(180deg, rgba(17,26,51,0.88) 0%, rgba(12,19,40,0.88) 100%)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  padding: '14px',
  color: 'var(--text-primary)',
};

const optionStyle: CSSProperties = {
  borderRadius: '8px',
  border: '1px solid var(--border-subtle)',
  background: 'rgba(255,255,255,0.03)',
  padding: '10px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
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

