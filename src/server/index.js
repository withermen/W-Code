require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { createProvider, listProviders } = require('../providers');
const { runAgentLoop } = require('../agents/loop');
const { listSessions, createSession, getWorkspace } = require('../sessions');
const { maybeSummarize } = require('../context/compass');
const { TEMPLATES, applyTemplate } = require('../templates');
const git = require('../git');
const github = require('../github');
const logger = require('../logger');

const SYSTEM = fs.readFileSync(path.join(__dirname, '../../prompts/system.md'), 'utf8');
const app = express();
const PORT = process.env.PORT || 3000;

// In-memory GitHub state (per process)
let githubToken = process.env.GITHUB_TOKEN || '';
let selectedRepo = null; // { owner, repo, branch }
if (githubToken) github.setToken(githubToken);

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../../public')));

app.use('/preview', (req, res, next) => {
  express.static(getWorkspace(req.query.session || 'default'))(req, res, next);
});

// Providers & templates
app.get('/api/providers', (req, res) => res.json(listProviders()));
app.get('/api/templates', (req, res) => res.json(Object.entries(TEMPLATES).map(([id, t]) => ({ id, name: t.name }))));
app.post('/api/templates/apply', (req, res) => {
  try {
    const files = applyTemplate(getWorkspace(req.body.session || 'default'), req.body.template);
    res.json({ ok: true, files });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// GitHub
app.post('/api/github/token', (req, res) => {
  githubToken = req.body.token || '';
  github.setToken(githubToken);
  res.json({ ok: !!githubToken });
});
app.get('/api/github/user', async (req, res) => {
  try { res.json(await github.getUser()); } catch (e) { res.status(401).json({ error: e.message }); }
});
app.get('/api/github/repos', async (req, res) => {
  try { res.json(await github.listRepos()); } catch (e) { res.status(401).json({ error: e.message }); }
});
app.post('/api/github/select', (req, res) => {
  const { full_name, branch } = req.body;
  if (!full_name) return res.status(400).json({ error: 'full_name required' });
  const [owner, repo] = full_name.split('/');
  selectedRepo = { owner, repo, branch: branch || 'main' };
  res.json({ ok: true, selected: selectedRepo });
});
app.get('/api/github/selected', (req, res) => res.json(selectedRepo));
app.post('/api/github/push', async (req, res) => {
  if (!selectedRepo) return res.status(400).json({ error: 'No repo selected' });
  const { path: filePath, content, message } = req.body;
  if (!filePath || content == null) return res.status(400).json({ error: 'path and content required' });
  try {
    const result = await github.pushFile(
      selectedRepo.owner, selectedRepo.repo, filePath, content,
      message || `Update ${filePath}`, selectedRepo.branch
    );
    res.json({ ok: true, commit: result.commit?.sha });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Local git
app.get('/api/git/status', async (req, res) => res.json(await git.status(req.query.session)));
app.get('/api/git/diff', async (req, res) => res.json(await git.diff(req.query.session)));
app.get('/api/git/log', async (req, res) => res.json(await git.log(req.query.session)));
app.post('/api/git/commit', async (req, res) => {
  const data = await git.commit(req.body.message, req.body.session);
  res.json(data);
});

// Chat
app.post('/api/chat/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const { messages, provider: providerName = 'openai', model, apiKey, session = 'default' } = req.body;
  process.env.WORKSPACE = getWorkspace(session);
  const provider = createProvider(providerName, apiKey);
  try {
    const processed = await maybeSummarize(provider, messages, SYSTEM);
    const result = await runAgentLoop(provider, processed, model, (chunk) => {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });
    res.write(`data: ${JSON.stringify({ done: true, content: result.content, iterations: result.iterations })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }
  res.end();
});

app.get('/api/sessions', (req, res) => res.json(listSessions()));
app.post('/api/sessions', (req, res) => res.json({ id: createSession(req.body.name || 'Project') }));

app.get('/api/workspace', (req, res) => {
  const ws = getWorkspace(req.query.session || 'default');
  const walk = (dir, prefix = '') => {
    const out = [];
    try {
      for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        const rel = prefix + f;
        if (fs.statSync(full).isDirectory()) out.push({ name: rel, type: 'dir', children: walk(full, rel + '/') });
        else out.push({ name: rel, type: 'file' });
      }
    } catch {}
    return out;
  };
  res.json({ tree: walk(ws), workspace: ws });
});

app.post('/api/workspace/set', (req, res) => {
  // For future: allow custom workspace path
  res.json({ ok: true, note: 'Session-based workspaces are used' });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => logger.info(`W-Code http://localhost:${PORT}`));
