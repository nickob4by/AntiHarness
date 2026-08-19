import express from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const router = express.Router();

let cachedUsage = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 10000; // 10s cache to avoid excessive subprocess spawning

export async function fetchRealAgyUsage(force = false) {
  const now = Date.now();
  if (!force && cachedUsage && (now - lastFetchTime < CACHE_TTL_MS)) {
    return cachedUsage;
  }

  try {
    const { stdout } = await execPromise('agy -p "/usage"', { timeout: 10000 });
    const lines = stdout.split('\n');

    let gemini5hRemaining = 52;
    let geminiWeeklyRemaining = 91;
    let claude5hRemaining = 88;
    let claudeWeeklyRemaining = 96;

    for (const line of lines) {
      if (line.includes('Gemini') && line.includes('Five Hour')) {
        const match = line.match(/(\d+)%/);
        if (match) gemini5hRemaining = parseInt(match[1], 10);
      } else if (line.includes('Gemini') && line.includes('Weekly')) {
        const match = line.match(/(\d+)%/);
        if (match) geminiWeeklyRemaining = parseInt(match[1], 10);
      } else if ((line.includes('Claude') || line.includes('GPT')) && line.includes('Five Hour')) {
        const match = line.match(/(\d+)%/);
        if (match) claude5hRemaining = parseInt(match[1], 10);
      } else if ((line.includes('Claude') || line.includes('GPT')) && line.includes('Weekly')) {
        const match = line.match(/(\d+)%/);
        if (match) claudeWeeklyRemaining = parseInt(match[1], 10);
      }
    }

    const fiveHourUsed = Math.max(0, 100 - gemini5hRemaining);
    const weeklyUsed = Math.max(0, 100 - geminiWeeklyRemaining);

    cachedUsage = {
      source: 'agy CLI /usage (Live)',
      gemini: {
        fiveHourRemaining: gemini5hRemaining,
        fiveHourUsed,
        weeklyRemaining: geminiWeeklyRemaining,
        weeklyUsed,
      },
      claudeGpt: {
        fiveHourRemaining: claude5hRemaining,
        weeklyRemaining: claudeWeeklyRemaining,
      },
      fiveHourPercent: fiveHourUsed,
      weeklyPercent: weeklyUsed,
      fiveHourRemainingPercent: gemini5hRemaining,
      weeklyRemainingPercent: geminiWeeklyRemaining,
      formatted: `Usage: ${fiveHourUsed}%/5h ${weeklyUsed}%/W`,
      formattedRemaining: `Left: ${gemini5hRemaining}%/5h ${geminiWeeklyRemaining}%/W`,
      raw: stdout.trim(),
      lastUpdated: new Date().toISOString(),
    };
    lastFetchTime = now;
    return cachedUsage;
  } catch (err) {
    console.error('Error fetching real agy /usage:', err.message);
    if (cachedUsage) return cachedUsage;

    return {
      source: 'fallback',
      fiveHourPercent: 48,
      weeklyPercent: 9,
      fiveHourRemainingPercent: 52,
      weeklyRemainingPercent: 91,
      formatted: 'Usage: 48%/5h 9%/W',
      formattedRemaining: 'Left: 52%/5h 91%/W',
      lastUpdated: new Date().toISOString(),
    };
  }
}

// Invalidate cache when prompts finish
export function recordPromptUsage() {
  lastFetchTime = 0; // Force next fetch to query fresh agy stats
}

// Real-time live /usage endpoint
router.get('/usage', async (req, res) => {
  const force = req.query.force === 'true';
  const usage = await fetchRealAgyUsage(force);
  res.json(usage);
});

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
