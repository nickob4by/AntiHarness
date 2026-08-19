import React from 'react';
import { HardDrive, Cpu, Radio, FolderGit2, Info } from 'lucide-react';

export default function StatusBar({ systemHealth, connectionStatus, workspace }) {
  return (
    <footer className="h-7 border-t border-border bg-surface px-3 flex items-center justify-between text-[11px] text-slate-400 font-mono select-none">
      <div className="flex items-center gap-4">
        {/* Workspace path */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <FolderGit2 className="w-3 h-3 text-indigo-400" />
          <span className="truncate max-w-[280px]" title={workspace?.workspacePath}>
            {workspace?.workspacePath || 'No workspace selected'}
          </span>
        </div>

        {/* Total Items */}
        <div className="hidden sm:flex items-center gap-1 text-slate-500">
          <span>{workspace?.totalItems ?? 0} files/dirs</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* System metrics */}
        {systemHealth?.system && (
          <>
            <div className="hidden md:flex items-center gap-1.5 text-slate-400">
              <Cpu className="w-3 h-3 text-indigo-400" />
              <span>{systemHealth.system.cpus} CPUs</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-slate-400">
              <HardDrive className="w-3 h-3 text-indigo-400" />
              <span>RAM: {systemHealth.system.memory?.free} free / {systemHealth.system.memory?.total}</span>
            </div>
            <div className="hidden lg:flex items-center gap-1.5 text-slate-500">
              <span>Node {systemHealth.antigravity?.nodeVersion}</span>
            </div>
          </>
        )}

        {/* Gateway connection status */}
        <div className="flex items-center gap-1.5">
          <Radio className={`w-3 h-3 ${connectionStatus === 'connected' ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span className={connectionStatus === 'connected' ? 'text-emerald-400' : 'text-rose-400'}>
            {connectionStatus === 'connected' ? 'Gateway 3001' : 'Offline'}
          </span>
        </div>
      </div>
    </footer>
  );
}
