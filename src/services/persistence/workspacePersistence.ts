import type { Workspace } from '../../types';

const WORKSPACE_STATE_KEY = 'tabbed-terminal.workspace-state.v1';

interface PersistedWorkspaceStateV1 {
  version: 1;
  savedAt: string;
  activeWorkspaceId: string | null;
  workspaces: Workspace[];
}

export interface WorkspaceSnapshot {
  activeWorkspaceId: string | null;
  workspaces: Workspace[];
}

export function saveWorkspaceSnapshot(snapshot: WorkspaceSnapshot): boolean {
  try {
    const payload: PersistedWorkspaceStateV1 = {
      version: 1,
      savedAt: new Date().toISOString(),
      activeWorkspaceId: snapshot.activeWorkspaceId,
      workspaces: snapshot.workspaces,
    };
    localStorage.setItem(WORKSPACE_STATE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error('[workspacePersistence] Failed to save workspace snapshot', error);
    return false;
  }
}

export function loadWorkspaceSnapshot(): WorkspaceSnapshot | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_STATE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedWorkspaceStateV1>;
    if (parsed.version !== 1 || !Array.isArray(parsed.workspaces)) {
      return null;
    }

    const activeWorkspaceId =
      parsed.activeWorkspaceId && parsed.workspaces.some((w) => w.id === parsed.activeWorkspaceId)
        ? parsed.activeWorkspaceId
        : parsed.workspaces[0]?.id ?? null;

    return {
      activeWorkspaceId,
      workspaces: parsed.workspaces,
    };
  } catch (error) {
    console.error('[workspacePersistence] Failed to load workspace snapshot', error);
    return null;
  }
}
