require('dotenv').config();
const express = require('express');
const path = require('path');
const { createProvider } = require('../providers');
const { runAgentLoop } = require('../agents/loop');
const { listSessions, createSession, getWorkspace } = require('../sessions');
const logger = require('../logger');
const { loadConfig } = require('../config');

const app = express();
const PORT = process.env.PORT || 3000;
const config = loadConfig();

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../../public')));

// Dynamic workspace per session
app.use('/preview', (req, res, next) => {
  const session = req.query.session || 'default';
  const ws = getWorkspace(session);
  express.static(ws)(req, res, next);
});

app.post('/api/chat/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { messages, provider: providerName = 'openai', model, apiKey, session = 'default' } = req.body;
  process.env.WORKSPACE = getWorkspace(session);
  const provider = createProvider(providerName, apiKey);

  try {
    const result = await runAgentLoop(provider, messages, model, (chunk) => {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });
    res.write(`data: ${JSON.stringify({ done: true, content: result.content, iterations: result.iterations })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }
  res.end();
});

app.get('/api/sessions', (req, res) => res.json(listSessions()));
app.post('/api/sessions', (req, res) => {
  const id = createSession(req.body.name || 'New Project');
  res.json({ id });
});

app.get('/api/workspace', (req, res) => {
  const session = req.query.session || 'default';
  const ws = getWorkspace(session);
  const fs = require('fs');
  const walk = (dir, prefix = '') => {
    const out = [];
    try {
      for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        const rel = prefix + f;
        if (fs.statSync(full).isDirectory()) out.push(...walk(full, rel + '/'));
        else out.push(rel);
      }
    } catch {}
    return out;
  };
  res.json({ files: walk(ws), session });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => logger.info(`W-Code http://localhost:${PORT}`));
