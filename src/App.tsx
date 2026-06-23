import { AppLayout } from './components/layout';
import { GridSettingsPanel } from './features/settings';
import { WorkspaceSearch } from './features/search';
import { SnippetPicker } from './features/snippets';
import { RelayPanel, useRelayStateBridge } from './features/relay';
import { WorkspaceContainer } from './features/workspaces';
import { useTerminalOutputCollector } from './features/panes/terminalOutputCollector';
import { useInitialize, useKeyboardShortcuts } from './hooks';

function App() {
  useInitialize();
  useKeyboardShortcuts();
  useRelayStateBridge();
  useTerminalOutputCollector();
  const isTauriRuntime =
    typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  return (
    <>
      <AppLayout>
        <WorkspaceContainer />
      </AppLayout>
      <WorkspaceSearch />
      <SnippetPicker />
      <GridSettingsPanel />
      {!isTauriRuntime && <RelayPanel />}
    </>
  );
}

export default App;
