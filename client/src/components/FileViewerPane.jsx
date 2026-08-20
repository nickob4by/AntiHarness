import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  X, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2, 
  FolderGit2, 
  Save, 
  GitCompare, 
  RefreshCw, 
  Edit3, 
  Globe, 
  Sparkles, 
  Columns, 
  AlignJustify,
  CheckCircle2,
  Undo2,
  BookOpen
} from 'lucide-react';
import MonacoEditorWrapper, { getMonacoLanguage } from './MonacoEditorWrapper';
import MarkdownRenderer from './MarkdownRenderer';

export default function FileViewerPane({
  openFiles,
  activeFile,
  fileContents,
  originalContents = {},
  liveAiModifiedFile,
  onSelectFileTab,
  onCloseFileTab,
  onReloadFile,
  onSaveFile,
  isExpanded,
  onToggleExpand,
  onClosePane,
}) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('editor'); // 'editor' | 'diff' | 'preview'
  const [renderSideBySide, setRenderSideBySide] = useState(true);
  const [localCode, setLocalCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const activePath = activeFile?.path;
  const diskContent = activePath ? fileContents[activePath] || '' : '';
  const originalCode = activePath ? originalContents[activePath] || diskContent : '';

  const isWebFile = useMemo(() => {
    if (!activeFile) return false;
    const name = activeFile.name?.toLowerCase() || '';
    return name.endsWith('.html') || name.endsWith('.htm') || name.endsWith('.svg');
  }, [activeFile]);

  const isMarkdownFile = useMemo(() => {
    if (!activeFile) return false;
    const name = activeFile.name?.toLowerCase() || '';
    return name.endsWith('.md') || name.endsWith('.markdown');
  }, [activeFile]);

  const isPreviewable = isWebFile || isMarkdownFile;

  useEffect(() => {
    if (activePath) {
      const code = fileContents[activePath] || '';
      setLocalCode(code);

      // If AI just edited an HTML/SVG file, auto-switch to preview
      if (liveAiModifiedFile === activePath && isWebFile) {
        setViewMode('preview');
      }
    }
  }, [activePath, fileContents, liveAiModifiedFile, isWebFile]);

  const isDirty = localCode !== diskContent;
  const hasDiffWithOriginal = localCode !== originalCode;

  const handleSave = async (codeToSave = localCode) => {
    if (!activeFile || isSaving) return;
    setIsSaving(true);
    try {
      if (onSaveFile) {
        await onSaveFile(activeFile, codeToSave);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save file:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAcceptDiff = async () => {
    await handleSave(localCode);
    setViewMode('editor');
  };

  const handleRevertToOriginal = () => {
    setLocalCode(originalCode);
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(localCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (openFiles.length === 0 && !activeFile) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs p-6 text-center select-none bg-[#080c14] border-l border-border font-mono">
        <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center border border-border/80 text-slate-400 mb-3 shadow-inner">
          <FolderGit2 className="w-6 h-6 text-indigo-400" />
        </div>
        <p className="font-medium text-slate-300">No File Open</p>
        <p className="text-[11px] text-slate-500 mt-1 max-w-[220px]">
          Open files from the project explorer or inspect AI code modifications here.
        </p>
      </div>
    );
  }

  const lineCount = (localCode.match(/\n/g) || []).length + 1;
  const isAiActiveOnThisFile = liveAiModifiedFile === activePath;
  const language = getMonacoLanguage(activeFile?.name);

  return (
    <div className="flex flex-col h-full bg-[#080c14] border-l border-border select-none overflow-hidden font-mono">
      {/* Top File Tabs Bar */}
      <div className="flex items-center justify-between bg-surface/95 border-b border-border px-2 h-9 overflow-x-auto">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {openFiles.map((file) => {
            const isActive = activeFile?.path === file.path;
            const fileIsDirty = file.path === activePath ? isDirty : false;
            const fileIsAiLive = liveAiModifiedFile === file.path;

            return (
              <div
                key={file.path}
                onClick={() => onSelectFileTab(file)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-t border-t-2 transition-all cursor-pointer truncate max-w-[190px] ${
                  isActive
                    ? 'bg-[#080c14] border-indigo-500 text-white font-medium shadow-sm'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
                }`}
              >
                {fileIsAiLive ? (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                ) : (
                  <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                )}
                
                <span className="truncate">{file.name}</span>
                {fileIsDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />}
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseFileTab(file);
                  }}
                  className="p-0.5 hover:bg-surface-hover rounded text-slate-400 hover:text-slate-200 ml-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 pl-2 text-slate-400">
          {/* Mode Switcher: Edit | Diff | Preview */}
          <div className="flex items-center bg-[#0d121c] border border-border/80 rounded-md p-0.5 text-[10px]">
            <button
              onClick={() => setViewMode('editor')}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                viewMode === 'editor' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Monaco Code Editor"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => setViewMode('diff')}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                viewMode === 'diff' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Side-by-side & Inline Diff Review"
            >
              <GitCompare className="w-3 h-3" />
              <span>Diff</span>
            </button>
            {isPreviewable && (
              <button
                onClick={() => setViewMode('preview')}
                className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                  viewMode === 'preview' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title={isWebFile ? "Live Webpage Preview" : "Markdown & Diagram Preview"}
              >
                {isWebFile ? <Globe className="w-3 h-3 text-emerald-400" /> : <BookOpen className="w-3 h-3 text-indigo-400" />}
                <span>Preview</span>
              </button>
            )}
          </div>

          {/* Diff Controls (if in Diff Mode) */}
          {viewMode === 'diff' && (
            <div className="flex items-center gap-1 bg-[#0d121c] border border-border/80 rounded-md p-0.5 text-[10px]">
              <button
                onClick={() => setRenderSideBySide(!renderSideBySide)}
                className="p-1 hover:bg-surface-hover text-slate-300 rounded transition-colors cursor-pointer"
                title={renderSideBySide ? "Switch to Inline Diff" : "Switch to Side-by-Side Diff"}
              >
                {renderSideBySide ? <Columns className="w-3 h-3 text-indigo-400" /> : <AlignJustify className="w-3 h-3 text-indigo-400" />}
              </button>
              {hasDiffWithOriginal && (
                <>
                  <button
                    onClick={handleAcceptDiff}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all cursor-pointer"
                    title="Accept AI Changes & Save to Disk"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Accept</span>
                  </button>
                  <button
                    onClick={handleRevertToOriginal}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-rose-500/20 text-rose-300 transition-all cursor-pointer"
                    title="Revert Buffer to Disk Version"
                  >
                    <Undo2 className="w-3 h-3" />
                    <span>Revert</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Save Button */}
          {isDirty && (
            <button
              onClick={() => handleSave(localCode)}
              disabled={isSaving}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-all shadow-sm cursor-pointer"
              title="Save File (Ctrl+S)"
            >
              {saveSuccess ? <Check className="w-3 h-3 text-emerald-300" /> : <Save className="w-3 h-3" />}
              <span>{saveSuccess ? 'Saved' : isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          )}

          <button
            onClick={() => activeFile && onReloadFile(activeFile)}
            title="Reload from Disk"
            className="p-1 hover:bg-surface-hover hover:text-slate-200 rounded transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            title="Copy Code"
            className="p-1 hover:bg-surface-hover hover:text-slate-200 rounded transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onToggleExpand}
            title={isExpanded ? "Restore Split View" : "Maximize File Pane"}
            className="p-1 hover:bg-surface-hover hover:text-slate-200 rounded transition-colors cursor-pointer"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClosePane}
            title="Close File Pane"
            className="p-1 hover:bg-surface-hover hover:text-rose-400 rounded transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Path Breadcrumb & Live Metadata */}
      {activeFile && (
        <div className="px-3 py-1 bg-[#090d16] border-b border-border/60 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="truncate text-slate-300">{activeFile.path}</span>
            <span className="px-1.5 py-0.2 rounded bg-surface border border-border/60 text-[10px] text-indigo-300 uppercase">
              {language}
            </span>
            {isAiActiveOnThisFile && (
              <span className="px-2 py-0.2 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-semibold text-[10px] flex items-center gap-1 animate-pulse">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                Live AI Edit
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
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

      {/* Interactive AI Code Modification Review Banner */}
      {hasDiffWithOriginal && (
        <div className="px-4 py-1.5 bg-indigo-950/70 border-b border-indigo-500/40 flex items-center justify-between text-xs animate-fadeIn select-none">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span className="text-indigo-200 font-medium text-[11px]">
              AI Modified <code className="text-white font-mono bg-indigo-900/60 px-1 rounded">{activeFile?.name}</code>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewMode(viewMode === 'diff' ? 'editor' : 'diff')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                viewMode === 'diff' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-surface hover:bg-surface-hover text-slate-300 border border-border/80'
              }`}
            >
              {viewMode === 'diff' ? 'Show Editor' : 'Inspect Diff'}
            </button>
            <button
              onClick={handleAcceptDiff}
              className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              title="Keep AI changes and save file"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Keep Changes</span>
            </button>
            <button
              onClick={handleRevertToOriginal}
              className="px-2 py-0.5 rounded bg-surface hover:bg-rose-950/40 border border-border/80 hover:border-rose-500/40 text-rose-300 text-[10px] flex items-center gap-1 transition-all cursor-pointer"
              title="Revert back to original before AI edits"
            >
              <Undo2 className="w-3 h-3" />
              <span>Revert</span>
            </button>
          </div>
        </div>
      )}

      {/* View Content Area: Monaco Edit | Monaco Diff | Live Preview */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'preview' ? (
          isWebFile ? (
            <div className="w-full h-full bg-white overflow-hidden relative">
              <iframe
                title="Live Webpage Preview"
                srcDoc={localCode}
                sandbox="allow-scripts allow-same-origin allow-forms"
                className="w-full h-full border-0 bg-white"
              />
            </div>
          ) : isMarkdownFile ? (
            <div className="w-full h-full bg-[#080c14] overflow-auto p-5">
              <MarkdownRenderer content={localCode} />
            </div>
          ) : (
            <MonacoEditorWrapper
              value={localCode}
              onChange={(val) => setLocalCode(val)}
              filename={activeFile?.name}
              onSave={() => handleSave(localCode)}
            />
          )
        ) : viewMode === 'diff' ? (
          <MonacoEditorWrapper
            value={localCode}
            onChange={(val) => setLocalCode(val)}
            originalValue={originalCode}
            filename={activeFile?.name}
            isDiffMode={true}
            renderSideBySide={renderSideBySide}
            onSave={() => handleSave(localCode)}
          />
        ) : (
          <MonacoEditorWrapper
            value={localCode}
            onChange={(val) => setLocalCode(val)}
            filename={activeFile?.name}
            isDiffMode={false}
            onSave={() => handleSave(localCode)}
          />
        )}
      </div>
    </div>
  );
}
