import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores';

export function useInitialize() {
  const workspaces = useAppStore((state) => state.workspaces);
  const createWorkspace = useAppStore((state) => state.createWorkspace);
  const createPane = useAppStore((state) => state.createPane);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;

    // Create default workspace if none exists
    if (workspaces.length === 0) {
      const workspaceId = createWorkspace('blank', 'Workspace 1');

      // Create a default pane
      createPane(workspaceId, { title: 'Pane 1' });
    }

    initializedRef.current = true;
  }, [workspaces.length, createWorkspace, createPane]);
}
