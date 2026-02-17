import { AppLayout } from './components/layout';
import { WorkspaceSearch } from './features/search';
import { SnippetPicker } from './features/snippets';
import { WorkspaceContainer } from './features/workspaces';
import { useInitialize, useKeyboardShortcuts } from './hooks';

function App() {
  useInitialize();
  useKeyboardShortcuts();

  return (
    <>
      <AppLayout>
        <WorkspaceContainer />
      </AppLayout>
      <WorkspaceSearch />
      <SnippetPicker />
    </>
  );
}

export default App;
