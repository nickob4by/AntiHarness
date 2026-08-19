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

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Start Localhost Harness
```bash
npm run dev
```

- **Web GUI**: `http://localhost:5173`
- **Backend Gateway**: `http://localhost:3001`

---

## 📁 Repository Structure

```
AntiHarness/
├── client/                 # React + Vite frontend application
│   ├── src/
│   │   ├── components/     # UI components (Header, Sidebar, MainCanvas, FileViewer, etc.)
│   │   ├── services/       # REST and WebSocket API client
│   │   └── App.jsx
│   └── vite.config.js
├── server/                 # Express + WebSocket backend server
│   ├── src/
│   │   ├── routes/         # Workspace, System, and Sessions API routes
│   │   ├── agentEngine.js  # Agent stream orchestration engine
│   │   ├── ws.js           # WebSocket gateway handler
│   │   └── index.js        # Server entry point
├── package.json            # Root monorepo scripts
└── README.md
```

---

## 📄 License
MIT © [nickob4by](https://github.com/nickob4by)
