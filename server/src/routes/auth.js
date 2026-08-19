import express from 'express';
import { exec } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Helper to determine agy binary path
function getAgyBin() {
  const isWindows = process.platform === 'win32';
  const defaultAgyWindows = path.join(os.homedir(), 'AppData', 'Local', 'agy', 'bin', 'agy.exe');
  return isWindows && fs.existsSync(defaultAgyWindows) ? `"${defaultAgyWindows}"` : 'agy';
}

// Check if CLI is logged in & retrieve active session status
router.get('/status', (req, res) => {
  const agy = getAgyBin();
  exec(`${agy} -p "/usage"`, { timeout: 10000 }, (error, stdout, stderr) => {
    if (!error && stdout.includes('%')) {
      return res.json({
        cliConnected: true,
        authenticated: true,
        method: 'Google OAuth (agy CLI)',
      });
    }

    res.json({
      cliConnected: !error,
      authenticated: !error,
      method: 'Local Credentials',
    });
  });
});

// Trigger agy login if needed
router.post('/cli-login', (req, res) => {
  const agy = getAgyBin();
  exec(`${agy} login`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: error.message, output: stderr });
    }
    res.json({ success: true, output: stdout });
  });
});

export default router;
