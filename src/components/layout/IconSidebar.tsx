import { useState } from 'react';
import { useAppStore, useActiveWorkspace } from '../../stores';

export function IconSidebar() {
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const createPane = useAppStore((state) => state.createPane);
  const openSnippetPicker = useAppStore((state) => state.openSnippetPicker);
  const openWorkspaceSearch = useAppStore((state) => state.openWorkspaceSearch);
  const activeWorkspace = useActiveWorkspace();
  const [settingsActive, setSettingsActive] = useState(false);

  const handleNewPane = () => {
    if (activeWorkspaceId) {
      createPane(activeWorkspaceId, {
        title: `Pane ${(activeWorkspace?.panes.length ?? 0) + 1}`,
      });
    }
  };

  return (
    <div
      style={{
        width: '46px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '8px',
        paddingBottom: '8px',
        gap: '2px',
        background: 'linear-gradient(180deg, #0a1021 0%, #0a1125 100%)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      <SidebarButton
        icon={<FilesIcon />}
        label="Explorer"
        onClick={() => {}}
        disabled
      />

      <SidebarButton
        icon={<SearchIcon />}
        label="Workspace Search"
        shortcut="⌘⇧F"
        onClick={openWorkspaceSearch}
      />

      <SidebarButton
        icon={<GitIcon />}
        label="Source Control"
        onClick={() => {}}
        disabled
      />

      <div style={{ height: '1px', width: '24px', backgroundColor: 'var(--border-subtle)', margin: '8px 0' }} />

      <SidebarButton
        icon={<PlusIcon />}
        label="New Pane"
        shortcut="⌘N"
        onClick={handleNewPane}
        disabled={!activeWorkspaceId}
      />

      <SidebarButton
        icon={<SnippetsIcon />}
        label="Snippets"
        shortcut="⌘⇧P"
        onClick={openSnippetPicker}
      />

      <SidebarButton
        icon={<TerminalIcon />}
        label="Terminal"
        onClick={() => {}}
        disabled
      />

      <div style={{ flex: 1 }} />

      <SidebarButton
        icon={<ApiIcon />}
        label="API Settings"
        onClick={() => {}}
        disabled
      />

      <SidebarButton
        icon={<SettingsIcon />}
        label="Settings"
        active={settingsActive}
        onClick={() => setSettingsActive((prev) => !prev)}
      />
    </div>
  );
}

function SidebarButton({
  icon,
  label,
  shortcut,
  onClick,
  disabled,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
      style={{
        backgroundColor: active ? 'var(--bg-active)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
      }}
      onClick={onClick}
      disabled={disabled}
      title={disabled ? `${label} (Coming soon)` : shortcut ? `${label} (${shortcut})` : label}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = active ? 'var(--bg-active)' : 'transparent';
        e.currentTarget.style.color = active ? 'var(--text-primary)' : 'var(--text-muted)';
      }}
    >
      {icon}
    </button>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M9 4v10M4 9h10" />
    </svg>
  );
}

function FilesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2H5a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7l-5-5z" />
      <path d="M10 2v5h5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="4.5" />
      <path d="M11.5 11.5L15 15" />
    </svg>
  );
}

function GitIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="4" r="1.5" />
      <circle cx="13" cy="9" r="1.5" />
      <circle cx="5" cy="14" r="1.5" />
      <path d="M6.5 4h3A3.5 3.5 0 0113 7.5V7.5" />
      <path d="M5 5.5v7" />
      <path d="M6.5 14H11" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="3.5" width="13" height="11" rx="2" />
      <path d="M5.5 7l2 2-2 2" />
      <path d="M9.5 11h3" />
    </svg>
  );
}

function SnippetsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="12" height="12" rx="2" />
      <path d="M6 7h6" />
      <path d="M6 10h6" />
      <path d="M6 13h4" />
    </svg>
  );
}

function ApiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 5h6" />
      <path d="M5 9h8" />
      <path d="M6 13h6" />
      <rect x="3" y="2.5" width="12" height="13" rx="2.5" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="2.5" />
      <path d="M14.5 9a5.5 5.5 0 01-.5 2.3l1.5 1.2-1 1.7-1.8-.6a5.5 5.5 0 01-2 1.2L10 16H8l-.7-1.2a5.5 5.5 0 01-2-1.2l-1.8.6-1-1.7 1.5-1.2A5.5 5.5 0 013.5 9a5.5 5.5 0 01.5-2.3L2.5 5.5l1-1.7 1.8.6a5.5 5.5 0 012-1.2L8 2h2l.7 1.2a5.5 5.5 0 012 1.2l1.8-.6 1 1.7-1.5 1.2a5.5 5.5 0 01.5 2.3z" />
    </svg>
  );
}
