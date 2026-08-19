import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  X, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2, 
  Code2, 
  FolderGit2, 
  Save,
  GitCompare,
  RefreshCw,
  Edit3
} from 'lucide-react';
import DiffViewer from './DiffViewer';

export default function FileViewerPane({
  openFiles,
  activeFile,
  fileContents,
  originalContents = {},
  onSelectFileTab,
  onCloseFileTab,
  onReloadFile,
  onSaveFile,
  isExpanded,
  onToggleExpand,
  onClosePane,
}) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('editor'); // 'editor' | 'diff'
  const [localCode, setLocalCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const activePath = activeFile?.path;
  const diskContent = activePath ? fileContents[activePath] || '' : '';
  const originalCode = activePath ? originalContents[activePath] || diskContent : '';

  useEffect(() => {
    if (activePath) {
      setLocalCode(fileContents[activePath] || '');
      setViewMode('editor');
    }
  }, [activePath, fileContents]);

  // Keyboard shortcut Ctrl+S / Cmd+S for saving
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const isDirty = localCode !== diskContent;

  const handleSave = async () => {
    if (!activeFile || isSaving) return;
    setIsSaving(true);
    try {
      if (onSaveFile) {
        await onSaveFile(activeFile, localCode);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save file:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(localCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle tab key in code editor
  const handleEditorKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const updated = localCode.substring(0, start) + '  ' + localCode.substring(end);
      setLocalCode(updated);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  if (openFiles.length === 0 && !activeFile) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs p-6 text-center select-none bg-[#0d1117] border-l border-border font-mono">
        <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center border border-border/80 text-slate-400 mb-3 shadow-inner">
          <FolderGit2 className="w-6 h-6 text-indigo-400" />
        </div>
        <p className="font-medium text-slate-300">No File Selected</p>
        <p className="text-[11px] text-slate-500 mt-1 max-w-[220px]">
          Click any file in the sidebar to view, edit, or compare diffs side-by-side.
        </p>
      </div>
    );
  }

  const lineCount = (localCode.match(/\n/g) || []).length + 1;

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] border-l border-border select-none overflow-hidden font-mono">
      {/* File Tabs Bar */}
      <div className="flex items-center justify-between bg-surface/90 border-b border-border px-2 h-9 overflow-x-auto">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {openFiles.map((file) => {
            const isActive = activeFile?.path === file.path;
            const fileIsDirty = file.path === activePath ? isDirty : false;

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
                {fileIsDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />}
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
        <div className="flex items-center gap-1.5 pl-2 text-slate-400">
          {/* Mode Toggle: Code Editor vs Diff View */}
          <div className="flex items-center bg-surface border border-border/80 rounded-md p-0.5 text-[10px]">
            <button
              onClick={() => setViewMode('editor')}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                viewMode === 'editor' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Editor View"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => setViewMode('diff')}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                viewMode === 'diff' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Side-by-side Diff View"
            >
              <GitCompare className="w-3 h-3" />
              <span>Diff</span>
            </button>
          </div>

          {/* Save Button */}
          {isDirty && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-all shadow-sm"
              title="Save File (Ctrl+S)"
            >
              {saveSuccess ? <Check className="w-3 h-3 text-emerald-300" /> : <Save className="w-3 h-3" />}
              <span>{saveSuccess ? 'Saved' : isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          )}

          <button
            onClick={() => activeFile && onReloadFile(activeFile)}
            title="Reload File from Disk"
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

      {/* Path Breadcrumb & Status */}
      {activeFile && (
        <div className="px-3 py-1.5 bg-surface/40 border-b border-border/60 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="truncate">{activeFile.path}</span>
          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Unsaved changes
              </span>
            )}
            <span className="text-slate-500 text-[10px]">
              {lineCount} lines
            </span>
          </div>
        </div>
      )}

      {/* View Content: Live Code Editor vs Diff View */}
      {viewMode === 'diff' ? (
        <DiffViewer 
          oldCode={originalCode} 
          newCode={localCode} 
          oldFileName="Disk Version" 
          newFileName="Current Buffer" 
        />
      ) : (
        <div className="flex-1 flex overflow-hidden bg-[#070a0f] relative">
          {/* Line Numbers Column */}
          <div className="w-12 py-3 bg-[#06080d] border-r border-border/40 text-right pr-3 select-none text-slate-600 text-xs font-mono shrink-0 overflow-hidden leading-relaxed">
            {Array.from({ length: lineCount }).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Editable Textarea */}
          <textarea
            value={localCode}
            onChange={(e) => setLocalCode(e.target.value)}
            onKeyDown={handleEditorKeyDown}
            spellCheck={false}
            className="flex-1 p-3 bg-transparent text-slate-200 text-xs font-mono focus:outline-none resize-none overflow-auto leading-relaxed selection:bg-indigo-500/30 selection:text-indigo-200 whitespace-pre"
          />
        </div>
      )}
    </div>
  );
}
