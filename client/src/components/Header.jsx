import React from 'react';
import { 
  Bot, 
  Cpu, 
  FolderGit2, 
  Sparkles,
  RefreshCw,
  Columns,
  AlertCircle,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

export default function Header({ 
  connectionStatus, 
  workspace, 
  onRefresh, 
  showFilePane, 
  onToggleFilePane,
  showSidebar,
  onToggleSidebar,
}) {
  return (
    <header className="h-14 border-b border-border bg-surface/80 backdrop-blur px-4 flex items-center justify-between select-none z-10">
      {/* Left: Sidebar Toggle & Brand */}
      <div className="flex items-center gap-3">
        {/* Toggle Sidebar Button */}
        <button
          onClick={onToggleSidebar}
          title={showSidebar ? "Hide Sidebar (Ctrl+B)" : "Show Sidebar (Ctrl+B)"}
          className={`p-1.5 rounded-lg border transition-all ${
            showSidebar
              ? 'bg-surface hover:bg-surface-hover border-border text-slate-300'
              : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300'
          }`}
        >
          {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        <div className="h-8 w-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shadow-sm">
          <Bot className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-white">Antigravity</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Local Harness
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
            <FolderGit2 className="w-3 h-3 text-slate-500" />
            <span className="truncate max-w-[240px]" title={workspace?.workspacePath}>
              {workspace?.name || 'Loading workspace...'}
            </span>
          </p>
        </div>
      </div>

      {/* Right: Status Indicators & Window Toggles */}
      <div className="flex items-center gap-2.5">
        {/* Toggle Split File Viewer Pane Button */}
        <button
          onClick={onToggleFilePane}
          title="Toggle Side-by-Side Workspace File Viewer"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-all ${
            showFilePane
              ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 font-medium'
              : 'bg-surface border-border text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
          }`}
        >
          <Columns className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{showFilePane ? 'Hide File Pane' : 'Show File Pane'}</span>
        </button>

        {/* Model Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border text-xs text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span>Gemini 3.7 Flash</span>
        </div>

        {/* Connection status */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border ${
            connectionStatus === 'connected'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {connectionStatus === 'connected' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Gateway Live</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Offline</span>
            </>
          )}
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          title="Refresh Data"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-surface-hover rounded-md transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
