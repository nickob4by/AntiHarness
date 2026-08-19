import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { 
  Terminal as TerminalIcon, 
  X, 
  Maximize2, 
  Minimize2, 
  RotateCw, 
  Trash2, 
  Play, 
  CornerDownLeft,
  ChevronDown
} from 'lucide-react';

export default function TerminalPane({
  isOpen,
  onClose,
  wsClient,
  workspacePath,
  height = 240,
  onHeightChange
}) {
  const terminalRef = useRef(null);
  const xtermInstance = useRef(null);
  const fitAddonRef = useRef(null);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isOpen || !terminalRef.current) return;

    // Initialize xterm
    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 12,
      fontFamily: "'JetBrains Mono', monospace",
      theme: {
        background: '#080b11',
        foreground: '#e2e8f0',
        cursor: '#818cf8',
        selectionBackground: 'rgba(99, 102, 241, 0.3)',
        black: '#1e293b',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#38bdf8',
        white: '#f8fafc',
      },
      convertEol: true,
      rows: 14,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermInstance.current = term;
    fitAddonRef.current = fitAddon;

    // Send init to WebSocket
    wsClient?.send('TERMINAL_INIT', { workspacePath });

    // Handle user keyboard input to terminal
    const onDataDisposable = term.onData((input) => {
      wsClient?.send('TERMINAL_INPUT', { input });
    });

    // Handle incoming terminal output from WebSocket
    const handleTerminalMessage = (data) => {
      if (data.type === 'TERMINAL_OUTPUT' && data.payload?.data) {
        term.write(data.payload.data);
      }
    };

    wsClient?.addListener?.(handleTerminalMessage);

    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      onDataDisposable.dispose();
      wsClient?.removeListener?.(handleTerminalMessage);
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [isOpen, workspacePath]);

  // Refit on size changes
  useEffect(() => {
    if (fitAddonRef.current && isOpen) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
        } catch (e) {
          // ignore
        }
      }, 50);
    }
  }, [height, isMaximized, isOpen]);

  const handleClear = () => {
    xtermInstance.current?.clear();
  };

  const handleRestart = () => {
    handleClear();
    wsClient?.send('TERMINAL_RESTART', { workspacePath });
  };

  const runQuickCommand = (cmd) => {
    wsClient?.send('TERMINAL_INPUT', { input: `${cmd}\r` });
    xtermInstance.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{ height: isMaximized ? '75%' : `${height}px` }}
      className="border-t border-border bg-[#080b11] flex flex-col font-mono text-xs select-none shadow-2xl relative transition-all duration-150 z-30"
    >
      {/* Terminal Top Control Bar */}
      <div className="h-8 px-3 bg-surface/90 border-b border-border/80 flex items-center justify-between">
        {/* Left Title & Status */}
        <div className="flex items-center gap-2 text-slate-300">
          <TerminalIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-xs text-white">Terminal (PowerShell)</span>
          <span className="text-[10px] text-slate-500 hidden sm:inline truncate max-w-[240px]">
            {workspacePath}
          </span>
        </div>

        {/* Center Quick Commands */}
        <div className="hidden md:flex items-center gap-1.5 text-[10px]">
          <button
            onClick={() => runQuickCommand('git status')}
            className="px-2 py-0.5 rounded bg-surface hover:bg-surface-hover border border-border/60 text-slate-400 hover:text-slate-200 transition-colors"
          >
            git status
          </button>
          <button
            onClick={() => runQuickCommand('npm run build')}
            className="px-2 py-0.5 rounded bg-surface hover:bg-surface-hover border border-border/60 text-slate-400 hover:text-slate-200 transition-colors"
          >
            npm run build
          </button>
          <button
            onClick={() => runQuickCommand('dir')}
            className="px-2 py-0.5 rounded bg-surface hover:bg-surface-hover border border-border/60 text-slate-400 hover:text-slate-200 transition-colors"
          >
            dir
          </button>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={handleRestart}
            title="Restart Terminal Session"
            className="p-1 hover:bg-surface-hover hover:text-slate-200 rounded transition-colors"
          >
            <RotateCw className="w-3 h-3" />
          </button>
          <button
            onClick={handleClear}
            title="Clear Terminal Output (Ctrl+L)"
            className="p-1 hover:bg-surface-hover hover:text-slate-200 rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? "Restore Height" : "Maximize Terminal"}
            className="p-1 hover:bg-surface-hover hover:text-slate-200 rounded transition-colors"
          >
            {isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
          <button
            onClick={onClose}
            title="Close Terminal (Ctrl+`)"
            className="p-1 hover:bg-surface-hover hover:text-rose-400 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal View Container */}
      <div 
        ref={terminalRef} 
        className="flex-1 p-2 bg-[#080b11] overflow-hidden cursor-text"
        onClick={() => xtermInstance.current?.focus()}
      />
    </div>
  );
}
