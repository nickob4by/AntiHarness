
export async function getProjects() {
  const res = await fetch('/api/workspace/projects');
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function addProject(folderPath) {
  const res = await fetch('/api/workspace/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderPath }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add project');
  }
  return res.json();
}

export async function removeProject(folderPath) {
  const res = await fetch('/api/workspace/projects', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderPath }),
  });
  if (!res.ok) throw new Error('Failed to remove project');
  return res.json();
}

export async function browseFolders(path = '') {
  const query = path ? `?path=${encodeURIComponent(path)}` : '';
  const res = await fetch(`/api/workspace/browse${query}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to browse directory');
  }
  return res.json();
}

export async function getWorkspaceInfo(path = '') {
  const query = path ? `?path=${encodeURIComponent(path)}` : '';
  const res = await fetch(`/api/workspace/info${query}`);
  if (!res.ok) throw new Error('Failed to fetch workspace info');
  return res.json();
}

export async function getFileContent(filePath) {
  const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(filePath)}`);
  if (!res.ok) throw new Error('Failed to fetch file content');
  return res.json();
}

export async function saveFileContent(filePath, content) {
  const res = await fetch('/api/workspace/file', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath, content }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to save file');
  }
  return res.json();
}

export async function createWorkspaceItem(targetPath, name, isDirectory = false) {
  const res = await fetch('/api/workspace/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetPath, name, isDirectory }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create item');
  }
  return res.json();
}

export async function deleteWorkspaceItem(targetPath) {
  const res = await fetch('/api/workspace/file', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetPath }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete item');
  }
  return res.json();
}

export async function getSessions() {
  const res = await fetch('/api/sessions');
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function getSessionTranscript(sessionId) {
  const res = await fetch(`/api/sessions/${sessionId}/transcript`);
  if (!res.ok) throw new Error('Failed to fetch session transcript');
  return res.json();
}

export async function getSessionMessages(sessionId) {
  const res = await fetch(`/api/sessions/${sessionId}/messages`);
  if (!res.ok) throw new Error('Failed to fetch session messages');
  return res.json();
}

export async function deleteSession(sessionId) {
  const res = await fetch(`/api/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete session');
  return res.json();
}

export function getSessionExportUrl(sessionId) {
  return `/api/sessions/${sessionId}/export`;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function getSystemHealth() {
  const res = await fetchWithTimeout('/api/system/health');
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}

export async function getUsage(force = false) {
  const query = force ? '?force=true' : '';
  const res = await fetchWithTimeout(`/api/system/usage${query}`);
  if (!res.ok) throw new Error('Failed to fetch usage metrics');
  return res.json();
}

export async function getAuthStatus(force = false) {
  const query = force ? '?force=true' : '';
  const res = await fetchWithTimeout(`/api/auth/status${query}`);
  if (!res.ok) throw new Error('Failed to fetch auth status');
  return res.json();
}

export async function triggerCliLogin() {
  const res = await fetchWithTimeout('/api/auth/cli-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, 12000);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to trigger CLI login');
  }
  return res.json();
}

export async function getSkills(projectPath = '') {
  const query = projectPath ? `?projectPath=${encodeURIComponent(projectPath)}` : '';
  const res = await fetchWithTimeout(`/api/skills${query}`);
  if (!res.ok) throw new Error('Failed to fetch skills');
  return res.json();
}

export async function inspectGithubSkill(url) {
  const res = await fetchWithTimeout('/api/skills/inspect-github', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  }, 15000);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to inspect GitHub skill repository');
  }
  return res.json();
}

export async function installSkill(skillPayload) {
  const res = await fetchWithTimeout('/api/skills/install', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(skillPayload),
  }, 20000);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to install skill');
  }
  return res.json();
}

export async function deleteSkill(skillPath, slug, projectPath) {
  const payload = typeof skillPath === 'object' 
    ? skillPath 
    : { skillPath, slug, projectPath };

  const res = await fetchWithTimeout('/api/skills', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete skill');
  }
  return res.json();
}

export async function toggleSkillAutoInject(slug, enabled) {
  const res = await fetchWithTimeout('/api/skills/auto-inject/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, enabled }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to toggle auto-inject');
  }
  return res.json();
}

export async function copySkillToProject(slug, projectPath) {
  const res = await fetchWithTimeout('/api/skills/copy-to-project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, projectPath }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to copy skill to project');
  }
  return res.json();
}

