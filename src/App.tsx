import { useEffect } from 'react';
import { AppLayout } from './components/layout';
import { SnippetPicker } from './features/snippets';
import { WorkspaceContainer } from './features/workspaces';
import { useInitialize, useKeyboardShortcuts } from './hooks';
import { useAppStore } from './stores';

function App() {
  useInitialize();
  useKeyboardShortcuts();

  const openSnippetPicker = useAppStore((state) => state.openSnippetPicker);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const bind = async () => {
      try {
        const eventModule = await import('@tauri-apps/api/event');
        unlisten = await eventModule.listen('menu-open-snippets', () => {
          openSnippetPicker();
        });
      } catch {
        // Running in browser/dev context without Tauri event bridge.
      }
    };

    void bind();
    return () => {
      if (unlisten) unlisten();
    };
  }, [openSnippetPicker]);

  return (
    <>
      <AppLayout>
        <WorkspaceContainer />
      </AppLayout>
      <SnippetPicker />
    </>
  );
}

export default App;
