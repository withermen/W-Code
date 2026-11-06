require('dotenv').config();
const express = require('express');
const path = require('path');
const { createProvider } = require('../providers');
const { tools, WORKSPACE } = require('../tools');
const { runAgentLoop } = require('../agents/loop');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../../public')));
app.use('/preview', express.static(WORKSPACE));

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, provider: providerName = 'openai', model, apiKey } = req.body;
    const provider = createProvider(providerName, apiKey);
    const result = await runAgentLoop(provider, messages, model, tools);
    res.json({ role: 'assistant', content: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/workspace', (req, res) => {
  const walk = (dir, prefix = '') => {
    let out = [];
    try {
      for (const f of require('fs').readdirSync(dir)) {
        const full = path.join(dir, f);
        const rel = prefix + f;
        if (require('fs').statSync(full).isDirectory()) {
          out = out.concat(walk(full, rel + '/'));
        } else {
          out.push(rel);
        }
      }
    } catch {}
    return out;
  };
  res.json({ files: walk(WORKSPACE), workspace: WORKSPACE });
});

app.listen(PORT, () => {
  console.log(`W-Code running at http://localhost:${PORT}`);
  console.log(`Workspace: ${WORKSPACE}`);
});
