import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores';

export function useInitialize() {
  const workspaces = useAppStore((state) => state.workspaces);
  const createWorkspace = useAppStore((state) => state.createWorkspace);
  const markClean = useAppStore((state) => state.markClean);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;

    // Always start fresh with a default workspace.
    if (workspaces.length === 0) {
      const workspaceId = createWorkspace('blank', 'Workspace 1');
      markClean(workspaceId);
    }

    initializedRef.current = true;
  }, [workspaces.length, createWorkspace, markClean]);
}
