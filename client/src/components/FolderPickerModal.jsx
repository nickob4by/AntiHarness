import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderOpen, 
  HardDrive, 
  ArrowUp, 
  ChevronRight, 
  Search, 
  X, 
  Check, 
  Home, 
  Loader2,
  FolderPlus
} from 'lucide-react';
import { browseFolders } from '../services/api';

export default function FolderPickerModal({ isOpen, onClose, onSelectFolder }) {
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState(null);
  const [drives, setDrives] = useState([]);
  const [directories, setDirectories] = useState([]);
  const [selectedPath, setSelectedPath] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadDirectory = async (targetPath = '') => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await browseFolders(targetPath);
      setCurrentPath(data.currentPath);
      setSelectedPath(data.currentPath);
      setParentPath(data.parentPath);
      if (data.drives) setDrives(data.drives);
      setDirectories(data.directories || []);
      setSearchQuery('');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to open directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDirectory();
    }
  }, [isOpen]);

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

  const filteredDirectories = directories.filter((dir) =>
    dir.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedPath) {
      onSelectFolder(selectedPath);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn select-none font-mono text-xs">
      <div 
        className="w-full max-w-xl bg-[#0f141d] border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-surface/90 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-100">
            <FolderPlus className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-xs">Select Project Folder</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-hover text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Drive Selector Buttons */}
        <div className="px-4 py-2 bg-surface/50 border-b border-border/60 flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-1">Drives:</span>
          {drives.map((d) => (
            <button
              key={d.path}
              onClick={() => loadDirectory(d.path)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors ${
                currentPath.startsWith(d.path)
                  ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 font-semibold'
                  : 'bg-surface border-border/60 text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
              }`}
            >
              {d.name === 'Home' ? (
                <Home className="w-3 h-3 text-indigo-400" />
              ) : (
                <HardDrive className="w-3 h-3 text-slate-400" />
              )}
              <span>{d.name}</span>
            </button>
          ))}
        </div>

        {/* Path Navigation & Up Button */}
        <div className="px-4 py-2 border-b border-border/60 flex items-center gap-2 bg-[#090d14]">
          <button
            onClick={() => parentPath && loadDirectory(parentPath)}
            disabled={!parentPath}
            title="Go to Parent Folder"
            className="p-1 rounded bg-surface hover:bg-surface-hover disabled:opacity-30 border border-border/60 text-slate-300"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          <div className="flex-1 bg-surface/80 border border-border/60 rounded px-2.5 py-1 text-[11px] text-slate-200 font-mono truncate">
            {currentPath}
          </div>

          {/* Quick Search */}
          <div className="relative w-36">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter folders..."
              className="w-full bg-surface border border-border rounded px-2 py-1 pr-6 text-[10px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <Search className="w-3 h-3 text-slate-500 absolute right-1.5 top-1.5" />
          </div>
        </div>

        {/* Directory List Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-[220px]">
          {isLoading ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span>Scanning directories...</span>
            </div>
          ) : errorMsg ? (
            <div className="p-4 text-center text-rose-400 text-[11px]">{errorMsg}</div>
          ) : filteredDirectories.length > 0 ? (
            filteredDirectories.map((dir) => {
              const isSelected = selectedPath === dir.path;
              return (
                <div
                  key={dir.path}
                  onClick={() => setSelectedPath(dir.path)}
                  onDoubleClick={() => loadDirectory(dir.path)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/25 text-indigo-200 font-semibold border border-indigo-500/40'
                      : 'text-slate-300 hover:bg-surface-hover/80 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate flex-1">
                    <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-amber-400'}`} />
                    <span className="truncate text-xs">{dir.name}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-500 shrink-0">
                    <span>{dir.itemCount} items</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        loadDirectory(dir.path);
                      }}
                      className="p-1 hover:bg-surface rounded text-slate-400 hover:text-indigo-300"
                      title="Open inside this folder"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs italic">
              No subdirectories found in this folder
            </div>
          )}
        </div>

        {/* Footer: Selected Folder Preview & Confirmation */}
        <div className="px-4 py-3 border-t border-border bg-surface/90 flex items-center justify-between text-xs">
          <div className="truncate max-w-[280px] text-slate-400 text-[10px]">
            Selected: <strong className="text-slate-200">{selectedPath ? selectedPath.split('\\').pop() || selectedPath : 'None'}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-border text-slate-300 hover:bg-surface hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedPath}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Select This Folder</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
