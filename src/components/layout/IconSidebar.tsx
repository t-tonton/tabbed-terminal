import { useAppStore, useActiveWorkspace } from '../../stores';

export function IconSidebar() {
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const createPane = useAppStore((state) => state.createPane);
  const openSnippetPicker = useAppStore((state) => state.openSnippetPicker);
  const openWorkspaceSearch = useAppStore((state) => state.openWorkspaceSearch);
  const activeWorkspace = useActiveWorkspace();

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
        icon={<SearchIcon />}
        label="Workspace Search"
        shortcut="⌘⇧F"
        onClick={openWorkspaceSearch}
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

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="4.5" />
      <path d="M11.5 11.5L15 15" />
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
