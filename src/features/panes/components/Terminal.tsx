import { useCallback, useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useAppStore } from '../../../stores';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  paneId: string;
  isFocused: boolean;
  onFocus: () => void;
}

export function Terminal({ paneId, isFocused, onFocus }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const ptySpawnedRef = useRef(false);
  const terminalFontSize = useAppStore((state) => state.terminalFontSize);

  const syncTerminalSize = useCallback(() => {
    const container = containerRef.current;
    const terminal = terminalRef.current;
    const fitAddon = fitAddonRef.current;
    if (!container || !terminal || !fitAddon) return;

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    fitAddon.fit();
    terminal.refresh(0, Math.max(terminal.rows - 1, 0));

    const { rows, cols } = terminal;
    if (rows > 0 && cols > 0) {
      invoke('pty_resize', { id: paneId, rows, cols }).catch(() => {});
    }
  }, [paneId]);

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    let aborted = false;
    let unlistenOutput: UnlistenFn | null = null;
    let unlistenExit: UnlistenFn | null = null;

    const currentFontSize = useAppStore.getState().terminalFontSize;
    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: currentFontSize,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      scrollback: 10000,
      scrollOnUserInput: true,
      theme: {
        background: '#10182d',
        foreground: '#e4e4e7',
        cursor: '#60a5fa',
        cursorAccent: '#10182d',
        selectionBackground: 'rgba(96, 165, 250, 0.3)',
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(containerRef.current);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Retry initial fit because layout/font timing can transiently produce tiny column counts
    setTimeout(() => {
      if (!aborted) syncTerminalSize();
    }, 60);
    setTimeout(() => {
      if (!aborted) syncTerminalSize();
    }, 220);
    setTimeout(() => {
      if (!aborted) syncTerminalSize();
    }, 600);

    // Setup PTY
    const setupPty = async () => {
      if (ptySpawnedRef.current || aborted) return;

      try {
        // Listen for PTY output
        unlistenOutput = await listen<string>(`pty-output-${paneId}`, (event) => {
          if (!aborted) {
            terminal.write(event.payload);
            // Auto-scroll to bottom
            terminal.scrollToBottom();
          }
        });

        if (aborted) {
          unlistenOutput?.();
          return;
        }

        // Listen for PTY exit
        unlistenExit = await listen(`pty-exit-${paneId}`, () => {
          if (!aborted) terminal.writeln('\r\n\x1b[1;31m[Process exited]\x1b[0m');
        });

        if (aborted) {
          unlistenOutput?.();
          unlistenExit?.();
          return;
        }

        // Spawn PTY
        await invoke('pty_spawn', { id: paneId });

        if (aborted) {
          invoke('pty_kill', { id: paneId }).catch(() => {});
          return;
        }

        ptySpawnedRef.current = true;

        // Handle terminal input -> PTY
        terminal.onData((data) => {
          if (!aborted) {
            invoke('pty_write', { id: paneId, data }).catch(console.error);
          }
        });
      } catch (err) {
        console.error('Failed to spawn PTY:', err);
        if (!aborted) {
          terminal.writeln(`\x1b[1;31mFailed to start shell: ${err}\x1b[0m`);
        }
      }
    };

    setupPty();

    // Handle resize with debounce
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const doFit = () => syncTerminalSize();

    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        doFit();
        // Call fit again after a short delay to handle layout settling
        setTimeout(doFit, 50);
      }, 16);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      aborted = true;
      resizeObserver.disconnect();
      unlistenOutput?.();
      unlistenExit?.();
      // Only kill PTY if it was successfully spawned
      if (ptySpawnedRef.current) {
        invoke('pty_kill', { id: paneId }).catch(() => {});
        ptySpawnedRef.current = false;
      }
      terminal.dispose();
      terminalRef.current = null;
    };
  }, [paneId, syncTerminalSize]);

  useEffect(() => {
    if (isFocused && terminalRef.current) {
      terminalRef.current.focus();
      syncTerminalSize();
    }
  }, [isFocused, syncTerminalSize]);

  // Update font size when it changes
  useEffect(() => {
    if (terminalRef.current && fitAddonRef.current) {
      terminalRef.current.options.fontSize = terminalFontSize;
      syncTerminalSize();
    }
  }, [terminalFontSize, syncTerminalSize]);

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        width: '100%',
        minHeight: 0,
        backgroundColor: '#10182d',
        borderTop: '1px solid rgba(150, 170, 255, 0.08)',
        overflow: 'hidden',
      }}
      onClick={onFocus}
    />
  );
}
