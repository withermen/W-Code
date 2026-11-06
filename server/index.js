require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Simple file tools
const WORKSPACE = process.env.WORKSPACE || path.join(__dirname, '../workspace');
if (!fs.existsSync(WORKSPACE)) fs.mkdirSync(WORKSPACE, { recursive: true });

app.post('/api/chat', async (req, res) => {
  const { messages, provider = 'openai', model, apiKey } = req.body;
  
  // TODO: Route to different providers
  // For now, return a placeholder
  res.json({
    role: 'assistant',
    content: 'W-Code agent is ready. Provider routing coming next. You said: ' + (messages?.[messages.length-1]?.content || '')
  });
});

app.get('/api/preview/:file', (req, res) => {
  const file = path.join(WORKSPACE, req.params.file);
  if (fs.existsSync(file)) {
    res.sendFile(file);
  } else {
    res.status(404).send('Preview not found');
  }
});

app.listen(PORT, () => {
  console.log(`W-Code running at http://localhost:${PORT}`);
  console.log(`Workspace: ${WORKSPACE}`);
});
