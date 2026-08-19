import React, { useRef, useEffect } from 'react';
import Editor, { DiffEditor, loader } from '@monaco-editor/react';

export function getMonacoLanguage(filename) {
  if (!filename) return 'plaintext';
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'json':
      return 'json';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'scss':
    case 'sass':
    case 'less':
      return 'scss';
    case 'py':
      return 'python';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'java':
      return 'java';
    case 'c':
    case 'h':
      return 'c';
    case 'cpp':
    case 'hpp':
    case 'cc':
      return 'cpp';
    case 'cs':
      return 'csharp';
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'shell';
    case 'ps1':
    case 'psm1':
      return 'powershell';
    case 'sql':
      return 'sql';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'xml':
    case 'svg':
      return 'xml';
    case 'dockerfile':
      return 'dockerfile';
    default:
      return 'plaintext';
  }
}

export default function MonacoEditorWrapper({
  value,
  onChange,
  filename,
  isDiffMode = false,
  originalValue = '',
  renderSideBySide = true,
  onSave,
}) {
  const editorRef = useRef(null);
  const language = getMonacoLanguage(filename);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define custom dark theme matching AntiHarness
    monaco.editor.defineTheme('antiharness-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '818cf8', fontStyle: 'bold' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'fbbf24' },
        { token: 'type', foreground: '38bdf8' },
        { token: 'identifier', foreground: 'e2e8f0' },
      ],
      colors: {
        'editor.background': '#080c14',
        'editor.foreground': '#e2e8f0',
        'editor.lineHighlightBackground': '#111827',
        'editorCursor.foreground': '#818cf8',
        'editorWhitespace.foreground': '#1e293b',
        'editorIndentGuide.background': '#1e293b',
        'editorIndentGuide.activeBackground': '#334155',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#818cf8',
        'editor.selectionBackground': '#312e8160',
        'diffEditor.insertedTextBackground': '#065f4635',
        'diffEditor.removedTextBackground': '#991b1b35',
      },
    });

    monaco.editor.setTheme('antiharness-dark');

    // Add Ctrl+S action to Monaco
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) onSave();
    });
  };

  if (isDiffMode) {
    return (
      <div className="w-full h-full bg-[#080c14] overflow-hidden">
        <DiffEditor
          original={originalValue}
          modified={value}
          language={language}
          theme="vs-dark"
          onMount={handleEditorMount}
          options={{
            fontSize: 13,
            fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
            minimap: { enabled: false },
            readOnly: false,
            renderSideBySide,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            smoothScrolling: true,
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#080c14] overflow-hidden">
      <Editor
        value={value}
        onChange={(val) => onChange && onChange(val || '')}
        language={language}
        theme="vs-dark"
        onMount={handleEditorMount}
        loading={
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-mono bg-[#080c14]">
            Loading Monaco Editor...
          </div>
        }
        options={{
          fontSize: 13,
          fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
          fontLigatures: true,
          minimap: { enabled: true, maxColumn: 80 },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          lineNumbers: 'on',
          automaticLayout: true,
          tabSize: 2,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          renderWhitespace: 'selection',
          padding: { top: 8, bottom: 8 },
        }}
      />
    </div>
  );
}