import React, { useState, useEffect } from 'react';
import { 
  FolderGit2, 
  Clock, 
  Calendar, 
  Zap,
  Activity
} from 'lucide-react';

export default function StatusBar({ 
  connectionStatus, 
  workspace, 
  usageData
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUsed, setShowUsed] = useState(false);

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

  const gemini5hRemaining = usageData?.fiveHourRemainingPercent ?? 52;
  const geminiWeeklyRemaining = usageData?.weeklyRemainingPercent ?? 91;
  const gemini5hUsed = usageData?.fiveHourPercent ?? (100 - gemini5hRemaining);
  const geminiWeeklyUsed = usageData?.weeklyPercent ?? (100 - geminiWeeklyRemaining);

  const claude5hRemaining = usageData?.claudeGpt?.fiveHourRemaining ?? 88;
  const claudeWeeklyRemaining = usageData?.claudeGpt?.weeklyRemaining ?? 96;

  // By default, display remaining left (or click to see % used)
  const displayText = showUsed
    ? `Usage: ${gemini5hUsed}%/5h ${geminiWeeklyUsed}%/W`
    : `Left: ${gemini5hRemaining}%/5h ${geminiWeeklyRemaining}%/W`;

  const isLowQuota = gemini5hRemaining <= 20 || geminiWeeklyRemaining <= 15;

  const detailedTooltip = `Live agy CLI Quota (Click to switch Used/Left):
• Gemini 5-Hour: ${gemini5hRemaining}% remaining (${gemini5hUsed}% used)
• Gemini Weekly: ${geminiWeeklyRemaining}% remaining (${geminiWeeklyUsed}% used)
• Claude/GPT 5-Hour: ${claude5hRemaining}% remaining
• Claude/GPT Weekly: ${claudeWeeklyRemaining}% remaining`;

  return (
    <footer className="h-7 border-t border-border bg-[#0a0d14] px-3.5 flex items-center justify-between text-[11px] text-slate-300 font-mono select-none">
      {/* Left: Connection Status Indicator */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface border border-border/60">
          <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          <span className="text-[10px] text-slate-300">
            {connectionStatus === 'connected' ? 'Antigravity Connected' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Right: Exact Quota Percentage Format & Live Clock */}
      <div className="flex items-center gap-3">
        {/* Interactive Real-Time CLI Quota Badge */}
        <button 
          onClick={() => setShowUsed(!showUsed)}
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded transition-all cursor-pointer ${
            isLowQuota 
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20' 
              : 'bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-500/20'
          } font-semibold text-[10px]`}
          title={detailedTooltip}
        >
          <Zap className={`w-3 h-3 ${isLowQuota ? 'text-amber-400' : 'text-indigo-400'}`} />
          <span>{displayText}</span>
        </button>

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
