import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  FolderGit2, 
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
  Columns,
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  Network
} from 'lucide-react';

export default function Header({ 
  workspace, 
  onRefresh, 
  showFilePane, 
  onToggleFilePane,
  showSidebar,
  onToggleSidebar,
  currentMainView = 'console',
  onSelectMainView,
  currentUser,
  onLogout,
  isCompact = false,
  compactPane = 'chat',
  onToggleCompactPane,
  openFilesCount = 0
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitial = currentUser?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="h-12 border-b border-border bg-surface/90 backdrop-blur px-2.5 sm:px-3 flex items-center justify-between select-none z-20 font-mono shrink-0">
      {/* Left: Sidebar Toggle, Brand & Workspace Path */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Toggle Sidebar Button */}
        <button
          onClick={onToggleSidebar}
          title={showSidebar ? "Hide Sidebar (Ctrl+B)" : "Show Sidebar (Ctrl+B)"}
          className={`p-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
            showSidebar
              ? 'bg-surface hover:bg-surface-hover border-border text-slate-300'
              : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300'
          }`}
        >
          {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shadow-sm shrink-0">
            <Bot className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-bold text-xs tracking-tight text-white truncate">Antigravity</span>
              <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Harness
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5 min-w-0">
              <FolderGit2 className="w-2.5 h-2.5 text-slate-500 shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-[220px]" title={workspace?.workspacePath}>
                {workspace?.name || 'Loading...'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Center: Main View Mode Switcher + Compact Chat/Code Toggle */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Main View Switcher: Console vs Graph vs Skills Hub */}
        <div className="flex items-center bg-[#0d121c] border border-border/80 rounded-xl p-0.5 text-xs shadow-inner">
          <button
            onClick={() => onSelectMainView('console')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-lg font-medium transition-all cursor-pointer text-[11px] sm:text-xs ${
              currentMainView === 'console'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Console & Code</span>
            <span className="sm:hidden">Console</span>
          </button>

          <button
            onClick={() => onSelectMainView('graph')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-lg font-medium transition-all cursor-pointer text-[11px] sm:text-xs ${
              currentMainView === 'graph'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-cyan-300" />
            <span className="hidden sm:inline">Codebase Graph</span>
            <span className="sm:hidden">Graph</span>
          </button>

          <button
            onClick={() => onSelectMainView('skills')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-lg font-medium transition-all cursor-pointer text-[11px] sm:text-xs ${
              currentMainView === 'skills'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Skills Hub</span>
            <span className="sm:hidden">Skills</span>
          </button>
        </div>

        {/* Half-Screen / Compact Mode Single Pane Switcher (Chat vs Code) */}
        {isCompact && currentMainView === 'console' && (
          <div className="flex items-center bg-[#0d121c] border border-indigo-500/40 rounded-xl p-0.5 text-[11px] shadow-sm">
            <button
              onClick={() => onToggleCompactPane && onToggleCompactPane('chat')}
              className={`px-2 py-0.5 rounded-lg font-medium transition-all cursor-pointer ${
                compactPane === 'chat'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => onToggleCompactPane && onToggleCompactPane('code')}
              className={`px-2 py-0.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                compactPane === 'code'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>💻 Code</span>
              {openFilesCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-500/30 text-indigo-200 text-[9px] flex items-center justify-center font-bold">
                  {openFilesCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Right: Actions & User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Toggle File Pane (Desktop full mode only) */}
        {!isCompact && (
          <button
            onClick={onToggleFilePane}
            title={showFilePane ? "Hide Workspace File Pane" : "Show Workspace File Pane"}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              showFilePane
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 shadow-sm'
                : 'bg-surface border-border text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
            }`}
          >
            <Columns className="w-4 h-4" />
          </button>
        )}

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          title="Refresh Data"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-surface-hover rounded-lg border border-border/60 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Google User Profile Pill & Dropdown */}
        {currentUser && (
          <div className="relative pl-1 border-l border-border/60" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 rounded-lg bg-surface/80 hover:bg-surface border border-border/70 text-slate-200 transition-all text-xs cursor-pointer"
            >
              {/* Google Avatar Circle */}
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm shrink-0">
                {userInitial}
              </div>
              <span className="hidden xl:inline truncate max-w-[120px] text-[11px] text-slate-300 font-sans">
                {currentUser.email}
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-[#0d121c] border border-border/90 rounded-xl shadow-2xl p-2 z-50 space-y-2 animate-fadeIn text-xs">
                <div className="p-2 rounded-lg bg-surface/80 border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Google Account</span>
                  </div>
                  <div className="text-[11px] text-white font-medium truncate font-sans">
                    {currentUser.email}
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Connected to Antigravity CLI
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition-colors text-[11px]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Switch Account / Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
