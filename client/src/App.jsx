import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainCanvas from './components/MainCanvas';
import FileViewerPane from './components/FileViewerPane';
import ResizeHandle from './components/ResizeHandle';
import StatusBar from './components/StatusBar';
import { 
  getSystemHealth, 
  getProjects,
  addProject,
  removeProject,
  getWorkspaceInfo, 
  getFileContent, 
  getSessions, 
  getSessionTranscript 
} from './services/api';
import { HarnessWebSocket } from './services/websocket';

export default function App() {
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  
  const [systemHealth, setSystemHealth] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  
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
  const [liveAiModifiedFile, setLiveAiModifiedFile] = useState(null);
  
  // Sessions & Trajectory history
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedSessionTranscript, setSelectedSessionTranscript] = useState(null);

  // Chat and Streaming state
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Welcome to **Antigravity Localhost Harness**!\n\n- **Model Selector**: Switch models and adjust thinking effort anytime directly in the chat header.\n- **Multi-Window**: Chat on the left and review files on the right.\n- **Toggle Views**: Collapse panes or the sidebar anytime for maximum focus.',
    }
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStream, setCurrentStream] = useState({
    thoughts: '',
    isThinking: false,
    tools: [],
    content: '',
  });

  const wsClientRef = useRef(null);
  const containerRef = useRef(null);

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

  const [usageData, setUsageData] = useState(null);

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

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setShowSidebar((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const ws = new HarnessWebSocket(
      (data) => {
        switch (data.type) {
          case 'AGENT_STREAM_START':
            setIsStreaming(true);
            setCurrentStream({
              thoughts: '',
              isThinking: false,
              tools: [],
              content: '',
            });
            break;

          case 'AGENT_THOUGHT_START':
            setCurrentStream((prev) => ({ ...prev, isThinking: true }));
            break;

          case 'AGENT_THOUGHT_CHUNK':
            setCurrentStream((prev) => ({
              ...prev,
              thoughts: prev.thoughts + data.payload.text,
            }));
            break;

          case 'AGENT_THOUGHT_END':
            setCurrentStream((prev) => ({ ...prev, isThinking: false }));
            break;

          case 'AGENT_TOOL_START':
            setCurrentStream((prev) => ({
              ...prev,
              tools: [
                ...prev.tools,
                {
                  toolId: data.payload.toolId,
                  name: data.payload.name,
                  args: data.payload.args,
                  status: 'RUNNING',
                },
              ],
            }));
            break;

          case 'AGENT_TOOL_RESULT':
            setCurrentStream((prev) => ({
              ...prev,
              tools: prev.tools.map((t) =>
                t.toolId === data.payload.toolId
                  ? { ...t, status: data.payload.status, output: data.payload.output }
                  : t
              ),
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
            setCurrentStream((prev) => ({
              ...prev,
              content: prev.content + data.payload.text,
            }));
            break;

          case 'AGENT_STREAM_END': {
            const completedResponse = data.payload.completeResponse;
            setCurrentStream((prev) => {
              const finalMessage = {
                role: 'assistant',
                content: completedResponse || prev.content,
                thoughts: prev.thoughts || null,
                tools: prev.tools || [],
              };
              setMessages((prevMsgs) => [...prevMsgs, finalMessage]);
              return { thoughts: '', isThinking: false, tools: [], content: '' };
            });
            setIsStreaming(false);
            loadData();
            break;
          }

          case 'AGENT_STREAM_STOPPED':
            setCurrentStream((prev) => {
              if (prev.content || prev.thoughts || prev.tools.length > 0) {
                const interruptedMessage = {
                  role: 'assistant',
                  content: prev.content + '\n\n*(Stream stopped by user)*',
                  thoughts: prev.thoughts || null,
                  tools: prev.tools || [],
                };
                setMessages((prevMsgs) => [...prevMsgs, interruptedMessage]);
              }
              return { thoughts: '', isThinking: false, tools: [], content: '' };
            });
            setIsStreaming(false);
            break;

          case 'AGENT_STREAM_ERROR':
            setCurrentStream((prev) => {
              const errorMessage = {
                role: 'assistant',
                content: `⚠️ **Agent Execution Error**: ${data.payload.error}`,
                thoughts: prev.thoughts || null,
                tools: prev.tools || [],
              };
              setMessages((prevMsgs) => [...prevMsgs, errorMessage]);
              return { thoughts: '', isThinking: false, tools: [], content: '' };
            });
            setIsStreaming(false);
            break;

          default:
            break;
        }
      },
      (status) => setConnectionStatus(status)
    );

    ws.connect();
    wsClientRef.current = ws;

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      ws.disconnect();
    };
  }, []);

  const [originalContents, setOriginalContents] = useState({});

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

  const handleSendMessage = (text, options = {}) => {
    if (!text.trim() || isStreaming) return;

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    wsClientRef.current?.send('RUN_AGENT_PROMPT', {
      prompt: text,
      workspacePath: workspace?.workspacePath || 'D:\\AntiG',
      sessionId: selectedSessionId || `session-${Date.now()}`,
      model: options.model || 'Gemini 3.7 Flash',
      thinkingEffort: options.thinkingEffort || 'medium',
    });
  };

  const handleStopStream = () => {
    wsClientRef.current?.send('STOP_AGENT_PROMPT', {});
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

        {/* 2. Center Main Canvas (Chat + Model Selector + History Summary) */}
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
            messages={messages}
            currentStream={currentStream}
            onSendMessage={handleSendMessage}
            onStopStream={handleStopStream}
            isStreaming={isStreaming}
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
