import { AppLayout } from './components/layout';
import { WorkspaceSearch } from './features/search';
import { SnippetPicker } from './features/snippets';
import { RelayPanel, useRelayStateBridge } from './features/relay';
import { WorkspaceContainer } from './features/workspaces';
import { useInitialize, useKeyboardShortcuts } from './hooks';

function App() {
  useInitialize();
  useKeyboardShortcuts();
  useRelayStateBridge();
  const isTauriRuntime =
    typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  return (
    <>
      <AppLayout>
        <WorkspaceContainer />
      </AppLayout>
      <WorkspaceSearch />
      <SnippetPicker />
      {!isTauriRuntime && <RelayPanel />}
    </>
  );
}

export default App;
