require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3000;
const WORKSPACE = process.env.WORKSPACE || path.join(__dirname, '../workspace');

if (!fs.existsSync(WORKSPACE)) fs.mkdirSync(WORKSPACE, { recursive: true });

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/preview', express.static(WORKSPACE));

// --- Tools ---
const tools = {
  async read_file({ path: filePath }) {
    const full = path.resolve(WORKSPACE, filePath);
    if (!full.startsWith(WORKSPACE)) throw new Error('Path outside workspace');
    return fs.readFileSync(full, 'utf8');
  },
  async write_file({ path: filePath, content }) {
    const full = path.resolve(WORKSPACE, filePath);
    if (!full.startsWith(WORKSPACE)) throw new Error('Path outside workspace');
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    return `Wrote ${filePath}`;
  },
  async list_dir({ path: dir = '.' }) {
    const full = path.resolve(WORKSPACE, dir);
    return fs.readdirSync(full).join('\n');
  },
  async run_command({ command }) {
    try {
      const { stdout, stderr } = await execAsync(command, { cwd: WORKSPACE, timeout: 30000 });
      return stdout + (stderr ? '\nSTDERR:\n' + stderr : '');
    } catch (e) {
      return `Error: ${e.message}\n${e.stdout || ''}\n${e.stderr || ''}`;
    }
  },
  async search({ query }) {
    try {
      const { stdout } = await execAsync(`grep -rni "${query}" . --include="*.php" --include="*.js" --include="*.html" --include="*.css" --include="*.sql" --include="*.py" | head -50`, { cwd: WORKSPACE });
      return stdout || 'No matches';
    } catch {
      return 'No matches';
    }
  }
};

const systemPrompt = fs.readFileSync(path.join(__dirname, '../prompts/system.md'), 'utf8');

// --- Provider routing ---
async function callLLM(messages, provider, model, apiKey) {
  const key = apiKey || process.env[`${provider.toUpperCase()}_API_KEY`] || process.env.OPENAI_API_KEY;

  if (provider === 'anthropic') {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: key });
    const resp = await client.messages.create({
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.filter(m => m.role !== 'system')
    });
    return resp.content[0].text;
  }

  // OpenAI-compatible (OpenAI, Groq, OpenRouter, Ollama, xAI/Grok, etc.)
  const OpenAI = require('openai');
  const baseURL = {
    openai: undefined,
    groq: 'https://api.groq.com/openai/v1',
    openrouter: 'https://openrouter.ai/api/v1',
    ollama: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    xai: 'https://api.x.ai/v1',
    grok: 'https://api.x.ai/v1'
  }[provider] || undefined;

  const client = new OpenAI({ apiKey: key, baseURL });
  const resp = await client.chat.completions.create({
    model: model || (provider === 'groq' ? 'llama-3.1-70b-versatile' : 'gpt-4o'),
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    temperature: 0.3
  });
  return resp.choices[0].message.content;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, provider = 'openai', model, apiKey } = req.body;
    let content = await callLLM(messages, provider, model, apiKey);

    // Simple tool calling simulation (agent can output TOOL: name {json})
    const toolMatch = content.match(/TOOL:\s*(\w+)\s*(\{[\s\S]*?\})/);
    if (toolMatch) {
      const [, toolName, argsStr] = toolMatch;
      try {
        const args = JSON.parse(argsStr);
        if (tools[toolName]) {
          const result = await tools[toolName](args);
          content += `\n\n[Tool ${toolName} result]\n${result}`;
        }
      } catch (e) {
        content += `\n\n[Tool error] ${e.message}`;
      }
    }

    res.json({ role: 'assistant', content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/files', (req, res) => {
  const walk = (dir, prefix = '') => {
    let result = [];
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      const rel = prefix + f;
      if (fs.statSync(full).isDirectory()) {
        result = result.concat(walk(full, rel + '/'));
      } else {
        result.push(rel);
      }
    }
    return result;
  };
  res.json(walk(WORKSPACE));
});

app.listen(PORT, () => {
  console.log(`W-Code → http://localhost:${PORT}`);
  console.log(`Workspace: ${WORKSPACE}`);
});
