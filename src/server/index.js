require('dotenv').config();
const express = require('express');
const path = require('path');
const { createProvider } = require('../providers');
const { tools, WORKSPACE } = require('../tools');
const { runAgentLoop } = require('../agents/loop');
const logger = require('../logger');
const { loadConfig } = require('../config');

const app = express();
const PORT = process.env.PORT || 3000;
const config = loadConfig();

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../../public')));
app.use('/preview', express.static(WORKSPACE));

// Token-by-token style streaming via SSE (chunks as they arrive from the loop)
app.post('/api/chat/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const { messages, provider: providerName = config.defaultProvider, model, apiKey } = req.body;
  const provider = createProvider(providerName, apiKey);

  try {
    const result = await runAgentLoop(provider, messages, model, (chunk) => {
      // Send each chunk immediately
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });
    res.write(`data: ${JSON.stringify({ done: true, content: result.content, iterations: result.iterations })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }
  res.end();
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, provider: providerName = config.defaultProvider, model, apiKey } = req.body;
    const provider = createProvider(providerName, apiKey);
    const result = await runAgentLoop(provider, messages, model, null);
    res.json({ role: 'assistant', content: result.content, iterations: result.iterations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/workspace', (req, res) => {
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
  res.json({ files: walk(WORKSPACE) });
});

app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.listen(PORT, () => logger.info(`W-Code http://localhost:${PORT}`));
