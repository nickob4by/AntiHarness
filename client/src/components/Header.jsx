import React from 'react';
import { 
  Bot, 
  FolderGit2, 
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
  Columns
} from 'lucide-react';

export default function Header({ 
  workspace, 
  onRefresh, 
  showFilePane, 
  onToggleFilePane,
  showSidebar,
  onToggleSidebar,
}) {
  return (
    <header className="h-12 border-b border-border bg-surface/90 backdrop-blur px-3 flex items-center justify-between select-none z-10 font-mono">
      {/* Left: Sidebar Toggle, Brand & Workspace Path */}
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

        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shadow-sm">
            <Bot className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-bold text-xs tracking-tight text-white">Antigravity</span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Harness
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
              <FolderGit2 className="w-2.5 h-2.5 text-slate-500" />
              <span className="truncate max-w-[260px]" title={workspace?.workspacePath}>
                {workspace?.name || 'Loading workspace...'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Right: Clean & Simple Action Buttons */}
      <div className="flex items-center gap-1.5">
        {/* Simple Icon Button to Toggle File Pane */}
        <button
          onClick={onToggleFilePane}
          title={showFilePane ? "Hide Workspace File Pane" : "Show Workspace File Pane"}
          className={`p-1.5 rounded-lg border transition-all ${
            showFilePane
              ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 shadow-sm'
              : 'bg-surface border-border text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
          }`}
        >
          <Columns className="w-4 h-4" />
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          title="Refresh Data"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-surface-hover rounded-lg border border-border/60 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
