import React, { useState } from 'react';
import { 
  History, 
  ChevronDown, 
  ChevronRight, 
  Wrench, 
  FileText, 
  MessageSquare, 
  Layers, 
  Terminal, 
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';

export default function HistorySummary({ transcriptData, selectedSessionId }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRawSteps, setShowRawSteps] = useState(false);

  const summary = transcriptData?.summary;
  const steps = transcriptData?.steps || [];

  if (!summary && steps.length === 0) {
    return null;
  }

  return (
    <div className="mx-4 mt-3 mb-2 rounded-xl border border-indigo-500/20 bg-surface/90 shadow-sm overflow-hidden text-xs transition-all">
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-surface-hover/80 transition-colors select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <History className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-medium text-slate-200">
              <span>Project Trajectory & History Summary</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {selectedSessionId?.slice(0, 8)}...
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-md">
              {summary?.recentUserPrompt ? `Latest: "${summary.recentUserPrompt}"` : 'Conversation trace loaded'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Summary Badges */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded bg-surface border border-border text-slate-300">
              {summary?.totalSteps || steps.length} steps
            </span>
            {summary?.filesTouched?.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                {summary.filesTouched.length} files
              </span>
            )}
          </div>

          <div className="p-1 rounded hover:bg-surface text-slate-400">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Summary Body */}
      {isExpanded && (
        <div className="p-4 border-t border-border/60 bg-[#0c1017] space-y-4 font-sans">
          {/* Metrics Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-lg bg-surface border border-border/80">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1 font-semibold uppercase tracking-wider">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>User Prompts</span>
              </div>
              <div className="text-base font-bold text-white">
                {summary?.userPromptCount || 0}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-border/80">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1 font-semibold uppercase tracking-wider">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                <span>Tools Invocations</span>
              </div>
              <div className="text-base font-bold text-white">
                {Object.values(summary?.toolCounts || {}).reduce((a, b) => a + b, 0)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-border/80">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1 font-semibold uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Files Touched</span>
              </div>
              <div className="text-base font-bold text-white">
                {summary?.filesTouched?.length || 0}
              </div>
            </div>
          </div>

          {/* Files Touched Tags */}
          {summary?.filesTouched && summary.filesTouched.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Files Modified / Read:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {summary.filesTouched.map((file, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-surface border border-border text-slate-300 font-mono text-[11px]"
                  >
                    {file}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tool Breakdown */}
          {summary?.toolCounts && Object.keys(summary.toolCounts).length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                Tool Breakdown:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(summary.toolCounts).map(([tool, count]) => (
                  <span
                    key={tool}
                    className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[11px]"
                  >
                    {tool}: <strong className="text-white">{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Milestone Timeline */}
          {summary?.timeline && summary.timeline.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Recent Milestone Actions</span>
                <button
                  onClick={() => setShowRawSteps(!showRawSteps)}
                  className="text-indigo-400 hover:text-indigo-300 text-[10px] font-mono lowercase underline"
                >
                  {showRawSteps ? 'Hide raw steps' : 'View full raw trace'}
                </button>
              </div>

              {!showRawSteps ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {summary.timeline.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-surface/70 border border-border/50 flex items-start gap-2 text-[11px]"
                    >
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono shrink-0 uppercase ${
                        item.type === 'user' ? 'bg-indigo-600/30 text-indigo-300' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {item.type}
                      </span>
                      <div className="flex-1 truncate">
                        <span className="font-semibold text-slate-200">{item.title}</span>
                        {item.detail && (
                          <span className="text-slate-400 ml-1.5 font-mono text-[10px] truncate">
                            {item.detail}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono shrink-0">
                        #{item.stepIndex}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 font-mono text-[11px]">
                  {steps.map((step, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-surface border border-border/60 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="text-indigo-400 font-bold">{step.type}</span>
                        <span>Step #{step.step_index ?? idx}</span>
                      </div>
                      {step.content && (
                        <div className="text-slate-300 whitespace-pre-wrap font-sans text-xs">
                          {step.content}
                        </div>
                      )}
                      {step.tool_calls && (
                        <pre className="text-[10px] text-indigo-300 bg-[#080b10] p-1.5 rounded overflow-x-auto">
                          {JSON.stringify(step.tool_calls, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
