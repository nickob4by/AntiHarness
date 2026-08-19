import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = express.Router();

// Track opened projects
const registeredProjects = new Set([
  path.resolve('D:/AntiG'),
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

  // Also include Home directory
  drives.push({ name: 'Home', path: os.homedir() });
  return drives;
}

// Browse filesystem folders for Folder Picker UI
router.get('/browse', (req, res) => {
  const targetPath = req.query.path || process.cwd();

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
      // Ignore system protected / hidden system directories
      if (item.name.startsWith('$') || item.name === 'System Volume Information') {
        continue;
      }

      if (item.isDirectory()) {
        const itemPath = path.join(resolved, item.name);
        let itemCount = 0;
        try {
          itemCount = fs.readdirSync(itemPath).length;
        } catch (e) {
          // ignore permission errors
        }

        directories.push({
          name: item.name,
          path: itemPath,
          itemCount,
        });
      }
    }

    const parentPath = path.dirname(resolved) !== resolved ? path.dirname(resolved) : null;

    res.json({
      currentPath: resolved,
      parentPath,
      drives,
      directories,
    });
  } catch (error) {
    res.status(500).json({ error: error.message, drives: getAvailableDrives() });
  }
});

// List all registered projects
router.get('/projects', (req, res) => {
  const list = [];
  for (const projPath of registeredProjects) {
    try {
      if (fs.existsSync(projPath) && fs.statSync(projPath).isDirectory()) {
        const items = fs.readdirSync(projPath);
        list.push({
          name: path.basename(projPath) || projPath,
          path: projPath,
          itemCount: items.length,
          exists: true,
        });
      }
    } catch (e) {
      list.push({
        name: path.basename(projPath) || projPath,
        path: projPath,
        itemCount: 0,
        exists: false,
      });
    }
  }
  res.json({ projects: list });
});

// Add / Open a new project folder
router.post('/projects', (req, res) => {
  const { folderPath } = req.body;
  if (!folderPath) {
    return res.status(400).json({ error: 'Folder path is required' });
  }

  try {
    const resolved = path.resolve(folderPath);
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: `Directory does not exist: ${resolved}` });
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
  const targetPath = req.query.path || process.cwd();
  
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

    const content = fs.readFileSync(resolved, 'utf-8');
    res.json({
      path: resolved,
      name: path.basename(resolved),
      content,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
