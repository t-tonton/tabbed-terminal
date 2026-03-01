import type { ReactNode } from 'react';
import { IconSidebar } from './IconSidebar';
import { TabBar } from './TabBar';
import { FileTreeDrawer } from '../../features/tree';
import { useAppStore } from '../../stores';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isFileTreeOpen = useAppStore((state) => state.isFileTreeOpen);

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        padding: '10px',
        backgroundColor: 'transparent',
      }}
    >
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          backgroundColor: 'var(--bg-shell)',
          border: '1px solid var(--border-default)',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 18px 48px rgba(0, 0, 0, 0.45)',
        }}
      >
        {/* Left: Icon sidebar */}
        <IconSidebar />

        {isFileTreeOpen && <FileTreeDrawer />}

        {/* Main area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          {/* Tab bar - fixed height */}
          <TabBar />

          {/* Content area - remaining height */}
          <main
            style={{
              flex: 1,
              minHeight: 0,
              padding: '10px',
              backgroundColor: 'var(--bg-panel)',
              overflow: 'hidden',
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
