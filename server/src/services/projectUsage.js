import fs from 'fs';
import path from 'path';
import os from 'os';

function getStoragePath() {
  const dir = path.join(os.homedir(), '.gemini', 'antigravity');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'project_usage.json');
}

function normalizeKey(p) {
  if (!p) return '';
  return path.resolve(p).toLowerCase();
}

export function getAllProjectUsage() {
  try {
    const file = getStoragePath();
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn('[ProjectUsage] Error reading project usage:', e.message);
  }
  return {};
}

export function getProjectUsage(projectPath) {
  const all = getAllProjectUsage();
  const key = normalizeKey(projectPath);
  return all[key] || {
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    promptCount: 0,
    totalDurationMs: 0,
    lastActive: null
  };
}

export function recordProjectUsage(projectPath, usage = {}) {
  if (!projectPath) return null;

  try {
    const file = getStoragePath();
    const all = getAllProjectUsage();
    const key = normalizeKey(projectPath);

    const current = all[key] || {
      name: path.basename(projectPath) || projectPath,
      projectPath: path.resolve(projectPath),
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      promptCount: 0,
      totalDurationMs: 0,
      lastActive: null
    };

    const inputTokens = usage.inputTokens || 0;
    const outputTokens = usage.outputTokens || 0;
    const totalTokens = usage.totalTokens || (inputTokens + outputTokens);
    const durationMs = usage.durationMs || 0;

    current.totalTokens += totalTokens;
    current.inputTokens += inputTokens;
    current.outputTokens += outputTokens;
    current.promptCount += 1;
    current.totalDurationMs += durationMs;
    current.lastActive = Date.now();
    current.projectPath = path.resolve(projectPath);
    current.name = path.basename(projectPath) || projectPath;

    all[key] = current;

    fs.writeFileSync(file, JSON.stringify(all, null, 2), 'utf-8');
    return current;
  } catch (e) {
    console.error('[ProjectUsage] Failed to record usage:', e);
    return null;
  }
}
