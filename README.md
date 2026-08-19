# 🚀 AntiHarness

> A modern, sleek Localhost Harness and Web GUI for **Google Antigravity (AGY)** development.

![AntiHarness](https://img.shields.io/badge/Antigravity-Localhost%20Harness-6366f1?style=for-the-badge)
![React](https://img.shields.io/badge/React%2019-Vite-61dafb?style=for-the-badge)
![Express](https://img.shields.io/badge/Node.js-Express%20%2B%20WS-339933?style=for-the-badge)
![Tailwind](https://img.shields.io/badge/TailwindCSS-JetBrains%20Mono-38bdf8?style=for-the-badge)

---

## 🌟 Key Features

- **Multi-Window Layout**: Chat with Antigravity on the left while simultaneously reading and inspecting workspace files in the right pane.
- **Draggable & Resizable Panes**: Adjust sidebar width and split ratios between chat and file viewer with smooth mouse drag handles.
- **Edge-Style Project Manager**: Collapsible project accordions with deep nested subfolder navigation.
- **Visual Folder Picker**: Browse drives (`C:\`, `D:\`, `Home`) and pick project directories directly through a visual dialog.
- **Unified Linux Monospace Aesthetic**: Crisp JetBrains Mono typography across the entire interface.
- **Real-Time Streaming Engine**: Live token streaming, chain-of-thought collapsible drawers, and structured tool invocation cards.
- **Inline History Summary**: Clean, bullet-point summary of prompts, file modifications, tool calls, and milestone actions with timestamps.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, React-Markdown, Remark-GFM
- **Backend**: Node.js, Express, WebSocket (`ws`)
- **Typography**: JetBrains Mono

---

## ⚡ Quick Start & 1-Click Update

### 1. Initial Setup
```bash
npm run install:all
```

### 2. Start Localhost Harness
```bash
npm run dev
```

- **Web GUI**: `http://localhost:5180`
- **Backend Gateway**: `http://localhost:3001`

---

### 🔄 1-Click Update (Sync Latest Version Across Computers)
If you already have AntiHarness cloned on another computer, you can update everything with a single command:

#### Via Terminal:
```bash
npm run update
```

#### Via Windows Batch / PowerShell:
```cmd
.\update.bat
# or
.\update.ps1
```

#### Via Linux / macOS:
```bash
./update.sh
```

---

## 🌟 Key Features

- **🗺️ Codebase Cartographer (Graphify Engine)**: Pre-computes dense AST cartography maps and multi-tier Mermaid architecture diagrams, saving up to **95% of discovery tokens** on session start.
- **✨ Skills Hub & GitHub Installer**: Browse, manage, and inspect skills (`.gemini/skills/*`, global, builtin) and install skills directly from GitHub URLs with automated AI synopsis previews.
- **📱 Adaptive Half-Screen Layout**: Automatically adapts to narrow viewports / split screen with single-pane switching (`[💬 Chat] / [💻 Code]`) and an overlay sidebar drawer.
- **📝 Monaco Code & Diff Editor**: Real-time side-by-side & inline diffs with 1-click "Accept Changes" and syntax-highlighted editor.
- **⚡ Dual-Stream Agent Streaming**: Real-time chain-of-thought collapsible drawers, structured tool execution cards, and live markdown formatting.
- **🔐 Antigravity Auth & Quota Gates**: Real-time 5-hour quota and weekly rate limit monitoring with direct AGY CLI OAuth verification.

---

## 📁 Repository Structure

```
AntiHarness/
├── .gemini/skills/         # Built-in skills (codebase-cartographer, token-saver, surgical-patcher)
├── client/                 # React + Vite frontend application (Port 5180)
│   ├── src/
│   │   ├── components/     # UI (Header, Sidebar, MainCanvas, FileViewer, CodebaseGraph, SkillsHub)
│   │   ├── services/       # REST and WebSocket API client
│   │   └── App.jsx
│   └── vite.config.js
├── server/                 # Express + WebSocket backend server (Port 3001)
│   ├── src/
│   │   ├── routes/         # Workspace, Skills, System, Sessions API routes
│   │   ├── services/       # Graph & AST cartography engine
│   │   ├── agentEngine.js  # Agent stream orchestration & token context injector
│   │   └── ws.js           # WebSocket gateway handler
├── update.bat / ps1 / sh   # 1-Click Auto-Update scripts
├── package.json            # Root monorepo scripts
└── README.md
```

---

## 📄 License
MIT © [nickob4by](https://github.com/nickob4by)
