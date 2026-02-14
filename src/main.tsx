import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

function renderFatal(message: string) {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `
    <div style="height:100vh;display:flex;align-items:center;justify-content:center;background:#111827;color:#f9fafb;font-family:ui-monospace,Menlo,Monaco,monospace;padding:24px;">
      <div style="max-width:960px;width:100%;">
        <h1 style="margin:0 0 12px 0;font-size:18px;">App bootstrap failed</h1>
        <pre style="white-space:pre-wrap;word-break:break-word;background:#1f2937;border:1px solid #374151;border-radius:8px;padding:12px;margin:0;">${message}</pre>
      </div>
    </div>
  `;
}

window.addEventListener('error', (event) => {
  renderFatal(`${event.message}\n${event.filename}:${event.lineno}:${event.colno}`);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error
    ? `${event.reason.message}\n${event.reason.stack ?? ''}`
    : String(event.reason);
  renderFatal(`Unhandled promise rejection:\n${reason}`);
});

// Note: StrictMode disabled temporarily for PTY stability
// StrictMode causes double mount/unmount which kills PTY
try {
  createRoot(document.getElementById('root')!).render(
    <App />
  );
} catch (error) {
  const message = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
  renderFatal(message);
}
