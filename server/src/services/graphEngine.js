import fs from 'fs';
import path from 'path';

// Standard ignore list for fast, token-efficient scanning
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.gemini',
  '.agy',
  '.vscode',
  '.idea',
  'coverage',
  'tmp',
  'temp',
  'vendor',
  '__pycache__',
  '.next',
  '.nuxt',
  'bin',
  'obj'
]);

const IGNORED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
  '.mp4', '.mp3', '.wav', '.pdf', '.zip', '.tar', '.gz',
  '.exe', '.dll', '.so', '.dylib', '.lock', '.map', '.min.js', '.min.css'
]);

// Identify primary file role
function getFileRole(filePath, fileName) {
  const lower = fileName.toLowerCase();
  const ext = path.extname(fileName).toLowerCase();

  if (['package.json', 'tsconfig.json', 'vite.config.js', 'webpack.config.js', 'dockerfile', 'requirements.txt', 'cargo.toml', 'go.mod'].includes(lower)) {
    return 'config';
  }
  if (lower.includes('test') || lower.includes('spec')) return 'test';
  if (['index.html', 'main.jsx', 'index.js', 'app.jsx', 'app.js', 'main.py', 'server.js'].includes(lower)) {
    return 'entry';
  }
  if (['.jsx', '.tsx', '.vue', '.svelte', '.html', '.css', '.scss'].includes(ext)) {
    return 'ui';
  }
  if (['.js', '.ts', '.py', '.go', '.rs', '.java', '.cs', '.php', '.rb'].includes(ext)) {
    return 'backend';
  }
  if (['.md', '.txt', '.rst', '.doc'].includes(ext)) {
    return 'doc';
  }
  return 'file';
}

// Extract imports from JS/TS/Python code
function extractImports(filePath, fileContent) {
  const imports = [];
  const ext = path.extname(filePath).toLowerCase();

  if (['.js', '.jsx', '.ts', '.tsx', '.mjs'].includes(ext)) {
    const importRegex = /(?:import\s+(?:[\w*\s{},]*)\s+from\s+['"]([^'"]+)['"])|(?:require\(['"]([^'"]+)['"]\))/g;
    let match;
    while ((match = importRegex.exec(fileContent)) !== null) {
      const imp = match[1] || match[2];
      if (imp && (imp.startsWith('.') || imp.startsWith('/'))) {
        imports.push(imp);
      }
    }
  } else if (['.py'].includes(ext)) {
    const pyImportRegex = /(?:from\s+([.\w]+)\s+import)|(?:import\s+([.\w]+))/g;
    let match;
    while ((match = pyImportRegex.exec(fileContent)) !== null) {
      const imp = match[1] || match[2];
      if (imp) imports.push(imp);
    }
  }

  return [...new Set(imports)].slice(0, 8); // top 8 dependencies per file
}

/**
 * Scan workspace directory and generate full project cartography & dependency graph
 */
