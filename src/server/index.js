require('dotenv').config();
const express = require('express');
const path = require('path');
const { createProvider, listProviders } = require('../providers');
const { runAgentLoop } = require('../agents/loop');
const { listSessions, createSession, getWorkspace } = require('../sessions');
const { maybeSummarize } = require('../context/compass');
const { TEMPLATES, applyTemplate } = require('../templates');
const git = require('../git');
const logger = require('../logger');
const fs = require('fs');

const SYSTEM = fs.readFileSync(path.join(__dirname, '../../prompts/system.md'), 'utf8');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../../public')));

app.use('/preview', (req, res, next) => {
  express.static(getWorkspace(req.query.session || 'default'))(req, res, next);
});

app.get('/api/providers', (req, res) => res.json(listProviders()));
app.get('/api/templates', (req, res) => res.json(Object.entries(TEMPLATES).map(([id, t]) => ({ id, name: t.name }))));

app.post('/api/templates/apply', (req, res) => {
  const { template, session = 'default' } = req.body;
  try {
    const files = applyTemplate(getWorkspace(session), template);
    res.json({ ok: true, files });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Git endpoints
app.get('/api/git/status', async (req, res) => {
  const data = await git.status(req.query.session);
  res.json(data);
});
app.get('/api/git/diff', async (req, res) => {
  const data = await git.diff(req.query.session);
  res.json(data);
});
app.get('/api/git/log', async (req, res) => {
  const data = await git.log(req.query.session, req.query.n || 15);
  res.json(data);
});
app.get('/api/git/branches', async (req, res) => {
  const data = await git.branches(req.query.session);
  res.json(data);
});
app.post('/api/git/commit', async (req, res) => {
  const { message, session = 'default' } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  const data = await git.commit(message, session);
  res.json(data);
});
app.post('/api/git/checkout', async (req, res) => {
  const { branch, session = 'default' } = req.body;
  const data = await git.checkout(branch, session);
  res.json(data);
});

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
        const stat = fs.statSync(full);
        if (stat.isDirectory()) out.push({ name: rel, type: 'dir', children: walk(full, rel + '/') });
        else out.push({ name: rel, type: 'file' });
      }
    } catch {}
    return out;
  };
  res.json({ tree: walk(ws) });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => logger.info(`W-Code http://localhost:${PORT}`));
