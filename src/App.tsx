import { AppLayout } from './components/layout';
import { WorkspaceContainer } from './features/workspaces';
import { useInitialize, useKeyboardShortcuts } from './hooks';

function App() {
  useInitialize();
  useKeyboardShortcuts();

  return (
    <AppLayout>
      <WorkspaceContainer />
    </AppLayout>
  );
}

export default App;
