import express from 'express';
import os from 'os';
import path from 'path';

const router = express.Router();

router.get('/health', (req, res) => {
  const homeDir = os.homedir();
  const antigravityAppData = path.join(homeDir, '.gemini', 'antigravity-cli');

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    system: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      cpus: os.cpus().length,
      memory: {
        total: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
        free: Math.round(os.freemem() / (1024 * 1024 * 1024)) + ' GB',
      },
    },
    antigravity: {
      appDataDir: antigravityAppData,
      nodeVersion: process.version,
    },
  });
});

export default router;
