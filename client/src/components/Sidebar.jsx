import React, { useState, useMemo } from 'react';
import { 
  Folder, 
  FolderOpen, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  X, 
  ChevronLeft, 
  Sparkles, 
  Layers, 
  Search,
  FileCode,
  FileText
} from 'lucide-react';
import FileTreeNode from './FileTreeNode';
import FolderPickerModal from './FolderPickerModal';

export default function Sidebar({ 
  projects = [],
  activeProject,
  projectFilesMap = {},
  expandedProjects = {},
  expandedFolders = {},
  folderChildrenMap = {},
  loadingFolders = {},
  onToggleProjectExpand,
  onToggleFolder,
  onSelectProject,
  onAddProject,
  onRemoveProject,
  onSelectFile,
  selectedFile,
  onCollapse,
  width = 260,
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleFolderPicked = async (folderPath) => {
    try {
      await onAddProject(folderPath);
    } catch (err) {
      console.error('Failed to add project:', err);
    }
  };

  // Compute all matching files across projects when searching
  const matchingFiles = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results = [];

    for (const proj of projects) {
      const allFiles = [
        ...(projectFilesMap[proj.path] || []),
        ...Object.values(folderChildrenMap).flat()
      ];

      // Deduplicate by path
      const seen = new Set();
      for (const item of allFiles) {
        if (!seen.has(item.path) && item.name.toLowerCase().includes(query)) {
          seen.add(item.path);
          results.push({ ...item, projectName: proj.name, projectPath: proj.path });
        }
      }
    }

    return results;
  }, [searchQuery, projects, projectFilesMap, folderChildrenMap]);

  return (
    <aside 
      style={{ width: `${width}px` }}
      className="border-r border-border bg-surface/60 backdrop-blur flex flex-col h-full select-none text-xs shrink-0 overflow-hidden font-mono"
    >
      {/* Top Header: Projects & Add (+) Button */}
      <div className="px-3 py-2.5 border-b border-border/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-200">
            Projects
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-surface-hover text-slate-300 border border-border/60">
            {projects.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Plus button to open folder picker dialog */}
          <button
            onClick={() => setIsPickerOpen(true)}
            title="Pick & Open Project Folder"
            className="p-1 rounded-md bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-all shadow-sm flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          
          {/* Collapse sidebar button */}
          <button
            onClick={onCollapse}
            title="Collapse Sidebar (Ctrl+B)"
            className="p-1 hover:bg-surface-hover rounded-md text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Search Bar for Files & Folders */}
      <div className="p-2 border-b border-border/60 bg-[#090d14]">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files in project..."
            className="w-full bg-surface/90 border border-border/80 rounded-md pl-7 pr-6 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 font-mono transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 p-0.5 hover:bg-surface text-slate-400 hover:text-white rounded"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Projects List / Search Results Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {searchQuery.trim() ? (
          /* Search Results Mode */
          <div className="space-y-1">
            <div className="px-1 text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">
              Found {matchingFiles.length} match{matchingFiles.length === 1 ? '' : 'es'}
            </div>
            {matchingFiles.length > 0 ? (
              matchingFiles.map((file) => (
                <div
                  key={file.path}
                  onClick={() => onSelectFile(file)}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                    selectedFile?.path === file.path
                      ? 'bg-indigo-600/25 border border-indigo-500/40 text-indigo-200 font-semibold'
                      : 'hover:bg-surface-hover text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 mr-1">
                    {file.isDirectory ? (
                      <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate text-xs">{file.name}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono shrink-0">
                    {file.projectName}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500 text-[11px] italic">
                No matching files found
              </div>
            )}
          </div>
        ) : (
          /* Standard Accordion Tree */
          projects.map((proj) => {
            const isExpanded = expandedProjects[proj.path] ?? true;
            const isActive = activeProject?.workspacePath === proj.path;
            const files = projectFilesMap[proj.path] || [];

            return (
              <div key={proj.path} className="rounded-lg border border-border/60 bg-surface/40 overflow-hidden">
                {/* Project Accordion Header Row */}
                <div 
                  onClick={() => {
                    onSelectProject(proj);
                    onToggleProjectExpand(proj.path);
                  }}
                  className={`px-2.5 py-2 flex items-center justify-between cursor-pointer transition-colors group select-none ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-200 font-semibold'
                      : 'hover:bg-surface-hover/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 mr-1">
                    <span className="text-slate-400 group-hover:text-slate-200">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </span>
                    
                    {isExpanded ? (
                      <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <Folder className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                    )}

                    <span className="truncate text-xs tracking-tight text-slate-100" title={proj.path}>
                      {proj.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-300 font-mono bg-surface-hover px-1.5 py-0.5 rounded border border-border/50">
                      {files.length > 0 ? `${files.length}` : `${proj.itemCount}`}
                    </span>
                    
                    {/* Remove Project Button */}
                    {projects.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveProject(proj.path);
                        }}
                        title="Remove project from workspace"
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-surface text-slate-400 hover:text-rose-400 rounded transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Recursive file/folder tree under project */}
                {isExpanded && (
                  <div className="py-1 bg-[#080b11] border-t border-border/40">
                    {files.length > 0 ? (
                      files.map((file) => (
                        <FileTreeNode
                          key={file.path}
                          item={file}
                          level={0}
                          selectedFile={selectedFile}
                          expandedFolders={expandedFolders}
                          folderChildrenMap={folderChildrenMap}
                          loadingFolders={loadingFolders}
                          onToggleFolder={onToggleFolder}
                          onSelectFile={(f) => {
                            onSelectProject(proj);
                            onSelectFile(f);
                          }}
                        />
                      ))
                    ) : (
                      <div className="p-2 text-center text-slate-400 text-[10px]">
                        No files in this project folder
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Clean Bottom Footer */}
      <div className="p-2.5 border-t border-border bg-surface/80">
        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Active Project</span>
          </span>
          <span className="font-mono text-[10px] text-indigo-300 font-semibold truncate max-w-[120px]">
            {activeProject?.name || 'AntiG'}
          </span>
        </div>
      </div>

      {/* Visual Folder Picker Modal */}
      <FolderPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelectFolder={handleFolderPicked}
      />
    </aside>
  );
}
