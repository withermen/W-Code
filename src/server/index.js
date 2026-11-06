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

app.post('/api/chat', async (req, res) => {
  const start = Date.now();
  try {
    const { messages, provider: providerName = config.defaultProvider, model, apiKey } = req.body;
    logger.info(`Chat request`, { provider: providerName, messages: messages.length });

    const provider = createProvider(providerName, apiKey);
    const result = await runAgentLoop(provider, messages, model || config.defaultModel, tools);

    logger.info(`Chat completed in ${Date.now() - start}ms`, { iterations: result.iterations });
    res.json({ role: 'assistant', content: result.content, iterations: result.iterations });
  } catch (err) {
    logger.error('Chat error', err.message);
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
        if (fs.statSync(full).isDirectory()) {
          out.push(...walk(full, rel + '/'));
        } else {
          out.push(rel);
        }
      }
    } catch {}
    return out;
  };
  res.json({ files: walk(WORKSPACE), workspace: WORKSPACE });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', workspace: WORKSPACE, uptime: process.uptime() });
});

app.listen(PORT, () => {
  logger.info(`W-Code running at http://localhost:${PORT}`);
  logger.info(`Workspace: ${WORKSPACE}`);
});
