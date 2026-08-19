import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { generateCodebaseGraph } from '../services/graphEngine.js';

const router = express.Router();

// Helper to determine the true repository root (if running from server subdir, step up)
export function getRootWorkspace() {
  const cwd = process.cwd();
  if (path.basename(cwd).toLowerCase() === 'server' && fs.existsSync(path.join(cwd, '..', 'package.json'))) {
    return path.resolve(path.join(cwd, '..'));
  }
  return path.resolve(cwd);
}

const defaultRoot = getRootWorkspace();

// Track opened projects
const registeredProjects = new Set([
  defaultRoot,
]);

// Helper to detect available Windows drives
function getAvailableDrives() {
  const drives = [];
  if (process.platform === 'win32') {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const letter of letters) {
      const driveRoot = `${letter}:\\`;
      try {
        if (fs.existsSync(driveRoot)) {
          drives.push({ name: `${letter}:`, path: driveRoot });
        }
      } catch (e) {
        // ignore inaccessible drives
      }
    }
  } else {
    drives.push({ name: '/', path: '/' });
  }

  drives.push({ name: 'Home', path: os.homedir() });
  return drives;
}

// Browse filesystem folders for Folder Picker UI
router.get('/browse', (req, res) => {
  const targetPath = req.query.path || defaultRoot;

  try {
    const resolved = path.resolve(targetPath);
    const drives = getAvailableDrives();

    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'Path not found', drives });
    }

    const stats = fs.statSync(resolved);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory', drives });
    }

    const items = fs.readdirSync(resolved, { withFileTypes: true });
    const directories = [];

    for (const item of items) {
      if (item.name.startsWith('$') || item.name === 'System Volume Information') {
        continue;
      }

      if (item.isDirectory()) {
        const fullPath = path.join(resolved, item.name);
        try {
          // Check if accessible
          fs.accessSync(fullPath, fs.constants.R_OK);
          directories.push({
            name: item.name,
            path: fullPath,
            isDirectory: true,
          });
        } catch (e) {
          // skip inaccessible
        }
      }
    }

    // Sort alphabetically
    directories.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    res.json({
      currentPath: resolved,
      parentPath: path.dirname(resolved) !== resolved ? path.dirname(resolved) : null,
      directories,
      drives,
    });
  } catch (error) {
    res.status(500).json({ error: error.message, drives: getAvailableDrives() });
  }
});

// List all registered projects
router.get('/projects', (req, res) => {
  const projects = Array.from(registeredProjects).map((projPath) => {
    let itemCount = 0;
    try {
      if (fs.existsSync(projPath)) {
        itemCount = fs.readdirSync(projPath).length;
      }
    } catch (e) {}

    return {
      name: path.basename(projPath) || projPath,
      path: projPath,
      itemCount,
    };
  });

  res.json({ projects });
});

// Add a new project folder to sidebar
router.post('/projects', (req, res) => {
  const { folderPath } = req.body;
  if (!folderPath) {
    return res.status(400).json({ error: 'folderPath is required' });
  }

  try {
    const resolved = path.resolve(folderPath);
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'Folder does not exist' });
    }

    const stats = fs.statSync(resolved);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path must be a directory' });
    }

    registeredProjects.add(resolved);

    const items = fs.readdirSync(resolved);
    res.json({
      success: true,
      project: {
        name: path.basename(resolved) || resolved,
        path: resolved,
        itemCount: items.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove a project folder from sidebar
router.delete('/projects', (req, res) => {
  const { folderPath } = req.body;
  if (folderPath) {
    const resolved = path.resolve(folderPath);
    registeredProjects.delete(resolved);
  }
  res.json({ success: true });
});

// Get workspace metadata and file tree
router.get('/info', (req, res) => {
  const targetPath = req.query.path || defaultRoot;
  
  try {
    const resolvedPath = path.resolve(targetPath);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    const stats = fs.statSync(resolvedPath);
    
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }

    const items = fs.readdirSync(resolvedPath, { withFileTypes: true });
    const files = items.map((item) => {
      const itemPath = path.join(resolvedPath, item.name);
      let size = 0;
      try {
        if (!item.isDirectory()) {
          size = fs.statSync(itemPath).size;
        }
      } catch (err) {
        // ignore inaccessible files
      }

      return {
        name: item.name,
        path: itemPath,
        isDirectory: item.isDirectory(),
        size,
      };
    });

    res.json({
      workspacePath: resolvedPath,
      name: path.basename(resolvedPath) || resolvedPath,
      totalItems: files.length,
      items: files,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Read file content
router.get('/file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: 'File path is required' });
  }

  try {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stats = fs.statSync(resolved);
    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is a directory, not a file' });
    }

    // Protect against reading massive binary files
    if (stats.size > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large to open in browser editor (>5MB)' });
    }

    const content = fs.readFileSync(resolved, 'utf-8');
    res.json({
      path: resolved,
      name: path.basename(resolved),
      size: stats.size,
      lastModified: stats.mtime,
      content,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save edited file content to disk
router.put('/file', (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath || content === undefined) {
    return res.status(400).json({ error: 'Path and content are required' });
  }

  try {
    const resolved = path.resolve(filePath);
    fs.writeFileSync(resolved, content, 'utf-8');
    const stats = fs.statSync(resolved);

    res.json({
      success: true,
      path: resolved,
      size: stats.size,
      lastModified: stats.mtime,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new file or folder
router.post('/file', (req, res) => {
  const { path: itemPath, isDirectory, content = '' } = req.body;
  if (!itemPath) {
    return res.status(400).json({ error: 'Path is required' });
  }

  try {
    const resolved = path.resolve(itemPath);
    if (fs.existsSync(resolved)) {
      return res.status(409).json({ error: 'File or directory already exists' });
    }

    if (isDirectory) {
      fs.mkdirSync(resolved, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
      fs.writeFileSync(resolved, content, 'utf-8');
    }

    res.json({
      success: true,
      path: resolved,
      isDirectory: Boolean(isDirectory),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete file or folder
router.delete('/file', (req, res) => {
  const { path: itemPath } = req.body;
  if (!itemPath) {
    return res.status(400).json({ error: 'Path is required' });
  }

  try {
    const resolved = path.resolve(itemPath);
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const stats = fs.statSync(resolved);
    if (stats.isDirectory()) {
      fs.rmSync(resolved, { recursive: true, force: true });
    } else {
      fs.unlinkSync(resolved);
    }

    res.json({ success: true, path: resolved });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Codebase Cartography & Dependency Graph
router.get('/graph', async (req, res) => {
  const targetPath = req.query.path || defaultRoot;
  try {
    const graphData = await generateCodebaseGraph(targetPath);
    res.json(graphData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
