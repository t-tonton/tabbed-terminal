import { useEffect, useRef } from 'react';
import { loadWorkspaceSnapshot } from '../services/persistence';
import { useAppStore } from '../stores';

export function useInitialize() {
  const workspaces = useAppStore((state) => state.workspaces);
  const createWorkspace = useAppStore((state) => state.createWorkspace);
  const markClean = useAppStore((state) => state.markClean);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;

    const snapshot = loadWorkspaceSnapshot();
    if (snapshot && snapshot.workspaces.length > 0) {
      useAppStore.setState({
        workspaces: snapshot.workspaces,
        activeWorkspaceId: snapshot.activeWorkspaceId,
      });
      initializedRef.current = true;
      return;
    }

    // Create default workspace if none exists
    if (workspaces.length === 0) {
      const workspaceId = createWorkspace('blank', 'Workspace 1');
      markClean(workspaceId);
    }

    initializedRef.current = true;
  }, [workspaces.length, createWorkspace, markClean]);
}
