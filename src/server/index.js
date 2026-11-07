require('dotenv').config();
const express = require('express');
const path = require('path');
const { createProvider, listProviders } = require('../providers');
const { runAgentLoop } = require('../agents/loop');
const { listSessions, createSession, getWorkspace } = require('../sessions');
const { maybeSummarize } = require('../context/compass');
const { TEMPLATES, applyTemplate } = require('../templates');
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

app.post('/api/chat/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { messages, provider: providerName = 'openai', model, apiKey, session = 'default', temperature } = req.body;
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
  res.json({ tree: walk(ws), session: req.query.session || 'default' });
});

app.post('/api/file/delete', (req, res) => {
  const { path: p, session = 'default' } = req.body;
  const full = path.join(getWorkspace(session), p);
  try { fs.unlinkSync(full); res.json({ ok: true }); } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/file/rename', (req, res) => {
  const { from, to, session = 'default' } = req.body;
  const ws = getWorkspace(session);
  try { fs.renameSync(path.join(ws, from), path.join(ws, to)); res.json({ ok: true }); } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => logger.info(`W-Code http://localhost:${PORT}`));
