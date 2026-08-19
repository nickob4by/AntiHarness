import React, { useState } from 'react';
import { 
  FileText, 
  X, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2, 
  Code2, 
  FolderGit2, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';

export default function FileViewerPane({
  openFiles,
  activeFile,
  fileContents,
  onSelectFileTab,
  onCloseFileTab,
  onReloadFile,
  isExpanded,
  onToggleExpand,
  onClosePane,
}) {
  const [copied, setCopied] = useState(false);

  if (openFiles.length === 0 && !activeFile) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs p-6 text-center select-none bg-[#0d1117] border-l border-border">
        <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center border border-border/80 text-slate-400 mb-3 shadow-inner">
          <FolderGit2 className="w-6 h-6 text-indigo-400" />
        </div>
        <p className="font-medium text-slate-300">No File Selected</p>
        <p className="text-[11px] text-slate-500 mt-1 max-w-[220px]">
          Click any file in the sidebar to open it side-by-side with your chat.
        </p>
      </div>
    );
  }

  const currentContent = activeFile ? fileContents[activeFile.path] || 'Loading file content...' : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] border-l border-border select-none overflow-hidden">
      {/* File Tabs Bar */}
      <div className="flex items-center justify-between bg-surface/90 border-b border-border px-2 h-9 overflow-x-auto">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {openFiles.map((file) => {
            const isActive = activeFile?.path === file.path;
            return (
              <div
                key={file.path}
                onClick={() => onSelectFileTab(file)}
                className={`flex items-center gap-2 px-3 py-1 text-xs rounded-t border-t-2 transition-all cursor-pointer truncate max-w-[180px] ${
                  isActive
                    ? 'bg-[#0a0d14] border-indigo-500 text-white font-medium shadow-sm'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
                }`}
              >
                <FileText className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span className="truncate">{file.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseFileTab(file);
                  }}
                  className="p-0.5 hover:bg-surface-hover rounded text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 pl-2 text-slate-400">
          <button
            onClick={() => activeFile && onReloadFile(activeFile)}
            title="Reload File"
            className="p-1 hover:bg-surface-hover hover:text-slate-200 rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            title="Copy File Content"
            className="p-1 hover:bg-surface-hover hover:text-slate-200 rounded transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onToggleExpand}
            title={isExpanded ? "Restore Split View" : "Maximize File Pane"}
            className="p-1 hover:bg-surface-hover hover:text-slate-200 rounded transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClosePane}
            title="Close File Pane"
            className="p-1 hover:bg-surface-hover hover:text-rose-400 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Path Breadcrumb Header */}
      {activeFile && (
        <div className="px-3 py-1.5 bg-surface/40 border-b border-border/60 text-[11px] text-slate-400 font-mono flex items-center justify-between">
          <span className="truncate">{activeFile.path}</span>
          <span className="text-slate-500 font-mono text-[10px]">
            {currentContent.split('\n').length} lines
          </span>
        </div>
      )}

      {/* Code / Content Area */}
      <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-200 bg-[#070a0f] selection:bg-indigo-500/30 selection:text-indigo-200">
        <pre className="whitespace-pre">{currentContent}</pre>
      </div>
    </div>
  );
}
