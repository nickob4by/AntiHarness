export async function getSystemHealth() {
  const res = await fetch('/api/system/health');
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}

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
