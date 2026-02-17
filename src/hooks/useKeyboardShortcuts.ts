import { useEffect } from 'react';
import { useAppStore } from '../stores';

export function useKeyboardShortcuts() {
  const workspaces = useAppStore((state) => state.workspaces);
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const setActiveWorkspace = useAppStore((state) => state.setActiveWorkspace);
  const createWorkspace = useAppStore((state) => state.createWorkspace);
  const deleteWorkspace = useAppStore((state) => state.deleteWorkspace);
  const createPane = useAppStore((state) => state.createPane);
  const zoomIn = useAppStore((state) => state.zoomIn);
  const zoomOut = useAppStore((state) => state.zoomOut);
  const resetZoom = useAppStore((state) => state.resetZoom);
  const openSnippetPicker = useAppStore((state) => state.openSnippetPicker);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd+Shift+P: Open snippet picker
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        openSnippetPicker();
        return;
      }

      // Cmd+T: New workspace tab
      if (isMod && e.key === 't') {
        e.preventDefault();
        createWorkspace('blank');
        return;
      }

      // Cmd+W: Close current tab
      if (isMod && e.key === 'w') {
        e.preventDefault();
        if (activeWorkspaceId) {
          const workspace = workspaces.find((w) => w.id === activeWorkspaceId);
          if (workspace?.dirty) {
            if (!confirm('Unsaved changes will be lost. Close anyway?')) {
              return;
            }
          }
          deleteWorkspace(activeWorkspaceId);
        }
        return;
      }

      // Cmd+N: New pane in current workspace
      if (isMod && e.key === 'n') {
        e.preventDefault();
        if (activeWorkspaceId) {
          const workspace = workspaces.find((w) => w.id === activeWorkspaceId);
          createPane(activeWorkspaceId, {
            title: `Pane ${(workspace?.panes.length ?? 0) + 1}`,
          });
        }
        return;
      }

      // Ctrl+Tab: Next tab
      if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        switchTab(1);
        return;
      }

      // Ctrl+Shift+Tab: Previous tab
      if (e.ctrlKey && e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        switchTab(-1);
        return;
      }

      // Cmd+Shift+] or Cmd+Shift+→: Next tab
      if (isMod && e.shiftKey && (e.key === ']' || e.key === 'ArrowRight')) {
        e.preventDefault();
        switchTab(1);
        return;
      }

      // Cmd+Shift+[ or Cmd+Shift+←: Previous tab
      if (isMod && e.shiftKey && (e.key === '[' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        switchTab(-1);
        return;
      }

      // Cmd+1-9: Switch to tab by number
      if (isMod && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        if (index < workspaces.length) {
          setActiveWorkspace(workspaces[index].id);
        }
        return;
      }

      // Cmd+= or Cmd++: Zoom in
      if (isMod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
        return;
      }

      // Cmd+-: Zoom out
      if (isMod && e.key === '-') {
        e.preventDefault();
        zoomOut();
        return;
      }

      // Cmd+0: Reset zoom
      if (isMod && e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };

    const switchTab = (direction: number) => {
      if (workspaces.length === 0) return;

      const currentIndex = workspaces.findIndex((w) => w.id === activeWorkspaceId);
      if (currentIndex === -1) return;

      let newIndex = currentIndex + direction;
      if (newIndex < 0) newIndex = workspaces.length - 1;
      if (newIndex >= workspaces.length) newIndex = 0;

      setActiveWorkspace(workspaces[newIndex].id);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    createWorkspace,
    deleteWorkspace,
    createPane,
    zoomIn,
    zoomOut,
    resetZoom,
    openSnippetPicker,
  ]);
}
