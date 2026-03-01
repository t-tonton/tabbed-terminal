import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useActiveWorkspace, useAppStore } from '../../../stores';

interface FileTreeNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileTreeNode[];
}

interface FileTreeResponse {
  root: FileTreeNode;
}

const DEFAULT_DEPTH = 3;

export function FileTreeDrawer() {
  const closeFileTree = useAppStore((state) => state.closeFileTree);
  const focusedPaneId = useAppStore((state) => state.focusedPaneId);
  const paneCurrentDirectoryById = useAppStore((state) => state.paneCurrentDirectoryById);
  const activeWorkspace = useActiveWorkspace();

  const [commandRootPath, setCommandRootPath] = useState('');
  const [maxDepth, setMaxDepth] = useState(DEFAULT_DEPTH);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tree, setTree] = useState<FileTreeNode | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [followActivePane, setFollowActivePane] = useState(true);

  const panes = useMemo(() => activeWorkspace?.panes ?? [], [activeWorkspace]);
  const activePaneId = useMemo(() => {
    if (focusedPaneId && panes.some((pane) => pane.id === focusedPaneId)) return focusedPaneId;
    return panes[0]?.id ?? '';
  }, [focusedPaneId, panes]);
  const activePanePath = activePaneId ? paneCurrentDirectoryById[activePaneId] ?? '' : '';

  useEffect(() => {
    if (!followActivePane) return;
    if (!activePanePath) return;
    setCommandRootPath(activePanePath);
  }, [activePanePath, followActivePane]);

  const loadTree = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await invoke<FileTreeResponse>('list_file_tree', {
        rootPath: commandRootPath.trim() || null,
        maxDepth,
        includeHidden: false,
      });
      setTree(response.root);
      setExpandedPaths(new Set([response.root.path]));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Failed to load file tree');
      setTree(null);
    } finally {
      setIsLoading(false);
    }
  }, [commandRootPath, maxDepth]);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <aside style={drawerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'grid', gap: 2 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>File Tree</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {activePanePath ? `Active pane dir: ${activePanePath}` : 'Active pane dir: (unknown yet)'}
          </div>
        </div>
        <button style={ghostButtonStyle} onClick={closeFileTree}>Close</button>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <label style={labelStyle}>Root path</label>
        <input
          value={commandRootPath}
          onChange={(e) => setCommandRootPath(e.target.value)}
          placeholder={activePanePath || '/path/to/project'}
          style={inputStyle}
        />
      </div>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={followActivePane}
            onChange={(e) => setFollowActivePane(e.target.checked)}
          />
          Follow active pane
        </label>
        <label style={checkboxLabelStyle}>
          Depth
          <select
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value))}
            style={selectStyle}
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
          </select>
        </label>
        <button style={refreshButtonStyle} onClick={() => void loadTree()} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div style={contentStyle}>
        {error && <div style={{ color: '#fca5a5', fontSize: 12 }}>{error}</div>}
        {!error && tree && (
          <TreeNode
            node={tree}
            depth={0}
            expandedPaths={expandedPaths}
            onToggle={toggleExpand}
          />
        )}
      </div>
    </aside>
  );
}

function TreeNode({
  node,
  depth,
  expandedPaths,
  onToggle,
}: {
  node: FileTreeNode;
  depth: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
}) {
  const isExpanded = expandedPaths.has(node.path);
  const hasChildren = node.is_dir && (node.children?.length ?? 0) > 0;

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) onToggle(node.path);
        }}
        style={{
          ...rowStyle,
          paddingLeft: `${10 + depth * 14}px`,
          cursor: hasChildren ? 'pointer' : 'default',
        }}
        title={node.path}
      >
        <span style={{ width: 12, display: 'inline-block', color: 'var(--text-muted)' }}>
          {hasChildren ? (isExpanded ? '▾' : '▸') : ''}
        </span>
        <span style={{ marginRight: 6, color: 'var(--text-muted)', fontSize: 11 }}>
          {node.is_dir ? '[D]' : '[F]'}
        </span>
        <span style={{ color: 'var(--text-primary)', fontSize: 12 }}>{node.name}</span>
      </button>
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const drawerStyle: CSSProperties = {
  width: 320,
  minWidth: 280,
  maxWidth: 420,
  borderRight: '1px solid var(--border-subtle)',
  background: 'linear-gradient(180deg, rgba(10,16,33,0.86) 0%, rgba(11,18,38,0.86) 100%)',
  backdropFilter: 'blur(5px)',
  padding: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
};

const labelStyle: CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 12,
};

const inputStyle: CSSProperties = {
  width: '100%',
  borderRadius: 8,
  border: '1px solid var(--border-default)',
  background: 'rgba(11, 18, 36, 0.7)',
  color: 'var(--text-primary)',
  padding: '8px 10px',
  fontSize: 12,
};

const selectStyle: CSSProperties = {
  borderRadius: 6,
  border: '1px solid var(--border-default)',
  background: 'rgba(11, 18, 36, 0.7)',
  color: 'var(--text-primary)',
  padding: '4px 8px',
  fontSize: 12,
  marginLeft: 6,
};

const rowStyle: CSSProperties = {
  width: '100%',
  border: 'none',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  minHeight: 24,
  textAlign: 'left',
};

const checkboxLabelStyle: CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 12,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const refreshButtonStyle: CSSProperties = {
  marginLeft: 'auto',
  border: '1px solid rgba(96,165,250,0.5)',
  background: 'rgba(96,165,250,0.16)',
  color: '#dbeafe',
  borderRadius: 7,
  padding: '5px 9px',
  fontSize: 12,
  cursor: 'pointer',
};

const ghostButtonStyle: CSSProperties = {
  border: '1px solid var(--border-default)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  borderRadius: 7,
  padding: '5px 9px',
  fontSize: 12,
  cursor: 'pointer',
};

const contentStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  padding: 6,
  background: 'rgba(8, 14, 30, 0.42)',
};
