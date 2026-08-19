import React, { useEffect } from 'react';
import { 
  History, 
  X, 
  Clock, 
  FileText, 
  Terminal, 
  MessageSquare, 
  Layers, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export default function HistoryModal({ 
  isOpen, 
  onClose, 
  transcriptData, 
  selectedSessionId 
}) {
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

  const summary = transcriptData?.summary;
  const bulletPoints = summary?.bulletPoints || [];
  const filesModified = summary?.filesModified || [];
  const commandsRun = summary?.commandsRun || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn select-none">
      {/* Modal Container */}
      <div 
        className="w-full max-w-2xl bg-[#0f141d] border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] font-mono text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-border bg-surface/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100 text-xs">Conversation Summary & History</span>
                <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                  {selectedSessionId?.slice(0, 8)}...
                </span>
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Last updated at {summary?.lastUpdated || 'Recently'}</span>
                <span>•</span>
                <span>{summary?.totalSteps || 0} total steps</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Bullet Form Summary */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. Quick Stat Highlights */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-surface border border-border/80">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Prompts</div>
              <div className="text-sm font-bold text-white">{summary?.userPromptCount || 0}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-surface border border-border/80">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Tools Run</div>
              <div className="text-sm font-bold text-indigo-400">
                {Object.values(summary?.toolCounts || {}).reduce((a, b) => a + b, 0)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-surface border border-border/80">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Files Touched</div>
              <div className="text-sm font-bold text-emerald-400">{filesModified.length}</div>
            </div>
          </div>

          {/* 2. Files Changed / Modified */}
          <div>
            <div className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>What Changed & Modified</span>
            </div>
            {filesModified.length > 0 ? (
              <ul className="space-y-1.5 pl-2">
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
            ) : (
              <p className="text-slate-500 text-[11px] italic pl-2">No file changes recorded yet</p>
            )}
          </div>

          {/* 3. Bullet Timeline of Actions & Prompts */}
          <div>
            <div className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Milestone Actions & Instructions</span>
            </div>
            {bulletPoints.length > 0 ? (
              <ul className="space-y-2 pl-2">
                {bulletPoints.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-300 text-[11px] bg-surface/50 p-2 rounded-lg border border-border/40">
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 ${
                      item.type === 'user'
                        ? 'bg-indigo-600/30 text-indigo-300'
                        : item.type === 'change'
                        ? 'bg-emerald-600/30 text-emerald-300'
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      {item.label}
                    </span>
                    <div className="flex-1 text-slate-200 font-sans text-xs">
                      {item.text}
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono shrink-0 mt-0.5">{item.timestamp}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-[11px] italic pl-2">No activity steps recorded yet</p>
            )}
          </div>

          {/* 4. Tool Usage Breakdown */}
          {summary?.toolCounts && Object.keys(summary.toolCounts).length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Tool Breakdown</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(summary.toolCounts).map(([tool, count]) => (
                  <span
                    key={tool}
                    className="px-2 py-0.5 rounded bg-surface border border-border text-slate-300 font-mono text-[10px]"
                  >
                    {tool}: <strong className="text-indigo-400">{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface/90 flex items-center justify-between text-slate-400 text-[11px]">
          <span>Press ESC or click close to dismiss</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
