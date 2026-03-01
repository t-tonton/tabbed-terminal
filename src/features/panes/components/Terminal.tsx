import { useCallback, useEffect, useRef, useState } from 'react';
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

interface PaneSearchOpenPayload {
  paneId?: string;
  query?: string;
}

interface TerminalMatch {
  row: number;
  col: number;
  length: number;
}

const SHELL_INTEGRATION_SNIPPET = [
  '__tt_emit_cwd() { printf "\\033]7;file://%s%s\\007" "${HOSTNAME:-localhost}" "$PWD"; }',
  'if [ -n "$ZSH_VERSION" ]; then',
  '  autoload -Uz add-zsh-hook >/dev/null 2>&1',
  '  add-zsh-hook precmd __tt_emit_cwd >/dev/null 2>&1 || true',
  'elif [ -n "$BASH_VERSION" ]; then',
  '  case ";$PROMPT_COMMAND;" in',
  '    *";__tt_emit_cwd;"*) ;;',
  '    *) PROMPT_COMMAND="__tt_emit_cwd${PROMPT_COMMAND:+;$PROMPT_COMMAND}" ;;',
  '  esac',
  'fi',
  '__tt_emit_cwd',
  '',
].join('\n');

export function Terminal({ paneId, isFocused, onFocus }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const ptySpawnedRef = useRef(false);
  const terminalFontSize = useAppStore((state) => state.terminalFontSize);
  const appendTerminalOutput = useAppStore((state) => state.appendTerminalOutput);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setMatchCount(0);
    setActiveMatchIndex(0);
    if (terminalRef.current) {
      terminalRef.current.clearSelection();
      terminalRef.current.focus();
    }
  }, []);

  const revealMatch = useCallback((match: TerminalMatch) => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    terminal.select(match.col, match.row, match.length);
    terminal.scrollToLine(match.row);
  }, []);

  const runSearch = useCallback(
    (query: string, desiredIndex: number) => {
      const terminal = terminalRef.current;
      if (!terminal) return;

      const needle = query.toLowerCase();
      if (!needle) {
        setMatchCount(0);
        setActiveMatchIndex(0);
        terminal.clearSelection();
        return;
      }

      const buffer = terminal.buffer.active;
      const matches: TerminalMatch[] = [];
      for (let row = 0; row < buffer.length; row += 1) {
        const line = buffer.getLine(row);
        if (!line) continue;

        const text = line.translateToString(true);
        const lower = text.toLowerCase();
        let cursor = 0;
        while (cursor <= lower.length - needle.length) {
          const found = lower.indexOf(needle, cursor);
          if (found === -1) break;
          matches.push({ row, col: found, length: query.length });
          cursor = found + Math.max(query.length, 1);
        }
      }

      setMatchCount(matches.length);

      if (matches.length === 0) {
        setActiveMatchIndex(0);
        terminal.clearSelection();
        return;
      }

      const normalized = ((desiredIndex % matches.length) + matches.length) % matches.length;
      revealMatch(matches[normalized]);
      setActiveMatchIndex(normalized);
    },
    [revealMatch],
  );

  const nextMatch = useCallback(() => {
    if (!searchQuery) return;
    runSearch(searchQuery, activeMatchIndex + 1);
  }, [activeMatchIndex, runSearch, searchQuery]);

  const prevMatch = useCallback(() => {
    if (!searchQuery) return;
    runSearch(searchQuery, activeMatchIndex - 1);
  }, [activeMatchIndex, runSearch, searchQuery]);

  useEffect(() => {
    if (!isSearchOpen) return;
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  }, [isSearchOpen]);

  useEffect(() => {
    const openSearch = (event: Event) => {
      const detail = (event as CustomEvent<PaneSearchOpenPayload>).detail;
      const targetedPaneId = detail?.paneId;
      const incomingQuery = detail?.query;

      if (targetedPaneId && targetedPaneId !== paneId) return;
      if (!targetedPaneId && !isFocused) return;

      setIsSearchOpen(true);

      if (typeof incomingQuery === 'string') {
        setSearchQuery(incomingQuery);
        runSearch(incomingQuery, 0);
      } else if (searchQuery) {
        runSearch(searchQuery, 0);
      }
    };

    window.addEventListener('pane-search-open', openSearch);
    return () => window.removeEventListener('pane-search-open', openSearch);
  }, [isFocused, paneId, runSearch, searchQuery]);

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
    const savedHistory = useAppStore.getState().terminalRawHistoryByPane[paneId];
    if (savedHistory) {
      terminal.write(savedHistory);
      terminal.scrollToBottom();
    }

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    setTimeout(() => {
      if (!aborted) syncTerminalSize();
    }, 60);
    setTimeout(() => {
      if (!aborted) syncTerminalSize();
    }, 220);
    setTimeout(() => {
      if (!aborted) syncTerminalSize();
    }, 600);

    const setupPty = async () => {
      if (ptySpawnedRef.current || aborted) return;

      try {
        unlistenOutput = await listen<string>(`pty-output-${paneId}`, (event) => {
          if (!aborted) {
            terminal.write(event.payload);
            terminal.scrollToBottom();
            appendTerminalOutput(paneId, event.payload);
          }
        });

        if (aborted) {
          unlistenOutput?.();
          return;
        }

        unlistenExit = await listen(`pty-exit-${paneId}`, () => {
          if (!aborted) terminal.writeln('\r\n\x1b[1;31m[Process exited]\x1b[0m');
        });

        if (aborted) {
          unlistenOutput?.();
          unlistenExit?.();
          return;
        }

        await invoke('pty_spawn', { id: paneId });

        if (aborted) {
          invoke('pty_kill', { id: paneId }).catch(() => {});
          return;
        }

        ptySpawnedRef.current = true;
        invoke('pty_write', { id: paneId, data: SHELL_INTEGRATION_SNIPPET }).catch(() => {});

        terminal.onData((data) => {
          if (aborted) return;
          invoke('pty_write', { id: paneId, data }).catch(console.error);
        });
      } catch (err) {
        console.error('Failed to spawn PTY:', err);
        if (!aborted) {
          terminal.writeln(`\x1b[1;31mFailed to start shell: ${err}\x1b[0m`);
        }
      }
    };

    setupPty();

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const doFit = () => syncTerminalSize();

    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        doFit();
        setTimeout(doFit, 50);
      }, 16);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      aborted = true;
      resizeObserver.disconnect();
      unlistenOutput?.();
      unlistenExit?.();
      const paneStillExists = useAppStore
        .getState()
        .workspaces.some((workspace) => workspace.panes.some((pane) => pane.id === paneId));
      if (ptySpawnedRef.current && !paneStillExists) {
        invoke('pty_kill', { id: paneId }).catch(() => {});
        ptySpawnedRef.current = false;
      }
      terminal.dispose();
      terminalRef.current = null;
    };
  }, [appendTerminalOutput, paneId, syncTerminalSize]);

  useEffect(() => {
    if (isFocused && terminalRef.current) {
      terminalRef.current.focus();
      syncTerminalSize();
    }
  }, [isFocused, syncTerminalSize]);

  useEffect(() => {
    if (terminalRef.current && fitAddonRef.current) {
      terminalRef.current.options.fontSize = terminalFontSize;
      syncTerminalSize();
    }
  }, [terminalFontSize, syncTerminalSize]);

  const handleContainerClick = useCallback(() => {
    onFocus();
    terminalRef.current?.focus();
  }, [onFocus]);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      {isSearchOpen && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px',
            borderRadius: '6px',
            border: '1px solid var(--border-default)',
            background: 'rgba(14, 22, 45, 0.96)',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => {
              const q = e.target.value;
              setSearchQuery(q);
              runSearch(q, 0);
            }}
            placeholder="Find in pane"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                  prevMatch();
                } else {
                  nextMatch();
                }
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                closeSearch();
              }
            }}
            style={{
              width: '170px',
              height: '26px',
              borderRadius: '4px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              padding: '0 8px',
              outline: 'none',
            }}
          />
          <span style={{ minWidth: '48px', textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)' }}>
            {matchCount === 0 ? '0/0' : `${activeMatchIndex + 1}/${matchCount}`}
          </span>
          <button
            type="button"
            onClick={prevMatch}
            title="Previous match"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              border: '1px solid var(--border-default)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={nextMatch}
            title="Next match"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              border: '1px solid var(--border-default)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            ↓
          </button>
          <button
            type="button"
            onClick={closeSearch}
            title="Close search"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              border: '1px solid var(--border-default)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}
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
        onMouseDown={handleContainerClick}
        onClick={handleContainerClick}
      />
    </div>
  );
}
