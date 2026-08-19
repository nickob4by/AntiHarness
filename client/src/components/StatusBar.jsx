import React, { useState, useEffect } from 'react';
import { 
  FolderGit2, 
  Clock, 
  Calendar, 
  Zap
} from 'lucide-react';

export default function StatusBar({ 
  connectionStatus, 
  workspace, 
  usageData
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const usageText = usageData?.formatted || 'Usage: 38%/5h 90%/W';

  return (
    <footer className="h-7 border-t border-border bg-[#0a0d14] px-3.5 flex items-center justify-between text-[11px] text-slate-300 font-mono select-none">
      {/* Left: Active Workspace Path & Connection Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-slate-200">
          <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
          <span className="truncate max-w-[280px]" title={workspace?.workspacePath}>
            {workspace?.workspacePath || 'D:\\AntiG'}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.2 rounded bg-surface border border-border/60">
          <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          <span className="text-[10px] text-slate-300">
            {connectionStatus === 'connected' ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Right: Exact Quota Percentage Format & Live Clock */}
      <div className="flex items-center gap-3">
        {/* Exact Usage Format Badge: Usage: 38%/5h 90%/W */}
        <div 
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 font-semibold text-[10px]"
          title="CLI Quota: 5-Hour rolling window & Weekly quota percentage"
        >
          <Zap className="w-3 h-3 text-indigo-400" />
          <span>{usageText}</span>
        </div>

        {/* Date & Live Clock */}
        <div className="flex items-center gap-2 text-slate-300 bg-surface/80 px-2.5 py-0.5 rounded border border-border/50">
          <div className="hidden md:flex items-center gap-1 text-slate-400">
            <Calendar className="w-3 h-3 text-slate-500" />
            <span>{formattedDate}</span>
          </div>
          <span className="hidden md:inline text-slate-600">•</span>
          <div className="flex items-center gap-1 text-slate-200 font-medium">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
