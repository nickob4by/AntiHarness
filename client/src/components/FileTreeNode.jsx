import React from 'react';
import { 
  Folder, 
  FolderOpen, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  FileCode, 
  FileJson,
  Loader2
} from 'lucide-react';

function getFileIcon(fileName) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css'].includes(ext)) {
    return <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
  }
  if (['json', 'yaml', 'yml', 'toml'].includes(ext)) {
    return <FileJson className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  }
  return <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
}

export default function FileTreeNode({
  item,
  level = 0,
  selectedFile,
  expandedFolders,
  folderChildrenMap,
  loadingFolders,
  onToggleFolder,
  onSelectFile,
}) {
  const isExpanded = expandedFolders[item.path] ?? false;
  const isLoading = loadingFolders[item.path] ?? false;
  const children = folderChildrenMap[item.path] || [];
  const isSelected = selectedFile?.path === item.path;

  if (item.isDirectory) {
    return (
      <div className="select-none">
        {/* Directory Row */}
        <button
          onClick={() => onToggleFolder(item.path)}
          style={{ paddingLeft: `${Math.max(level * 10 + 6, 6)}px` }}
          className={`w-full flex items-center gap-1.5 py-1 pr-2 rounded text-left transition-colors truncate text-[11px] group ${
            isExpanded
              ? 'text-slate-200 font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover/80'
          }`}
        >
          {/* Expand/Collapse Chevron */}
          <span className="text-slate-400 group-hover:text-slate-200 shrink-0">
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
            ) : isExpanded ? (
              <ChevronDown className="w-3 h-3 text-indigo-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-slate-400" />
            )}
          </span>

          {/* Folder Icon */}
          {isExpanded ? (
            <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
          )}

          <span className="truncate flex-1 font-mono tracking-tight">{item.name}</span>
        </button>

        {/* Nested Child Items */}
        {isExpanded && (
          <div className="relative border-l border-border/40 ml-2.5 my-0.5">
            {children.length > 0 ? (
              children.map((child) => (
                <FileTreeNode
                  key={child.path}
                  item={child}
                  level={level + 1}
                  selectedFile={selectedFile}
                  expandedFolders={expandedFolders}
                  folderChildrenMap={folderChildrenMap}
                  loadingFolders={loadingFolders}
                  onToggleFolder={onToggleFolder}
                  onSelectFile={onSelectFile}
                />
              ))
            ) : (
              !isLoading && (
                <div 
                  style={{ paddingLeft: `${(level + 1) * 10 + 6}px` }} 
                  className="py-1 text-slate-500 text-[10px] italic font-mono"
                >
                  (empty folder)
                </div>
              )
            )}
          </div>
        )}
      </div>
    );
  }

  // File Row
  return (
    <button
      onClick={() => onSelectFile(item)}
      style={{ paddingLeft: `${Math.max(level * 10 + 16, 16)}px` }}
      className={`w-full flex items-center gap-1.5 py-1 pr-2 rounded text-left transition-colors truncate text-[11px] group ${
        isSelected
          ? 'bg-indigo-600/25 text-indigo-300 font-medium'
          : 'text-slate-300 hover:bg-surface-hover/80 hover:text-white'
      }`}
    >
      {getFileIcon(item.name)}
      <span className="truncate flex-1 font-mono tracking-tight">{item.name}</span>
      {item.size > 0 && (
        <span className="text-[10px] text-indigo-300/90 font-mono bg-surface/80 px-1 py-0.2 rounded border border-border/50 shrink-0">
          {(item.size / 1024).toFixed(1)}k
        </span>
      )}
    </button>
  );
}
