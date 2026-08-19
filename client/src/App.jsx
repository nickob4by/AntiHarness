import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainCanvas from './components/MainCanvas';
import FileViewerPane from './components/FileViewerPane';
import ResizeHandle from './components/ResizeHandle';
import StatusBar from './components/StatusBar';
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

export default function App() {
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [systemHealth, setSystemHealth] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [usageData, setUsageData] = useState(null);

  // Projects & Nested folder tree state
  const [projects, setProjects] = useState([]);
  const [projectFilesMap, setProjectFilesMap] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});
  const [folderChildrenMap, setFolderChildrenMap] = useState({});
  const [loadingFolders, setLoadingFolders] = useState({});

  // Layout toggles & Resizable widths
  const [showSidebar, setShowSidebar] = useState(true);
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

  // Multi-Agent Chat Tabs state
  const [chatTabs, setChatTabs] = useState([
    {
      id: 'agent-main',
      title: 'Main Agent',
      messages: [
        {
          role: 'assistant',
          content: 'Welcome to **Antigravity Unified Harness**!\n\n- **Unified Chat-Terminal**: Run shell commands directly ($ git status, npm run build) or ask AI coding questions.\n- **Chat Tabs**: Run multiple agents and subagents concurrently.\n- **Bottom Controls**: Switch models and thinking efforts at the bottom of the chat.\n- **Multi-Window**: Chat on the left and review files on the right.',
        }
      ],
      isStreaming: false,
      currentStream: {
        thoughts: '',
        isThinking: false,
        tools: [],
        content: '',
      },
    },
  ]);
  const [activeTabId, setActiveTabId] = useState('agent-main');

  const wsClientRef = useRef(null);
  const containerRef = useRef(null);

  // Active chat tab
  const activeTab = chatTabs.find((t) => t.id === activeTabId) || chatTabs[0];

  const handleAddChatTab = () => {
    const newId = `agent-${Date.now()}`;
    const newTab = {
      id: newId,
      title: `Subagent #${chatTabs.length}`,
      messages: [
        {
          role: 'assistant',
          content: `Subagent #${chatTabs.length} is deployed. You can run tasks or shell commands here independently while other agents work concurrently!`,
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
    setChatTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseChatTab = (tabId) => {
    if (chatTabs.length <= 1) return;
    const filtered = chatTabs.filter((t) => t.id !== tabId);
    setChatTabs(filtered);
    if (activeTabId === tabId) {
      setActiveTabId(filtered[filtered.length - 1].id);
    }
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

  // Initialize data loading
  const loadData = async () => {
    try {
      const [health, projsData, wsInfo, sessData, usage] = await Promise.all([
        getSystemHealth().catch(() => null),
        getProjects().catch(() => ({ projects: [] })),
        getWorkspaceInfo().catch(() => null),
        getSessions().catch(() => ({ sessions: [], currentConversationId: null })),
        getUsage().catch(() => null),
      ]);

      if (health) setSystemHealth(health);
      if (usage) setUsageData(usage);

      if (projsData?.projects) {
        setProjects(projsData.projects);
        for (const p of projsData.projects) {
          loadProjectFiles(p.path);
        }
      }

      if (wsInfo) {
        setWorkspace(wsInfo);
        const pkg = wsInfo.items?.find((i) => i.name === 'package.json');
        if (pkg && openFiles.length === 0) {
          handleOpenFile(pkg);
        }
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
        if (!prev.some((p) => p.path === res.project.path)) {
          return [...prev, res.project];
        }
        return prev;
      });
      setExpandedProjects((prev) => ({ ...prev, [res.project.path]: true }));
      await loadProjectFiles(res.project.path);
    }
  };

  const handleRemoveProject = async (folderPath) => {
    await removeProject(folderPath);
    setProjects((prev) => prev.filter((p) => p.path !== folderPath));
  };

  const handleToggleProjectExpand = (projPath) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projPath]: !(prev[projPath] ?? true),
    }));
  };

  const handleSelectProject = async (proj) => {
    const info = await loadProjectFiles(proj.path);
    if (info) {
      setWorkspace(info);
    }
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
        const targetSessionId = data.sessionId || activeTabId;

        const updateTab = (updater) => {
          setChatTabs((prevTabs) =>
            prevTabs.map((tab) => {
              if (tab.id === targetSessionId || tab.id === activeTabId) {
                return updater(tab);
              }
              return tab;
            })
          );
        };

        switch (data.type) {
          case 'AGENT_STREAM_START':
            updateTab((tab) => ({
              ...tab,
              isStreaming: true,
              currentStream: { thoughts: '', isThinking: false, tools: [], content: '' },
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
                thoughts: tab.currentStream.thoughts + data.payload.text,
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
            const targetFileObj = { path: filePath, name: fileName };
            setOpenFiles((prev) => {
              if (!prev.some((f) => f.path === filePath)) {
                return [...prev, targetFileObj];
              }
              return prev;
            });
            setActiveFile(targetFileObj);
            setFileContents((prev) => ({ ...prev, [filePath]: content }));
            setOriginalContents((prev) => ({ ...prev, [filePath]: previousContent || prev[filePath] || '' }));
            setLiveAiModifiedFile(filePath);
            loadData();
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
            updateTab((tab) => {
              const finalMessage = {
                role: 'assistant',
                content: completedResponse || tab.currentStream.content,
                thoughts: tab.currentStream.thoughts || null,
                tools: tab.currentStream.tools || [],
              };
              return {
                ...tab,
                isStreaming: false,
                messages: [...tab.messages, finalMessage],
                currentStream: { thoughts: '', isThinking: false, tools: [], content: '' },
              };
            });
            loadData();
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
      window.removeEventListener('keydown', handleKeyDown);
      ws.disconnect();
    };
  }, [activeTabId]);

  const handleOpenFile = async (file) => {
    if (file.isDirectory) return;
    
    setShowFilePane(true);
    
    if (!openFiles.some((f) => f.path === file.path)) {
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
    const updated = openFiles.filter((f) => f.path !== fileToClose.path);
    setOpenFiles(updated);
    if (activeFile?.path === fileToClose.path) {
      setActiveFile(updated.length > 0 ? updated[updated.length - 1] : null);
    }
  };

  const handleSendMessage = async (text, options = {}) => {
    if (!text.trim() || activeTab.isStreaming) return;

    // Handle slash commands
    if (text.startsWith('/clear')) {
      setChatTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, messages: [] } : t))
      );
      return;
    }

    if (text.startsWith('/usage')) {
      const usage = await getUsage().catch(() => null);
      const usageMsg = {
        role: 'assistant',
        content: `### 📊 CLI Quota & Rate Limit Breakdown\n\n- **Formatted Status**: \`${usage?.formatted || 'Usage: 38%/5h 90%/W'}\`\n- **5-Hour Rolling Window**: **${usage?.fiveHourUsagePercent ?? 38}%** used (${usage?.fiveHourRemainingPercent ?? 62}% remaining)\n- **Weekly Quota Window**: **${usage?.weeklyUsagePercent ?? 90}%** used (${usage?.weeklyRemainingPercent ?? 10}% remaining)\n\n*Synced directly with Antigravity system rate limits.*`,
      };
      setChatTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, messages: [...t.messages, usageMsg] } : t))
      );
      return;
    }

    if (text.startsWith('/help')) {
      const helpMsg = {
        role: 'assistant',
        content: `### 💡 Antigravity Unified Harness Help\n\n- **AI Agent Chat**: Type any question, code request, or refactoring prompt.\n- **Direct Shell Commands**: Type \`$ git status\`, \`$ npm run build\`, \`dir\`, \`ls\`, or switch to **Shell** mode to run commands directly.\n- **Slash Commands**:\n  - \`/usage\`: Check live 5-hour and weekly quota rate limits.\n  - \`/clear\`: Clear the active conversation stream.\n  - \`/help\`: View this help message.\n- **Chat Tabs**: Click \`+\` in the top bar to run multiple concurrent subagents.\n- **Shortcuts**:\n  - \`Ctrl+B\`: Toggle Sidebar\n  - \`Ctrl+F\`: Search conversation`,
      };
      setChatTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, messages: [...t.messages, helpMsg] } : t))
      );
      return;
    }

    const userMsg = { role: 'user', content: text };
    setChatTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? { ...t, messages: [...t.messages, userMsg], isStreaming: true }
          : t
      )
    );

    wsClientRef.current?.send('RUN_AGENT_PROMPT', {
      prompt: text,
      workspacePath: workspace?.workspacePath || 'D:\\AntiG',
      sessionId: activeTabId,
      model: options.model || 'Gemini 3.7 Flash',
      thinkingEffort: options.thinkingEffort || 'medium',
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

    setChatTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? { ...t, messages: [...t.messages, termMsg] }
          : t
      )
    );

    wsClientRef.current?.send('EXEC_SHELL_COMMAND', {
      commandId,
      command: cmd,
      workspacePath: workspace?.workspacePath || 'D:\\AntiG',
      sessionId: activeTabId,
    });
  };

  const handleStopStream = () => {
    wsClientRef.current?.send('STOP_AGENT_PROMPT', { sessionId: activeTabId });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-slate-100 font-sans">
      {/* Top Header */}
      <Header
        workspace={workspace}
        onRefresh={loadData}
        showFilePane={showFilePane}
        onToggleFilePane={() => setShowFilePane(!showFilePane)}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
      />

      {/* Main Workspace Layout with Resizers */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden relative">
        {/* 1. Microsoft Edge Style Clean Sidebar with Nested Subfolder Trees */}
        {showSidebar && (
          <>
            <Sidebar
              width={sidebarWidth}
              projects={projects}
              activeProject={workspace}
              projectFilesMap={projectFilesMap}
              expandedProjects={expandedProjects}
              expandedFolders={expandedFolders}
              folderChildrenMap={folderChildrenMap}
              loadingFolders={loadingFolders}
              onToggleProjectExpand={handleToggleProjectExpand}
              onToggleFolder={handleToggleFolder}
              onSelectProject={handleSelectProject}
              onAddProject={handleAddProject}
              onRemoveProject={handleRemoveProject}
              onSelectFile={handleOpenFile}
              selectedFile={activeFile}
              onCollapse={() => setShowSidebar(false)}
            />
            <ResizeHandle
              onMouseDown={handleSidebarMouseDown}
              onDoubleClick={() => setSidebarWidth(260)}
              isDragging={isDraggingSidebar}
            />
          </>
        )}

        {/* 2. Center Main Canvas with Unified Chat-Terminal Console */}
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
            chatTabs={chatTabs}
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
            workspace={workspace}
          />
        </div>

        {/* 3. Center-Right Resizer between Chat and File Pane */}
        {showFilePane && !isFilePaneExpanded && (
          <ResizeHandle
            onMouseDown={handleSplitMouseDown}
            onDoubleClick={() => setFilePaneRatio(50)}
            isDragging={isDraggingSplit}
          />
        )}

        {/* 4. Right Workspace File Viewer Window */}
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
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        connectionStatus={connectionStatus}
        workspace={workspace}
        usageData={usageData}
      />
    </div>
  );
}
