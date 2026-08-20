import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Search, 
  Github, 
  Plus, 
  Trash2, 
  FileCode, 
  CheckCircle2, 
  Layers, 
  RefreshCw, 
  ShieldCheck, 
  Cpu, 
  Terminal, 
  AlertCircle, 
  ArrowRight, 
  Check, 
  ExternalLink,
  BookOpen,
  FolderGit2,
  Zap,
  ZapOff,
  Copy,
  Tag,
  X
} from 'lucide-react';
import { 
  getSkills, 
  inspectGithubSkill, 
  installSkill, 
  deleteSkill,
  toggleSkillAutoInject,
  copySkillToProject
} from '../services/api';

const CATEGORIES = [
  { id: 'all', label: 'All Categories', icon: Tag },
  { id: 'Token & Optimization', label: 'Token & Optimization', emoji: '🚀' },
  { id: 'Coding & Refactoring', label: 'Coding & Refactoring', emoji: '🛠️' },
  { id: 'Architecture & Workflow', label: 'Architecture & Workflow', emoji: '🌐' },
  { id: 'Framework & Stack', label: 'Framework & Stack', emoji: '📦' },
  { id: 'General & Automation', label: 'General & Automation', emoji: '⚡' },
];

export default function SkillsHub({
  activeProject,
  onOpenSkillFile,
  onClose
}) {
  const [skills, setSkills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all'); // 'all' | 'project' | 'global' | 'builtin'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});

  // GitHub Installation Modal State
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [installScope, setInstallScope] = useState('global'); // Default to global so every skill is universally usable
  const [isInspecting, setIsInspecting] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [inspectedSkill, setInspectedSkill] = useState(null);
  const [inspectError, setInspectError] = useState('');
  const [installSuccess, setInstallSuccess] = useState('');

  const projectPath = activeProject?.workspacePath || '';

  const loadSkills = async () => {
    setIsLoading(true);
    try {
      const data = await getSkills(projectPath);
      if (data?.skills) {
        setSkills(data.skills);
      }
    } catch (err) {
      console.error('Failed to load skills:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSkills();
  }, [projectPath]);

  // Toggle Auto-Inject on Session Start
  const handleToggleAutoInject = async (skill) => {
    const slug = skill.slug || skill.name;
    const newStatus = !skill.isAutoInject;
    setActionLoading((prev) => ({ ...prev, [slug]: true }));
    try {
      await toggleSkillAutoInject(slug, newStatus);
      setSkills((prev) =>
        prev.map((s) =>
          s.slug === slug || s.name === slug
            ? { ...s, isAutoInject: newStatus, isUsedInProject: s.scope === 'project' || newStatus }
            : s
        )
      );
    } catch (err) {
      alert(`Failed to update auto-inject: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [slug]: false }));
    }
  };

  // Copy Global Skill to Local Project Folder
  const handleCopyToProject = async (skill) => {
    if (!projectPath) {
      alert('Please select an active project folder first.');
      return;
    }
    const slug = skill.slug || skill.name;
    setActionLoading((prev) => ({ ...prev, [`copy-${slug}`]: true }));
    try {
      await copySkillToProject(slug, projectPath);
      await loadSkills();
      alert(`Skill "${skill.name}" copied to ${projectPath}/.gemini/skills/${slug}`);
    } catch (err) {
      alert(`Failed to copy skill: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`copy-${slug}`]: false }));
    }
  };

  // Handle GitHub Inspection
  const handleInspectGithub = async (e) => {
    e?.preventDefault();
    if (!githubUrl.trim()) return;

    setIsInspecting(true);
    setInspectError('');
    setInspectedSkill(null);

    try {
      const data = await inspectGithubSkill(githubUrl.trim());
      if (data?.skill) {
        setInspectedSkill(data.skill);
      } else {
        setInspectError('Could not find a valid SKILL.md in this repository.');
      }
    } catch (err) {
      setInspectError(err.message || 'Failed to inspect GitHub repository.');
    } finally {
      setIsInspecting(false);
    }
  };

  // Handle Skill Confirmation & Installation
  const handleConfirmInstall = async () => {
    if (!inspectedSkill) return;

    setIsInstalling(true);
    setInspectError('');

    try {
      await installSkill({
        url: githubUrl.trim(),
        targetScope: installScope,
        projectPath,
        skillData: inspectedSkill,
      });

      setInstallSuccess(`Skill "${inspectedSkill.name}" installed globally and ready!`);
      setTimeout(() => {
        setInstallSuccess('');
        setIsInstallModalOpen(false);
        setGithubUrl('');
        setInspectedSkill(null);
        loadSkills();
      }, 1500);
    } catch (err) {
      setInspectError(err.message || 'Failed to install skill.');
    } finally {
      setIsInstalling(false);
    }
  };

  // Handle Skill Deletion or Removal from Project
  const handleDeleteSkill = async (skill) => {
    // 1. If deleting a Local Project Skill:
    if (skill.scope === 'project') {
      const confirmProjectDelete = window.confirm(
        `Remove "${skill.name}" from this project's local .gemini/skills folder?\n\n(This will permanently delete the folder from this project).`
      );
      if (!confirmProjectDelete) return;

      try {
        await deleteSkill({
          skillPath: skill.path,
          slug: skill.slug,
          projectPath: activeProject?.workspacePath,
        });
        loadSkills();
      } catch (err) {
        alert(`Error deleting project skill: ${err.message}`);
      }
      return;
    }

    // 2. If deleting a Global Skill from the Global tab:
    const confirmGlobalDelete = window.confirm(
      `⚠️ Warning: You are deleting "${skill.name}" globally from ~/.gemini/skills.\n\nThis will remove it from all projects. Are you sure you want to proceed?`
    );
    if (!confirmGlobalDelete) return;

    try {
      await deleteSkill({
        skillPath: skill.path,
        slug: skill.slug,
      });
      loadSkills();
    } catch (err) {
      alert(`Error deleting global skill: ${err.message}`);
    }
  };

  // Deduplicate unique skills per scope
  const uniqueSkills = useMemo(() => {
    const seen = new Set();
    return skills.filter((s) => {
      const key = `${s.scope}:${(s.slug || s.name).toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [skills]);

  // Project Tab Skills: strictly local project skills installed in .gemini/skills
  const projectActiveSkills = useMemo(() => {
    return uniqueSkills.filter((s) => s.scope === 'project');
  }, [uniqueSkills]);

  // Filter skills based on scope, category, and search query
  const filteredSkills = useMemo(() => {
    const seenCard = new Set();
    const listToFilter = scopeFilter === 'project' ? projectActiveSkills : uniqueSkills;

    return listToFilter.filter((s) => {
      const matchesScope = 
        scopeFilter === 'all' 
          ? true 
          : scopeFilter === 'project' 
          ? true 
          : s.scope === scopeFilter;

      const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;

      const matchesSearch = 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.triggers || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!matchesScope || !matchesCategory || !matchesSearch) return false;

      const cardKey = scopeFilter === 'all' ? (s.slug || s.name).toLowerCase() : `${s.scope}:${(s.slug || s.name).toLowerCase()}`;
      if (scopeFilter === 'all' && seenCard.has(cardKey)) return false;
      seenCard.add(cardKey);

      return true;
    });
  }, [uniqueSkills, projectActiveSkills, scopeFilter, categoryFilter, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-[#080c14] text-slate-200 font-mono select-none overflow-hidden">
      {/* Top Header Bar */}
      <div className="p-4 border-b border-border/80 bg-surface/90 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-tight">Antigravity Skills Hub</h2>
            <span className="px-2 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
              {uniqueSkills.length} Available
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
            Specialized capability packages, automation rules, and domain instructions for AGY.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setGithubUrl('');
              setInspectedSkill(null);
              setInspectError('');
              setIsInstallModalOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all active:scale-[0.99] cursor-pointer"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Install from GitHub</span>
          </button>

          <button
            onClick={loadSkills}
            title="Refresh Skills"
            className="p-2 rounded-xl bg-surface hover:bg-surface-hover border border-border/80 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-4 py-2.5 bg-[#090d16] border-b border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Scope Filter Tabs */}
        <div className="flex items-center bg-surface border border-border/80 rounded-lg p-0.5 text-[11px]">
          <button
            onClick={() => setScopeFilter('all')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              scopeFilter === 'all' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({uniqueSkills.length})
          </button>
          <button
            onClick={() => setScopeFilter('project')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
              scopeFilter === 'project' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Project ({projectActiveSkills.length})</span>
            {activeProject?.name && (
              <span className="text-[9px] opacity-70">[{activeProject.name}]</span>
            )}
          </button>
          <button
            onClick={() => setScopeFilter('global')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              scopeFilter === 'global' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Global ({uniqueSkills.filter(s => s.scope === 'global').length})
          </button>
          <button
            onClick={() => setScopeFilter('builtin')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              scopeFilter === 'builtin' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Built-in ({uniqueSkills.filter(s => s.scope === 'builtin').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex items-center min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills, triggers, categories..."
            className="w-full bg-surface border border-border/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
          />
        </div>
      </div>

      {/* Usage Domain Category Pills */}
      <div className="px-4 py-2 bg-[#0a0f1c] border-b border-border/60 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mr-1 flex items-center gap-1 shrink-0">
          <Tag className="w-3 h-3 text-slate-500" />
          <span>Category:</span>
        </span>
        {CATEGORIES.map((cat) => {
          const isSelected = categoryFilter === cat.id;
          const count = cat.id === 'all' 
            ? (scopeFilter === 'project' ? projectActiveSkills.length : uniqueSkills.length)
            : (scopeFilter === 'project' ? projectActiveSkills : uniqueSkills).filter(s => s.category === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600/30 border border-indigo-500/60 text-indigo-200 font-semibold shadow-xs'
                  : 'bg-surface/60 hover:bg-surface border border-border/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{cat.emoji || ''}</span>
              <span>{cat.label}</span>
              <span className="text-[9px] opacity-70 bg-black/40 px-1 py-0.2 rounded font-mono">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Skills Grid List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {filteredSkills.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 text-xs">
            <Sparkles className="w-8 h-8 text-slate-600 mb-2" />
            <p className="font-semibold text-slate-400">No Skills Found</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
              {searchQuery || categoryFilter !== 'all'
                ? 'Try adjusting your search query, scope, or category filter.'
                : 'Click "Install from GitHub" to add new Antigravity skills.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSkills.map((skill) => {
              const isBuiltin = skill.scope === 'builtin';
              const isProject = skill.scope === 'project';
              const isAutoInject = skill.isAutoInject;

              return (
                <div
                  key={skill.id}
                  className="p-4 rounded-xl border border-border/80 bg-[#0d121c]/90 hover:border-indigo-500/50 transition-all shadow-md flex flex-col justify-between group space-y-3"
                >
                  <div className="space-y-2.5">
                    {/* Card Top: Name & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded-lg bg-surface border border-border/60 text-indigo-400 shrink-0">
                          <Cpu className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-white tracking-tight truncate" title={skill.name}>{skill.name}</h3>
                          <span className="text-[10px] text-slate-500 font-mono truncate block">{skill.slug}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {skill.category && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-surface border border-border/60 text-slate-300">
                            {skill.category}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                          isBuiltin
                            ? 'bg-purple-950/40 border-purple-500/40 text-purple-300'
                            : isProject
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                            : 'bg-blue-950/40 border-blue-500/40 text-blue-300'
                        }`}>
                          {skill.scope}
                        </span>
                      </div>
                    </div>

                    {/* Auto-Inject on Session Start Interactive Toggle */}
                    <div className={`p-2 rounded-lg border flex items-center justify-between gap-2 transition-all ${
                      isAutoInject
                        ? 'bg-indigo-950/20 border-indigo-500/40'
                        : 'bg-surface/50 border-border/60'
                    }`}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Zap className={`w-3.5 h-3.5 shrink-0 ${isAutoInject ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
                        <div className="truncate">
                          <div className="text-[10px] font-bold text-slate-200">Auto-Inject on Start</div>
                          <div className="text-[9px] text-slate-400 font-sans truncate">
                            {isAutoInject ? '⚡ Active in every session start' : 'Manual activation'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleAutoInject(skill)}
                        disabled={actionLoading[skill.slug]}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                          isAutoInject
                            ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30'
                            : 'bg-surface border border-border/80 text-slate-400 hover:text-white hover:bg-surface-hover'
                        }`}
                      >
                        {actionLoading[skill.slug] ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : isAutoInject ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Injected</span>
                          </>
                        ) : (
                          <span>Enable</span>
                        )}
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-slate-300 font-sans leading-relaxed line-clamp-3">
                      {skill.description}
                    </p>

                    {/* Trigger Scenarios */}
                    {skill.triggers && skill.triggers.length > 0 && (
                      <div className="pt-2 border-t border-border/40 space-y-1">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Triggers:</span>
                        <div className="flex flex-wrap gap-1">
                          {skill.triggers.slice(0, 2).map((trig, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-surface border border-border/50 text-[10px] text-slate-400 truncate max-w-[200px]">
                              {trig}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                      <span>{skill.files?.length || 1} file(s)</span>
                      {scopeFilter === 'project' && !isProject && (
                        <span className="text-indigo-400 font-sans">· Global</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Copy to Project Button if in Project tab and not yet in local project */}
                      {scopeFilter === 'project' && !isProject && (
                        <button
                          type="button"
                          onClick={() => handleCopyToProject(skill)}
                          disabled={actionLoading[`copy-${skill.slug}`]}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 transition-colors text-[10px] cursor-pointer"
                          title="Copy to project local .gemini/skills folder"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{actionLoading[`copy-${skill.slug}`] ? 'Copying...' : 'Copy to Project'}</span>
                        </button>
                      )}

                      {onOpenSkillFile && skill.skillMdPath && (
                        <button
                          type="button"
                          onClick={() => onOpenSkillFile({ path: skill.skillMdPath, name: `${skill.name} (SKILL.md)` })}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-surface hover:bg-surface-hover text-slate-300 hover:text-white border border-border/60 transition-colors text-[10px] cursor-pointer"
                          title="View SKILL.md in Monaco Editor"
                        >
                          <FileCode className="w-3 h-3 text-indigo-400" />
                          <span>Inspect</span>
                        </button>
                      )}

                      {!isBuiltin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSkill(skill)}
                          className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 rounded transition-colors cursor-pointer"
                          title="Delete Skill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* GitHub Skill Installation & AI Summary Modal */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-[#0d121c] border border-border/80 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-border/80 bg-surface/90 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
                  <Github className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Install Skill from GitHub</h3>
                  <p className="text-[10px] text-slate-400 font-sans">Paste a repository link for automatic AI inspection and installation.</p>
                </div>
              </div>
              <button
                onClick={() => setIsInstallModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 font-mono text-xs">
              {/* URL Input Form */}
              <form onSubmit={handleInspectGithub} className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                    GitHub Repository or Skill URL:
                  </label>
                  <div className="relative flex items-center">
                    <Github className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                    <input
                      type="url"
                      required
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/owner/repository or .../skills/skill-name"
                      className="w-full bg-surface border border-border/80 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Target Scope Selection */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <label 
                    onClick={() => setInstallScope('project')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      installScope === 'project'
                        ? 'bg-indigo-600/15 border-indigo-500/50 text-white'
                        : 'bg-surface border-border text-slate-400 hover:border-border/80'
                    }`}
                  >
                    <FolderGit2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-200">Current Project</div>
                      <div className="text-[9px] text-slate-500 font-sans">Saved in .gemini/skills</div>
                    </div>
                  </label>

                  <label 
                    onClick={() => setInstallScope('global')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      installScope === 'global'
                        ? 'bg-indigo-600/15 border-indigo-500/50 text-white'
                        : 'bg-surface border-border text-slate-400 hover:border-border/80'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-200">Global (All Projects)</div>
                      <div className="text-[9px] text-slate-500 font-sans">Saved in ~/.gemini/skills</div>
                    </div>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isInspecting || !githubUrl.trim()}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-sans font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  {isInspecting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Inspecting Repository & Generating AI Summary...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Analyze & Summarize Skill</span>
                    </>
                  )}
                </button>
              </form>

              {inspectError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{inspectError}</span>
                </div>
              )}

              {installSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{installSuccess}</span>
                </div>
              )}

              {/* STEP 2: AI SUMMARY PREVIEW CARD */}
              {inspectedSkill && (
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/40 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-bold text-white">{inspectedSkill.name}</h4>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                      Ready to Install
                    </span>
                  </div>

                  {/* AI Synopsis Summary */}
                  <div>
                    <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">AI Skill Synopsis</div>
                    <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                      {inspectedSkill.summary}
                    </p>
                  </div>

                  {/* Trigger Scenarios */}
                  {inspectedSkill.triggers && inspectedSkill.triggers.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">When Agent Triggers This Skill</div>
                      <div className="flex flex-wrap gap-1">
                        {inspectedSkill.triggers.map((t, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-surface border border-border/60 text-[10px] text-slate-300">
                            • {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SKILL.md Document Preview */}
                  {inspectedSkill.rawPreview && (
                    <div>
                      <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">SKILL.md Instructions Preview</div>
                      <pre className="p-2.5 rounded-lg bg-[#080c14] border border-border/60 text-[10px] text-slate-300 overflow-x-auto max-h-36 font-mono whitespace-pre">
                        {inspectedSkill.rawPreview}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            {inspectedSkill && (
              <div className="p-4 border-t border-border/80 bg-surface/90 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setInspectedSkill(null)}
                  className="px-3 py-1.5 rounded-xl hover:bg-surface-hover text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleConfirmInstall}
                  disabled={isInstalling}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg transition-all active:scale-[0.99] cursor-pointer"
                >
                  {isInstalling ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Installing Skill...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm & Install Skill</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