export async function generateCodebaseGraph(workspaceRoot, maxDepth = 6) {
  const resolvedRoot = path.resolve(workspaceRoot);
  if (!fs.existsSync(resolvedRoot)) {
    throw new Error(`Workspace path does not exist: ${resolvedRoot}`);
  }

  const allFiles = [];
  const directoryTree = { name: path.basename(resolvedRoot), path: resolvedRoot, type: 'directory', children: [] };
  const dependencies = [];
  const techStack = new Set();
  let totalLinesOfCode = 0;

  function scanDir(currentDir, parentNode, depth = 0) {
    if (depth > maxDepth) return;

    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(resolvedRoot, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name.toLowerCase()) || entry.name.startsWith('.')) continue;

        const dirNode = {
          name: entry.name,
          path: fullPath,
          relPath,
          type: 'directory',
          children: []
        };
        parentNode.children.push(dirNode);
        scanDir(fullPath, dirNode, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IGNORED_EXTENSIONS.has(ext)) continue;

        let size = 0;
        let lineCount = 0;
        let contentSnippet = '';

        try {
          const stat = fs.statSync(fullPath);
          size = stat.size;
          
          if (size < 500000) { // Only read files < 500KB
            const content = fs.readFileSync(fullPath, 'utf8');
            lineCount = content.split('\n').length;
            totalLinesOfCode += lineCount;

            const fileImports = extractImports(fullPath, content);
            if (fileImports.length > 0) {
              dependencies.push({
                file: relPath,
                imports: fileImports
              });
            }

            // Detect tech stack
            if (entry.name === 'package.json') {
              try {
                const pkg = JSON.parse(content);
                const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
                Object.keys(allDeps).forEach((dep) => {
                  if (['react', 'vue', 'svelte', 'express', 'tailwindcss', 'vite', 'next', 'monaco-editor', 'lucide-react', 'ws', 'mermaid'].includes(dep)) {
                    techStack.add(dep);
                  }
                });
              } catch (e) {}
            }
          }
        } catch (e) {}

        const fileRole = getFileRole(fullPath, entry.name);
        const fileObj = {
          name: entry.name,
          path: fullPath,
          relPath,
          type: 'file',
          role: fileRole,
          size,
          lineCount,
          ext
        };

        parentNode.children.push(fileObj);
        allFiles.push(fileObj);
      }
    }
  }

  scanDir(resolvedRoot, directoryTree, 0);

  // Generate ultra-dense, token-optimized ASCII Cartography Map for LLM Context
  let compressedMap = `📁 [WORKSPACE CARTOGRAPHY]: ${path.basename(resolvedRoot)} (${allFiles.length} source files, ~${totalLinesOfCode} LOC)\n`;
  compressedMap += `⚡ [DETECTED STACK]: ${Array.from(techStack).join(', ') || 'Standard Project'}\n`;
  compressedMap += `🗺️ [KEY ARCHITECTURE & ENTRY POINTS]:\n`;

  // Highlight entry points & configs
  const keyFiles = allFiles.filter(f => f.role === 'entry' || f.role === 'config').slice(0, 15);
  keyFiles.forEach(f => {
    compressedMap += `  ★ ${f.relPath} (${f.role.toUpperCase()}, ${f.lineCount} lines)\n`;
  });

  compressedMap += `📂 [STRUCTURE OUTLINE]:\n`;
  
  // Create grouped outline by top-level folders
  const folderGroups = {};
  allFiles.forEach(f => {
    const dir = path.dirname(f.relPath).replace(/\\/g, '/');
    const rootDir = dir === '.' ? 'root' : dir.split('/')[0];
    if (!folderGroups[rootDir]) folderGroups[rootDir] = [];
    folderGroups[rootDir].push(f);
  });

  Object.entries(folderGroups).forEach(([dirName, files]) => {
    compressedMap += `  ├─ 📁 ${dirName}/ (${files.length} files)\n`;
    files.slice(0, 8).forEach((f) => {
      compressedMap += `  │   📄 ${path.basename(f.relPath)} [${f.role}]\n`;
    });
    if (files.length > 8) {
      compressedMap += `  │   ... +${files.length - 8} more\n`;
    }
  });

  // Generate Mermaid Architecture Flow Diagram
  let mermaidGraph = `graph TD\n`;
  mermaidGraph += `  subgraph Workspace["📁 ${path.basename(resolvedRoot)}"]\n`;

  Object.entries(folderGroups).slice(0, 6).forEach(([dirName, files], idx) => {
    const dirId = `dir_${idx}`;
    mermaidGraph += `    ${dirId}["📁 ${dirName} (${files.length} files)"]\n`;
  });

  mermaidGraph += `  end\n`;

  // Add dependency arrows
  dependencies.slice(0, 12).forEach((dep, idx) => {
    const srcName = path.basename(dep.file);
    const srcId = `f_${idx}`;
    dep.imports.slice(0, 2).forEach((imp, impIdx) => {
      const targetName = path.basename(imp);
      const targetId = `t_${idx}_${impIdx}`;
      mermaidGraph += `  ${srcId}["📄 ${srcName}"] --> ${targetId}["📄 ${targetName}"]\n`;
    });
  });

  // Calculate token efficiency estimate
  const estimatedRawSearchTokens = allFiles.length * 80 + 3000; // ~10,000+ tokens
  const optimizedCartographyTokens = Math.round(compressedMap.length / 3.8); // ~350 tokens
  const tokensSaved = Math.max(0, estimatedRawSearchTokens - optimizedCartographyTokens);
  const savingsPercent = Math.round((tokensSaved / estimatedRawSearchTokens) * 100);

  return {
    workspaceName: path.basename(resolvedRoot),
    workspaceRoot: resolvedRoot,
    totalFiles: allFiles.length,
    totalLinesOfCode,
    techStack: Array.from(techStack),
    directoryTree,
    files: allFiles,
    compressedMap,
    mermaidGraph,
    tokenStats: {
      rawSearchTokens: estimatedRawSearchTokens,
      optimizedCartographyTokens,
      tokensSaved,
      savingsPercent: `${savingsPercent}%`
    }
  };
}
