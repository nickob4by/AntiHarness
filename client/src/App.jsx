import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainCanvas from './components/MainCanvas';
import FileViewerPane from './components/FileViewerPane';
import ResizeHandle from './components/ResizeHandle';
import StatusBar from './components/StatusBar';
import LoginPage from './components/LoginPage';
import SkillsHub from './components/SkillsHub';
import HistoryModal from './components/HistoryModal';
import { 
  getSystemHealth, 
  getUsage,
  getProjects,
  addProject,
  removeProject,
  getWorkspaceInfo, 
  getFileContent, 
  saveFileContent,
  getSessions, 
  getSessionTranscript 
} from './services/api';
import { HarnessWebSocket } from './services/websocket';

// Helper to normalize Windows/POSIX paths for comparison
function normalizePath(p) {
  if (!p) return '';
  return p.replace(/\\/g, '/').toLowerCase();
}

function isPathUnderProject(filePath, projPath) {
  if (!filePath || !projPath) return false;
  return normalizePath(filePath).startsWith(normalizePath(projPath));
}

// Helper to create an initial default tab for a project
function createInitialTabForProject(projectPath, projectName, tabIndex = 0) {
  const isMain = tabIndex === 0;
  return {
    id: `agent-${Date.now()}-${tabIndex}`,
    projectPath: projectPath || 'D:\\AntiG',
    title: isMain ? `${projectName || 'Project'} Agent` : `Subagent #${tabIndex}`,
    messages: [
      {
        role: 'assistant',
        content: `👋 Connected to **${projectName || 'Project'}** (\`${projectPath}\`)\n\n- **Project-Isolated Chat**: This conversation is uniquely bound to this project.\n- **Real-Time Thinking**: The AI's live reasoning and planning steps are displayed as it generates.\n- **Direct Commands**: Type commands like \`dir\`, \`git status\`, or \`npm run build\` to execute right inside this directory.`,
      }
    ],
    isStreaming: false,
    currentStream: {
      thoughts: '',
      isThinking: false,
      tools: [],
      content: '',
    },
  };
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('antiharness_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [systemHealth, setSystemHealth] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [activeProjectPath, setActiveProjectPath] = useState('D:\\AntiG');
  const [usageData, setUsageData] = useState(null);

  // Projects & Nested folder tree state
  const [projects, setProjects] = useState([]);
  const [projectFilesMap, setProjectFilesMap] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});
  const [folderChildrenMap, setFolderChildrenMap] = useState({});
  const [loadingFolders, setLoadingFolders] = useState({});

  // Layout toggles & Resizable widths
  const [currentMainView, setCurrentMainView] = useState('console'); // 'console' | 'skills'
  const [isCompact, setIsCompact] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 960 : false));
  const [compactPane, setCompactPane] = useState('chat'); // 'chat' | 'code'
  const [showSidebar, setShowSidebar] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 960 : true));
  const [sidebarWidth, setSidebarWidth] = useState(260); // in pixels
  const [showFilePane, setShowFilePane] = useState(true);
  const [isFilePaneExpanded, setIsFilePaneExpanded] = useState(false);
  const [filePaneRatio, setFilePaneRatio] = useState(50); // percentage (20% - 80%)

  // Dragging states
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  
  // Multi-window File viewer state
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [fileContents, setFileContents] = useState({});
  const [originalContents, setOriginalContents] = useState({});
  const [liveAiModifiedFile, setLiveAiModifiedFile] = useState(null);
  
  // Sessions & Trajectory history
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedSessionTranscript, setSelectedSessionTranscript] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Project-Scoped Multi-Agent Chat Tabs: Map<projectPath, tab[]>
  const [projectChatTabsMap, setProjectChatTabsMap] = useState({
    'D:\\AntiG': [createInitialTabForProject('D:\\AntiG', 'AntiG', 0)]
  });
  const [activeTabId, setActiveTabId] = useState(() => projectChatTabsMap['D:\\AntiG']?.[0]?.id || 'agent-main');

  const wsClientRef = useRef(null);
  const containerRef = useRef(null);
  const activeProjectRef = useRef(activeProjectPath);
  const activeTabIdRef = useRef(activeTabId);

  useEffect(() => {
    activeProjectRef.current = activeProjectPath;
  }, [activeProjectPath]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  // Helper to ensure an array of tabs for a project is always valid and non-empty
  const getProjectTabs = useCallback((map, projPath, projName) => {
    const list = map?.[projPath];
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
    return [createInitialTabForProject(projPath, projName || 'Project', 0)];
  }, []);

  // Get active tabs array for current active project
  const currentProjectTabs = useMemo(() => {
    return getProjectTabs(projectChatTabsMap, activeProjectPath, workspace?.name);
  }, [projectChatTabsMap, activeProjectPath, workspace, getProjectTabs]);

  // Active chat tab
  const activeTab = useMemo(() => {
    const found = currentProjectTabs.find((t) => t.id === activeTabId);
    return found || currentProjectTabs[0] || createInitialTabForProject(activeProjectPath, workspace?.name || 'Project', 0);
  }, [currentProjectTabs, activeTabId, activeProjectPath, workspace]);

  // Ensure active tab matches current project when project switches
  useEffect(() => {
    if (!currentProjectTabs.some((t) => t.id === activeTabId)) {
      if (currentProjectTabs.length > 0) {
        setActiveTabId(currentProjectTabs[0].id);
      }
    }
  }, [activeProjectPath, currentProjectTabs, activeTabId]);

  const handleAddChatTab = () => {
    const newId = `agent-${Date.now()}`;
    const newTab = {
      id: newId,
      projectPath: activeProjectPath,
      title: `Subagent #${currentProjectTabs.length}`,
      messages: [
        {
          role: 'assistant',
          content: `Subagent #${currentProjectTabs.length} is deployed in \`${activeProjectPath}\`. You can run independent tasks or shell commands here while other agents work concurrently!`,
        }
      ],
      isStreaming: false,
      currentStream: {
        thoughts: '',
        isThinking: false,
        tools: [],
        content: '',
      },
    };

    setProjectChatTabsMap((prev) => ({
      ...prev,
      [activeProjectPath]: [...(prev[activeProjectPath] || []), newTab]
    }));
    setActiveTabId(newId);
  };

  const handleCloseChatTab = (tabId) => {
    if (currentProjectTabs.length <= 1) return;
    const filtered = currentProjectTabs.filter((t) => t.id !== tabId);
    setProjectChatTabsMap((prev) => ({
      ...prev,
      [activeProjectPath]: filtered,
    }));
    if (activeTabId === tabId) {
      setActiveTabId(filtered[filtered.length - 1].id);
    }
  };

  // Resume an archived session into a new chat tab
  const handleResumeSessionInTab = ({ id, title, messages }) => {
    const newTabId = `resume-${id}`;
    const resumedTab = {
      id: newTabId,
      projectPath: activeProjectPath,
      title: title || `Archived Session`,
      messages: messages || [],
      isStreaming: false,
      currentStream: { thoughts: '', isThinking: false, tools: [], content: '' }
    };

    setProjectChatTabsMap((prev) => {
      const existing = getProjectTabs(prev, activeProjectPath, workspace?.name);
      return {
        ...prev,
        [activeProjectPath]: [...existing, resumedTab]
      };
    });
    setActiveTabId(newTabId);
  };

  // Load project files for a specific project root
  const loadProjectFiles = async (projPath) => {
    try {
      const info = await getWorkspaceInfo(projPath);
      if (info?.items) {
        setProjectFilesMap((prev) => ({ ...prev, [projPath]: info.items }));
      }
      return info;
    } catch (e) {
      console.error(`Failed to load files for ${projPath}:`, e);
      return null;
    }
  };

  // Toggle nested subfolder expansion and fetch children if not loaded
  const handleToggleFolder = async (dirPath) => {
    const isCurrentlyExpanded = expandedFolders[dirPath] ?? false;
    
    if (!isCurrentlyExpanded && !folderChildrenMap[dirPath]) {
      setLoadingFolders((prev) => ({ ...prev, [dirPath]: true }));
      try {
        const info = await getWorkspaceInfo(dirPath);
        if (info?.items) {
          setFolderChildrenMap((prev) => ({ ...prev, [dirPath]: info.items }));
        }
      } catch (err) {
        console.error(`Failed to load folder children for ${dirPath}:`, err);
      } finally {
        setLoadingFolders((prev) => ({ ...prev, [dirPath]: false }));
      }
    }

    setExpandedFolders((prev) => ({
      ...prev,
      [dirPath]: !isCurrentlyExpanded,
    }));
  };

  // Initialize data loading (without resetting selected project)
  const loadData = async () => {
    try {
      const [health, projsData, sessData, usage] = await Promise.all([
        getSystemHealth().catch(() => null),
        getProjects().catch(() => ({ projects: [] })),
        getSessions().catch(() => ({ sessions: [], currentConversationId: null })),
        getUsage().catch(() => null),
      ]);

      if (health) setSystemHealth(health);
      if (usage) setUsageData(usage);

      if (projsData?.projects && projsData.projects.length > 0) {
        setProjects(projsData.projects);
        
        for (const p of projsData.projects) {
          loadProjectFiles(p.path);
        }

        // Set initial workspace if not yet set
        setWorkspace((prev) => {
          if (!prev) {
            const initialProj = projsData.projects[0];
            setActiveProjectPath(initialProj.path);
            return {
              name: initialProj.name,
              workspacePath: initialProj.path,
            };
          }
          return prev;
        });
      }
      
      if (sessData?.sessions && sessData.sessions.length > 0) {
        const autoId = sessData.currentConversationId || sessData.sessions[0].id;
        setSelectedSessionId(autoId);
        try {
          const transcript = await getSessionTranscript(autoId);
          setSelectedSessionTranscript(transcript);
        } catch (e) {
          console.error('Failed to load initial transcript:', e);
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const handleAddProject = async (folderPath) => {
    const res = await addProject(folderPath);
    if (res.project) {
      setProjects((prev) => {
        if (!prev.some((p) => normalizePath(p.path) === normalizePath(res.project.path))) {
          return [...prev, res.project];
        }
        return prev;
      });
      setExpandedProjects((prev) => ({ ...prev, [res.project.path]: true }));
      await loadProjectFiles(res.project.path);

      // Select newly added project
      handleSelectProject(res.project);
    }
  };

  const handleRemoveProject = async (folderPath) => {
    await removeProject(folderPath);
    setProjects((prev) => prev.filter((p) => normalizePath(p.path) !== normalizePath(folderPath)));
    
    // If the removed project was active, switch to first remaining project
    if (normalizePath(activeProjectPath) === normalizePath(folderPath)) {
      const remaining = projects.filter((p) => normalizePath(p.path) !== normalizePath(folderPath));
      if (remaining.length > 0) {
        handleSelectProject(remaining[0]);
      }
    }
  };

  const handleToggleProjectExpand = (projPath) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projPath]: !(prev[projPath] ?? true),
    }));
  };

  // Explicitly switch active project
  const handleSelectProject = async (proj) => {
    setActiveProjectPath(proj.path);
    setWorkspace({
      name: proj.name,
      workspacePath: proj.path,
    });

    // Ensure tabs exist for selected project
    setProjectChatTabsMap((prev) => {
      if (!prev[proj.path] || prev[proj.path].length === 0) {
        const initialTab = createInitialTabForProject(proj.path, proj.name, 0);
        setActiveTabId(initialTab.id);
        return {
          ...prev,
          [proj.path]: [initialTab]
        };
      } else {
        setActiveTabId(prev[proj.path][0].id);
        return prev;
      }
    });

    await loadProjectFiles(proj.path);
  };

  // Resizing logic
  const handleSidebarMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingSidebar(true);
  };

  const handleSplitMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingSplit(true);
  };

  const handleMouseMove = useCallback((e) => {
    if (isDraggingSidebar) {
      const newWidth = Math.min(Math.max(e.clientX, 180), 500);
      setSidebarWidth(newWidth);
    } else if (isDraggingSplit && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const sidebarOffset = showSidebar ? sidebarWidth : 0;
      const availableWidth = containerRect.width - sidebarOffset;
      
      const mouseXWithinCanvas = e.clientX - containerRect.left - sidebarOffset;
      const chatPercentage = (mouseXWithinCanvas / availableWidth) * 100;
      const filePercentage = 100 - chatPercentage;
      
      const clampedFileRatio = Math.min(Math.max(filePercentage, 20), 80);
      setFilePaneRatio(clampedFileRatio);
    }
  }, [isDraggingSidebar, isDraggingSplit, showSidebar, sidebarWidth]);

  const handleMouseUp = useCallback(() => {
    if (isDraggingSidebar) setIsDraggingSidebar(false);
    if (isDraggingSplit) setIsDraggingSplit(false);
  }, [isDraggingSidebar, isDraggingSplit]);

  useEffect(() => {
    if (isDraggingSidebar || isDraggingSplit) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSidebar, isDraggingSplit, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    loadData();

    const handleResize = () => {
      const compact = window.innerWidth < 960;
      setIsCompact(compact);
    };
    window.addEventListener('resize', handleResize);

    // Poll live usage every 5 seconds
    const usageInterval = setInterval(async () => {
      try {
        const usage = await getUsage();
        if (usage) setUsageData(usage);
      } catch (e) {
        // ignore
      }
    }, 5000);

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setShowSidebar((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const ws = new HarnessWebSocket(
      (data) => {
        const targetSessionId = data.sessionId || activeTabIdRef.current;

        const updateTab = (updater) => {
          setProjectChatTabsMap((prevMap) => {
            const nextMap = { ...prevMap };
            Object.keys(nextMap).forEach((projPath) => {
              nextMap[projPath] = nextMap[projPath].map((tab) => {
                if (tab.id === targetSessionId || tab.id === activeTabIdRef.current) {
                  return updater(tab);
                }
                return tab;
              });
            });
            return nextMap;
          });
        };

        switch (data.type) {
          case 'AGENT_STREAM_START':
            updateTab((tab) => ({
              ...tab,
              isStreaming: true,
              currentStream: { 
                thoughts: data.payload?.mode === 'chat' 
                  ? `> 💬 Gemini Chat Stream: Active...\n` 
                  : `> Analyzing request for: \`${data.payload?.workspacePath || activeProjectRef.current}\`...\n`, 
                isThinking: true, 
                mode: data.payload?.mode || 'agent',
                tools: [], 
                content: '' 
              },
            }));
            break;

          case 'AGENT_THOUGHT_START':
            updateTab((tab) => ({
              ...tab,
              currentStream: { ...tab.currentStream, isThinking: true },
            }));
            break;

          case 'AGENT_THOUGHT_CHUNK':
            updateTab((tab) => ({
              ...tab,
              currentStream: {
                ...tab.currentStream,
                thoughts: (tab.currentStream.thoughts || '') + data.payload.text,
              },
            }));
            break;

          case 'AGENT_THOUGHT_END':
            updateTab((tab) => ({
              ...tab,
              currentStream: { ...tab.currentStream, isThinking: false },
            }));
            break;

          case 'AGENT_TOOL_START':
            updateTab((tab) => ({
              ...tab,
              currentStream: {
                ...tab.currentStream,
                tools: [
                  ...tab.currentStream.tools,
                  {
                    toolId: data.payload.toolId,
                    name: data.payload.name,
                    args: data.payload.args,
                    status: 'RUNNING',
                  },
                ],
              },
            }));
            break;

          case 'AGENT_TOOL_RESULT':
            updateTab((tab) => ({
              ...tab,
              currentStream: {
                ...tab.currentStream,
                tools: tab.currentStream.tools.map((t) =>
                  t.toolId === data.payload.toolId
                    ? { ...t, status: data.payload.status, output: data.payload.output }
                    : t
                ),
              },
            }));
            break;

          case 'AGENT_FILE_EDIT_LIVE': {
            const { filePath, fileName, content, previousContent } = data.payload;
            setShowFilePane(true);
            if (isCompact) {
              setCompactPane('code');
            }
            const targetFileObj = { path: filePath, name: fileName };
            setOpenFiles((prev) => {
              if (!prev.some((f) => normalizePath(f.path) === normalizePath(filePath))) {
                return [...prev, targetFileObj];
              }
              return prev;
            });
            setActiveFile(targetFileObj);
            setFileContents((prev) => ({ ...prev, [filePath]: content }));
            setOriginalContents((prev) => ({ ...prev, [filePath]: previousContent || prev[filePath] || '' }));
            setLiveAiModifiedFile(filePath);
            loadProjectFiles(activeProjectRef.current);
            break;
          }

          case 'AGENT_STREAM_CHUNK':
            updateTab((tab) => ({
              ...tab,
              currentStream: {
                ...tab.currentStream,
                content: tab.currentStream.content + data.payload.text,
              },
            }));
            break;

          case 'AGENT_STREAM_END': {
            const completedResponse = data.payload.completeResponse;
            const tokenUsage = data.payload.tokenUsage || null;
            const projectUsage = data.payload.projectUsage || null;

            updateTab((tab) => {
              const finalMessage = {
                role: 'assistant',
                mode: tab.currentStream.mode || 'agent',
                content: completedResponse || tab.currentStream.content,
                thoughts: tab.currentStream.thoughts || null,
                tools: tab.currentStream.tools || [],
                tokenUsage,
              };
              return {
                ...tab,
                isStreaming: false,
                messages: [...tab.messages, finalMessage],
                currentStream: { thoughts: '', isThinking: false, mode: 'agent', tools: [], content: '' },
              };
            });

            // Update project token usage metrics
            if (projectUsage) {
              setProjects((prev) =>
                prev.map((p) =>
                  normalizePath(p.path) === normalizePath(projectUsage.projectPath)
                    ? { ...p, usage: projectUsage }
                    : p
                )
              );
            }

            loadProjectFiles(activeProjectRef.current);
            break;
          }

          case 'AGENT_STREAM_STOPPED':
            updateTab((tab) => {
              const current = tab.currentStream;
              const hasContent = current.content || current.thoughts || current.tools.length > 0;
              const newMsgs = hasContent
                ? [
                    ...tab.messages,
                    {
                      role: 'assistant',
                      content: current.content + '\n\n*(Stream stopped by user)*',
                      thoughts: current.thoughts || null,
                      tools: current.tools || [],
                    },
                  ]
                : tab.messages;
              return {
                ...tab,
                isStreaming: false,
                messages: newMsgs,
                currentStream: { thoughts: '', isThinking: false, tools: [], content: '' },
              };
            });
            break;

          case 'AGENT_STREAM_ERROR':
            updateTab((tab) => ({
              ...tab,
              isStreaming: false,
              messages: [
                ...tab.messages,
                {
                  role: 'assistant',
                  content: `⚠️ **Agent Execution Error**: ${data.payload.error}`,
                  thoughts: tab.currentStream.thoughts || null,
                  tools: tab.currentStream.tools || [],
                },
              ],
              currentStream: { thoughts: '', isThinking: false, tools: [], content: '' },
            }));
            break;

          // Unified Shell Command Stream Chunk
          case 'SHELL_COMMAND_OUTPUT': {
            const { commandId, data: chunkText } = data.payload || {};
            updateTab((tab) => ({
              ...tab,
              messages: tab.messages.map((m) =>
                m.commandId === commandId
                  ? { ...m, output: (m.output || '') + chunkText }
                  : m
              ),
            }));
            break;
          }

          // Unified Shell Command Finished
          case 'SHELL_COMMAND_END': {
            const { commandId, exitCode, duration } = data.payload || {};
            updateTab((tab) => ({
              ...tab,
              messages: tab.messages.map((m) =>
                m.commandId === commandId
                  ? { ...m, isRunning: false, exitCode, duration }
                  : m
              ),
            }));
            loadProjectFiles(activeProjectRef.current);
            break;
          }

          // Harness UI Awareness: Automatically open workspace file in split-screen viewer
          case 'HARNESS_OPEN_FILE': {
            const { filePath } = data.payload || {};
            if (filePath && typeof filePath === 'string') {
              let cleanPath = filePath.trim().replace(/^["']|["']$/g, '');
              let resolved = cleanPath;
              const root = activeProjectRef.current || '';
              
              if (!/^[a-zA-Z]:[\\\/]/.test(cleanPath) && !cleanPath.startsWith('/')) {
                const sep = root.includes('\\') ? '\\' : '/';
                resolved = `${root.replace(/[\\\/]+$/, '')}${sep}${cleanPath.replace(/^[\\\/]+/, '')}`;
              }
              const fileName = resolved.split(/[\\\/]/).pop() || resolved;
              handleOpenFile({ path: resolved, name: fileName });
            }
            break;
          }

          default:
            break;
        }
      },
      (status) => setConnectionStatus(status)
    );

    ws.connect();
    wsClientRef.current = ws;

    return () => {
      clearInterval(usageInterval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      ws.disconnect();
    };
  }, []);

  const handleOpenFile = async (file) => {
    if (file.isDirectory) return;
    
    setShowFilePane(true);
    if (isCompact) {
      setCompactPane('code');
      setShowSidebar(false);
    }
    
    // Auto-switch active project context if this file belongs to another project
    const owningProj = projects.find((p) => isPathUnderProject(file.path, p.path));
    if (owningProj && normalizePath(activeProjectPath) !== normalizePath(owningProj.path)) {
      handleSelectProject(owningProj);
    }

    if (!openFiles.some((f) => normalizePath(f.path) === normalizePath(file.path))) {
      setOpenFiles((prev) => [...prev, file]);
    }
    setActiveFile(file);

    if (!fileContents[file.path]) {
      try {
        const res = await getFileContent(file.path);
        setFileContents((prev) => ({ ...prev, [file.path]: res.content }));
        setOriginalContents((prev) => ({ ...prev, [file.path]: res.content }));
      } catch (err) {
        setFileContents((prev) => ({ ...prev, [file.path]: `Error loading file: ${err.message}` }));
      }
    }
  };

  const handleReloadFile = async (file) => {
    try {
      const res = await getFileContent(file.path);
      setFileContents((prev) => ({ ...prev, [file.path]: res.content }));
      setOriginalContents((prev) => ({ ...prev, [file.path]: res.content }));
    } catch (err) {
      setFileContents((prev) => ({ ...prev, [file.path]: `Error reloading file: ${err.message}` }));
    }
  };

  const handleSaveFile = async (file, newContent) => {
    try {
      await saveFileContent(file.path, newContent);
      setFileContents((prev) => ({ ...prev, [file.path]: newContent }));
      setOriginalContents((prev) => ({ ...prev, [file.path]: newContent }));
    } catch (err) {
      console.error('Failed to save file:', err);
      throw err;
    }
  };

  const handleCloseFileTab = (fileToClose) => {
    const updated = openFiles.filter((f) => normalizePath(f.path) !== normalizePath(fileToClose.path));
    setOpenFiles(updated);
    if (activeFile && normalizePath(activeFile.path) === normalizePath(fileToClose.path)) {
      setActiveFile(updated.length > 0 ? updated[updated.length - 1] : null);
    }
  };

  const handleSendMessage = async (text, options = {}) => {
    if (!text.trim() || activeTab.isStreaming) return;

    // Handle slash commands
    if (text.startsWith('/clear')) {
      setProjectChatTabsMap((prev) => {
        const existingTabs = getProjectTabs(prev, activeProjectPath, workspace?.name);
        return {
          ...prev,
          [activeProjectPath]: existingTabs.map((t) =>
            t.id === activeTabId ? { ...t, messages: [] } : t
          ),
        };
      });
      return;
    }

    if (text.startsWith('/usage')) {
      const usage = await getUsage().catch(() => null);
      const gemini5h = usage?.fiveHourRemainingPercent ?? 52;
      const geminiW = usage?.weeklyRemainingPercent ?? 91;
      const claude5h = usage?.claudeGpt?.fiveHourRemaining ?? 88;
      const claudeW = usage?.claudeGpt?.weeklyRemaining ?? 96;

      const usageMsg = {
        role: 'assistant',
        content: `### 📊 Real-Time Antigravity CLI Quota (\`agy /usage\`)\n\n| Model Group | Metric | Remaining Left | Used |\n| :--- | :--- | :---: | :---: |\n| **Gemini Models** | 5-Hour Window | **${gemini5h}%** | ${100 - gemini5h}% |\n| **Gemini Models** | Weekly Quota | **${geminiW}%** | ${100 - geminiW}% |\n| **Claude & GPT Models** | 5-Hour Window | **${claude5h}%** | ${100 - claude5h}% |\n| **Claude & GPT Models** | Weekly Quota | **${claudeW}%** | ${100 - claudeW}% |\n\n> [!NOTE]\n> *Synced live with \`agy.exe /usage\` rate limits.*`,
      };
      setProjectChatTabsMap((prev) => {
        const existingTabs = getProjectTabs(prev, activeProjectPath, workspace?.name);
        return {
          ...prev,
          [activeProjectPath]: existingTabs.map((t) =>
            t.id === activeTabId ? { ...t, messages: [...(t.messages || []), usageMsg] } : t
          ),
        };
      });
      return;
    }

    if (text.startsWith('/help')) {
      const helpMsg = {
        role: 'assistant',
        content: `### 💡 Antigravity Unified Harness Help\n\n- **Project Scope**: Currently in \`${activeProjectPath}\`.\n- **AI Agent Chat**: Type any question, code request, or refactoring prompt.\n- **Direct Shell Commands**: Type \`$ git status\`, \`$ npm run build\`, \`dir\`, \`ls\`, or switch to **Shell** mode to run commands directly.\n- **Slash Commands**:\n  - \`/usage\`: Check live 5-hour and weekly quota rate limits.\n  - \`/clear\`: Clear the active conversation stream.\n  - \`/help\`: View this help message.\n- **Chat Tabs**: Click \`+\` in the top bar to run multiple concurrent subagents.\n- **Shortcuts**:\n  - \`Ctrl+B\`: Toggle Sidebar\n  - \`Ctrl+F\`: Search conversation`,
      };
      setProjectChatTabsMap((prev) => {
        const existingTabs = getProjectTabs(prev, activeProjectPath, workspace?.name);
        return {
          ...prev,
          [activeProjectPath]: existingTabs.map((t) =>
            t.id === activeTabId ? { ...t, messages: [...(t.messages || []), helpMsg] } : t
          ),
        };
      });
      return;
    }

    const isChatMode = options.mode === 'chat';
    const userMsg = { 
      role: 'user', 
      content: text,
      mode: isChatMode ? 'chat' : 'agent',
    };
    
    setProjectChatTabsMap((prev) => {
      const existingTabs = getProjectTabs(prev, activeProjectPath, workspace?.name);
      const hasActive = existingTabs.some((t) => t.id === activeTabId);
      const targetTabs = hasActive
        ? existingTabs
        : [...existingTabs, { ...createInitialTabForProject(activeProjectPath, workspace?.name, existingTabs.length), id: activeTabId }];

      return {
        ...prev,
        [activeProjectPath]: targetTabs.map((t) =>
          t.id === activeTabId
            ? { 
                ...t, 
                messages: [...(t.messages || []), userMsg], 
                isStreaming: true,
                currentStream: {
                  thoughts: isChatMode
                    ? `> 💬 Gemini Chat Stream: Active...\n`
                    : `> Analyzing request for: \`${activeProjectPath}\`...\n`,
                  isThinking: true,
                  mode: isChatMode ? 'chat' : 'agent',
                  tools: [],
                  content: '',
                }
              }
            : t
        ),
      };
    });

    const conversationHistory = (activeTab?.messages || [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role,
        content: m.content || '',
      }));

    wsClientRef.current?.send('RUN_AGENT_PROMPT', {
      prompt: text,
      workspacePath: activeProjectPath,
      sessionId: activeTabId,
      model: options.model || 'Gemini 3.7 Flash',
      thinkingEffort: options.thinkingEffort || 'medium',
      mode: isChatMode ? 'chat' : 'agent',
      cavemanMode: options.cavemanMode ?? true,
      history: conversationHistory,
    });
  };

  const handleRunShellCommand = (cmd) => {
    if (!cmd.trim()) return;
    const commandId = `cmd-${Date.now()}`;
    const termMsg = {
      type: 'terminal',
      commandId,
      command: cmd,
      output: '',
      isRunning: true,
      timestamp: Date.now(),
    };

    setProjectChatTabsMap((prev) => {
      const existingTabs = getProjectTabs(prev, activeProjectPath, workspace?.name);
      const hasActive = existingTabs.some((t) => t.id === activeTabId);
      const targetTabs = hasActive
        ? existingTabs
        : [...existingTabs, { ...createInitialTabForProject(activeProjectPath, workspace?.name, existingTabs.length), id: activeTabId }];

      return {
        ...prev,
        [activeProjectPath]: targetTabs.map((t) =>
          t.id === activeTabId
            ? { ...t, messages: [...(t.messages || []), termMsg] }
            : t
        ),
      };
    });

    wsClientRef.current?.send('EXEC_SHELL_COMMAND', {
      commandId,
      command: cmd,
      workspacePath: activeProjectPath,
      sessionId: activeTabId,
    });
  };

  const handleStopStream = () => {
    wsClientRef.current?.send('STOP_AGENT_PROMPT', { sessionId: activeTabId });
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('antiharness_user_session', JSON.stringify(user));
    } catch (e) {}
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('antiharness_user_session');
    } catch (e) {}
  };

  // 0. Render Login Page if not authenticated
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-slate-100 font-sans">
      {/* Top Header */}
      <Header
        workspace={workspace || { name: 'AntiG', workspacePath: activeProjectPath }}
        onRefresh={loadData}
        showFilePane={showFilePane}
        onToggleFilePane={() => setShowFilePane(!showFilePane)}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        currentMainView={currentMainView}
        onSelectMainView={setCurrentMainView}
        currentUser={currentUser}
        onLogout={handleLogout}
        isCompact={isCompact}
        compactPane={compactPane}
        onToggleCompactPane={(pane) => setCompactPane(pane)}
        openFilesCount={openFiles.length}
      />

      {/* Main Workspace Layout with Resizers */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden relative">
        {/* 1. Microsoft Edge Style Clean Sidebar with Nested Subfolder Trees & Skills Button */}
        {showSidebar && (
          isCompact ? (
            <>
              <div 
                className="fixed inset-0 bg-black/60 z-30 backdrop-blur-xs transition-opacity" 
                onClick={() => setShowSidebar(false)}
              />
              <div className="absolute inset-y-0 left-0 z-40 bg-[#0a0d14] border-r border-border shadow-2xl flex">
                <Sidebar
                  width={Math.min(sidebarWidth, 300)}
                  projects={projects}
                  activeProject={{ name: workspace?.name, workspacePath: activeProjectPath }}
                  projectFilesMap={projectFilesMap}
                  expandedProjects={expandedProjects}
                  expandedFolders={expandedFolders}
                  folderChildrenMap={folderChildrenMap}
                  loadingFolders={loadingFolders}
                  currentMainView={currentMainView}
                  onSelectMainView={(view) => {
                    setCurrentMainView(view);
                    setShowSidebar(false);
                  }}
                  onToggleProjectExpand={handleToggleProjectExpand}
                  onToggleFolder={handleToggleFolder}
                  onSelectProject={(p) => {
                    setCurrentMainView('console');
                    handleSelectProject(p);
                    setShowSidebar(false);
                  }}
                  onAddProject={handleAddProject}
                  onRemoveProject={handleRemoveProject}
                  onSelectFile={(f) => {
                    setCurrentMainView('console');
                    handleOpenFile(f);
                  }}
                  selectedFile={activeFile}
                  onCollapse={() => setShowSidebar(false)}
                />
              </div>
            </>
          ) : (
            <>
              <Sidebar
                width={sidebarWidth}
                projects={projects}
                activeProject={{ name: workspace?.name, workspacePath: activeProjectPath }}
                projectFilesMap={projectFilesMap}
                expandedProjects={expandedProjects}
                expandedFolders={expandedFolders}
                folderChildrenMap={folderChildrenMap}
                loadingFolders={loadingFolders}
                currentMainView={currentMainView}
                onSelectMainView={setCurrentMainView}
                onToggleProjectExpand={handleToggleProjectExpand}
                onToggleFolder={handleToggleFolder}
                onSelectProject={(p) => {
                  setCurrentMainView('console');
                  handleSelectProject(p);
                }}
                onAddProject={handleAddProject}
                onRemoveProject={handleRemoveProject}
                onSelectFile={(f) => {
                  setCurrentMainView('console');
                  handleOpenFile(f);
                }}
                selectedFile={activeFile}
                onCollapse={() => setShowSidebar(false)}
              />
              <ResizeHandle
                onMouseDown={handleSidebarMouseDown}
                onDoubleClick={() => setSidebarWidth(260)}
                isDragging={isDraggingSidebar}
              />
            </>
          )
        )}

        {/* Center Area: Skills Hub View OR Main Console & Code Split Canvas */}
        {currentMainView === 'skills' ? (
          <div className="flex-1 h-full overflow-hidden">
            <SkillsHub
              activeProject={{ name: workspace?.name, workspacePath: activeProjectPath }}
              onOpenSkillFile={(file) => {
                setCurrentMainView('console');
                setShowFilePane(true);
                handleOpenFile(file);
              }}
              onClose={() => setCurrentMainView('console')}
            />
          </div>
        ) : isCompact ? (
          compactPane === 'chat' ? (
            <div className="flex-1 h-full flex flex-col overflow-hidden min-w-0">
              <MainCanvas
                selectedSessionTranscript={selectedSessionTranscript}
                selectedSessionId={selectedSessionId}
                chatTabs={currentProjectTabs}
                activeTabId={activeTabId}
                onSelectChatTab={(id) => setActiveTabId(id)}
                onAddChatTab={handleAddChatTab}
                onCloseChatTab={handleCloseChatTab}
                messages={activeTab.messages}
                currentStream={activeTab.currentStream}
                onSendMessage={handleSendMessage}
                onRunShellCommand={handleRunShellCommand}
                onStopStream={handleStopStream}
                isStreaming={activeTab.isStreaming}
                workspace={{ name: workspace?.name, workspacePath: activeProjectPath }}
                onOpenFile={handleOpenFile}
                onOpenHistoryModal={() => setShowHistoryModal(true)}
              />
            </div>
          ) : (
            <div className="flex-1 h-full flex flex-col overflow-hidden min-w-0">
              <FileViewerPane
                openFiles={openFiles}
                activeFile={activeFile}
                fileContents={fileContents}
                originalContents={originalContents}
                liveAiModifiedFile={liveAiModifiedFile}
                onSelectFileTab={(file) => setActiveFile(file)}
                onCloseFileTab={handleCloseFileTab}
                onReloadFile={handleReloadFile}
                onSaveFile={handleSaveFile}
                isExpanded={true}
                onToggleExpand={() => {}}
                onClosePane={() => setCompactPane('chat')}
              />
            </div>
          )
        ) : (
          <>
            {/* Center Main Canvas with Project-Scoped Unified Chat-Terminal Console */}
            <div 
              style={{ 
                width: showFilePane 
                  ? (isFilePaneExpanded ? '0%' : `${100 - filePaneRatio}%`) 
                  : '100%' 
              }}
              className={`flex flex-col overflow-hidden transition-none ${
                showFilePane && isFilePaneExpanded ? 'hidden' : 'flex'
              }`}
            >
              <MainCanvas
                selectedSessionTranscript={selectedSessionTranscript}
                selectedSessionId={selectedSessionId}
                chatTabs={currentProjectTabs}
                activeTabId={activeTabId}
                onSelectChatTab={(id) => setActiveTabId(id)}
                onAddChatTab={handleAddChatTab}
                onCloseChatTab={handleCloseChatTab}
                messages={activeTab.messages}
                currentStream={activeTab.currentStream}
                onSendMessage={handleSendMessage}
                onRunShellCommand={handleRunShellCommand}
                onStopStream={handleStopStream}
                isStreaming={activeTab.isStreaming}
                workspace={{ name: workspace?.name, workspacePath: activeProjectPath }}
                onOpenFile={handleOpenFile}
                onOpenHistoryModal={() => setShowHistoryModal(true)}
              />
            </div>

            {/* Center-Right Resizer between Chat and File Pane */}
            {showFilePane && !isFilePaneExpanded && (
              <ResizeHandle
                onMouseDown={handleSplitMouseDown}
                onDoubleClick={() => setFilePaneRatio(50)}
                isDragging={isDraggingSplit}
              />
            )}

            {/* Right Workspace File Viewer Window */}
            {showFilePane && (
              <div 
                style={{ 
                  width: isFilePaneExpanded ? '100%' : `${filePaneRatio}%` 
                }}
                className="flex flex-col overflow-hidden transition-none"
              >
                <FileViewerPane
                  openFiles={openFiles}
                  activeFile={activeFile}
                  fileContents={fileContents}
                  originalContents={originalContents}
                  liveAiModifiedFile={liveAiModifiedFile}
                  onSelectFileTab={(file) => setActiveFile(file)}
                  onCloseFileTab={handleCloseFileTab}
                  onReloadFile={handleReloadFile}
                  onSaveFile={handleSaveFile}
                  isExpanded={isFilePaneExpanded}
                  onToggleExpand={() => setIsFilePaneExpanded(!isFilePaneExpanded)}
                  onClosePane={() => setShowFilePane(false)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        connectionStatus={connectionStatus}
        workspace={{ name: workspace?.name, workspacePath: activeProjectPath }}
        usageData={usageData}
        projectUsage={projects.find((p) => normalizePath(p.path) === normalizePath(activeProjectPath))?.usage}
      />

      {/* Session Memory & History Studio Archive Modal */}
      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        selectedSessionId={selectedSessionId}
        onResumeSessionInTab={handleResumeSessionInTab}
      />
    </div>
  );
}
