import React, { useState, useEffect } from 'react';
import { 
  History, 
  X, 
  Clock, 
  FileText, 
  Terminal, 
  Layers, 
  Download, 
  Trash2, 
  FolderOpen, 
  Search, 
  RefreshCw 
} from 'lucide-react';
import { 
  getSessions, 
  getSessionTranscript, 
  getSessionMessages, 
  deleteSession, 
  getSessionExportUrl 
} from '../services/api';

export default function HistoryModal({ 
  isOpen, 
  onClose, 
  selectedSessionId,
  onResumeSessionInTab
}) {
  const [sessionsList, setSessionsList] = useState([]);
  const [activeId, setActiveId] = useState(selectedSessionId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeTranscript, setActiveTranscript] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load session list on open
  const loadSessionsList = async () => {
    setIsLoadingList(true);
    try {
      const data = await getSessions();
      if (data?.sessions) {
        setSessionsList(data.sessions);
        if (!activeId && data.sessions.length > 0) {
          setActiveId(data.sessions[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load sessions list:', e);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSessionsList();
    }
  }, [isOpen]);

  // Load details for selected session ID
  useEffect(() => {
    if (!activeId || !isOpen) return;

    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const trans = await getSessionTranscript(activeId);
        setActiveTranscript(trans);
      } catch (e) {
        console.error('Failed to load session transcript:', e);
        setActiveTranscript(null);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [activeId, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredSessions = sessionsList.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.id.toLowerCase().includes(q) ||
      (s.preview && s.preview.toLowerCase().includes(q))
    );
  });

  const summary = activeTranscript?.summary;
  const bulletPoints = summary?.bulletPoints || [];
  const filesModified = summary?.filesModified || [];

  // Resume this conversation in a chat tab
  const handleResumeInTab = async () => {
    if (!activeId) return;
    try {
      const msgData = await getSessionMessages(activeId);
      if (onResumeSessionInTab && msgData?.messages) {
        onResumeSessionInTab({
          id: activeId,
          title: `Session ${activeId.slice(0, 6)}`,
          messages: msgData.messages,
        });
        onClose();
      }
    } catch (e) {
      console.error('Failed to resume session messages:', e);
    }
  };

  // Export session to markdown download
  const handleExportMarkdown = () => {
    if (!activeId) return;
    const url = getSessionExportUrl(activeId);
    window.open(url, '_blank');
  };

  // Delete session
  const handleDeleteSession = async () => {
    if (!activeId || isDeleting) return;
    if (!window.confirm(`Are you sure you want to delete session ${activeId.slice(0, 8)}?`)) return;

    setIsDeleting(true);
    try {
      await deleteSession(activeId);
      const updated = sessionsList.filter((s) => s.id !== activeId);
      setSessionsList(updated);
      if (updated.length > 0) {
        setActiveId(updated[0].id);
      } else {
        setActiveId(null);
        setActiveTranscript(null);
      }
    } catch (e) {
      console.error('Failed to delete session:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn select-none font-mono">
      {/* Modal Container */}
      <div 
        className="w-full max-w-4xl bg-[#0d121c] border border-border/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-border/80 bg-surface/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Session Memory & Transcript Archive</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-semibold">
                  {sessionsList.length} Archived
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Browse, search, resume past agent conversations, or export Markdown transcripts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Main Area: Split List & Details */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column: Search & Sessions List */}
          <div className="w-72 border-r border-border/80 flex flex-col bg-[#090d16]">
            {/* Search Input */}
            <div className="p-3 border-b border-border/80 bg-surface/50">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search past prompts..."
                  className="w-full bg-[#080c14] border border-border/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {isLoadingList ? (
                <div className="p-4 text-center text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Loading archives...</span>
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="p-4 text-center text-slate-500 italic">
                  No sessions found
                </div>
              ) : (
                filteredSessions.map((sess) => {
                  const isSelected = sess.id === activeId;
                  const dateStr = sess.lastModified 
                    ? new Date(sess.lastModified).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Recent';

                  return (
                    <div
                      key={sess.id}
                      onClick={() => setActiveId(sess.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500/60 text-white shadow-sm'
                          : 'bg-surface/60 border-border/60 text-slate-300 hover:bg-surface-hover hover:border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`font-mono text-[10px] font-bold ${isSelected ? 'text-indigo-300' : 'text-slate-400'}`}>
                          {sess.id.slice(0, 8)}...
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">{dateStr}</span>
                      </div>
                      <p className="text-[11px] line-clamp-2 text-slate-300 font-sans leading-snug">
                        {sess.preview || 'Agent session instructions...'}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[9px] text-slate-400">
                        <span>{sess.stepCount || 0} steps</span>
                        {sess.matchedWorkspace && (
                          <span className="text-emerald-400 font-semibold">• Active Project</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Session Summary & Actions */}
          <div className="flex-1 flex flex-col bg-[#0b1019] overflow-hidden">
            {isLoadingDetails ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Reading session transcript...</span>
              </div>
            ) : !activeId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                <History className="w-10 h-10 text-slate-600 mb-2" />
                <p>Select a session to view transcript history</p>
              </div>
            ) : (
              <>
                {/* Session Action Toolbar */}
                <div className="px-5 py-3 border-b border-border/80 bg-surface/70 flex items-center justify-between">
                  <div className="min-w-0 mr-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-xs truncate">
                        Session: {activeId}
                      </h3>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {summary?.totalSteps || 0} total steps recorded • Last updated {summary?.lastUpdated || 'Recently'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleResumeInTab}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      title="Open and resume this conversation in a chat tab"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Resume in Tab</span>
                    </button>

                    <button
                      onClick={handleExportMarkdown}
                      className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Export transcript as a Markdown document"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Export .md</span>
                    </button>

                    <button
                      onClick={handleDeleteSession}
                      disabled={isDeleting}
                      className="p-1.5 rounded-lg bg-surface hover:bg-rose-950/40 border border-border hover:border-rose-500/50 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                      title="Delete this session from disk"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Session Content Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Quick Stat Cards */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-surface/70 border border-border/80">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Prompts</div>
                      <div className="text-sm font-bold text-white">{summary?.userPromptCount || 0}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface/70 border border-border/80">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Tools Executed</div>
                      <div className="text-sm font-bold text-indigo-400">
                        {Object.values(summary?.toolCounts || {}).reduce((a, b) => a + b, 0)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface/70 border border-border/80">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Files Touched</div>
                      <div className="text-sm font-bold text-emerald-400">{filesModified.length}</div>
                    </div>
                  </div>

                  {/* Files Modified List */}
                  {filesModified.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-surface/50 border border-border/80 space-y-2">
                      <div className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Files Created & Modified</span>
                      </div>
                      <ul className="space-y-1.5 pl-1">
                        {filesModified.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-slate-300 text-[11px]">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <div className="flex-1">
                              <strong className="text-emerald-300 font-mono">{item.file}</strong>
                              <span className="text-slate-400 ml-1.5">— {item.desc}</span>
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono shrink-0">{item.timestamp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Chronological Action Timeline */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Prompts & Key Milestones</span>
                    </div>
                    {bulletPoints.length > 0 ? (
                      <div className="space-y-2">
                        {bulletPoints.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface/60 border border-border/60">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                              item.type === 'user'
                                ? 'bg-indigo-600/30 border border-indigo-500/40 text-indigo-300'
                                : item.type === 'change'
                                ? 'bg-emerald-600/30 border border-emerald-500/40 text-emerald-300'
                                : 'bg-slate-700 text-slate-300'
                            }`}>
                              {item.label}
                            </span>
                            <div className="flex-1 text-slate-200 font-sans text-xs leading-relaxed">
                              {item.text}
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono shrink-0">{item.timestamp}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 italic pl-2">No steps recorded in this transcript</p>
                    )}
                  </div>

                </div>
              </>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-border/80 bg-surface/90 flex items-center justify-between text-slate-400 text-[10px]">
          <span>Press ESC or click outside to dismiss</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-border text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Close Archive
          </button>
        </div>
      </div>
    </div>
  );
}
