const fs = require('fs');
const path = require('path');

const SESSIONS_DIR = path.join(__dirname, '../../sessions');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

function getSessionPath(id) {
  return path.join(SESSIONS_DIR, id);
}

function listSessions() {
  return fs.readdirSync(SESSIONS_DIR).filter(f => fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory());
}

function createSession(name = 'untitled') {
  const id = Date.now().toString(36);
  const dir = getSessionPath(id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ id, name, created: new Date().toISOString() }, null, 2));
  return id;
}

function getWorkspace(id) {
  const dir = getSessionPath(id);
  const ws = path.join(dir, 'workspace');
  if (!fs.existsSync(ws)) fs.mkdirSync(ws, { recursive: true });
  return ws;
}

module.exports = { listSessions, createSession, getWorkspace, getSessionPath };
