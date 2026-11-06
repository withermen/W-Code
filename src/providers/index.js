const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

const PROVIDERS = {
  openai: { name: 'OpenAI', baseURL: null, models: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini'] },
  anthropic: { name: 'Anthropic', models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'] },
  groq: { name: 'Groq', baseURL: 'https://api.groq.com/openai/v1', models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'] },
  openrouter: { name: 'OpenRouter', baseURL: 'https://openrouter.ai/api/v1', models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro'] },
  xai: { name: 'xAI / Grok', baseURL: 'https://api.x.ai/v1', models: ['grok-beta', 'grok-2'] },
  ollama: { name: 'Ollama (Local)', baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1', models: ['llama3.1', 'mistral', 'codellama'] },
  gemini: { name: 'Google Gemini', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
  deepseek: { name: 'DeepSeek', baseURL: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-coder'] },
  mistral: { name: 'Mistral', baseURL: 'https://api.mistral.ai/v1', models: ['mistral-large-latest', 'codestral-latest'] },
  together: { name: 'Together AI', baseURL: 'https://api.together.xyz/v1', models: ['meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'] }
};

class OpenAICompatible {
  constructor(name, apiKey, baseURL) {
    this.client = new OpenAI({ apiKey: apiKey || 'sk-no-key', baseURL });
    this.name = name;
  }
  async chat(messages, system, model, tools, onChunk) {
    const stream = await this.client.chat.completions.create({
      model: model || 'gpt-4o',
      messages: [{ role: 'system', content: system }, ...messages],
      tools: tools || undefined,
      tool_choice: tools ? 'auto' : undefined,
      temperature: 0.2,
      stream: !!onChunk
    });
    if (!onChunk) {
      const resp = stream;
      const msg = resp.choices[0].message;
      let text = msg.content || '';
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) text += `\nTOOL: ${tc.function.name} ${tc.function.arguments}`;
      }
      return text;
    }
    let full = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) { full += delta.content; onChunk(delta.content); }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.function?.name || tc.function?.arguments) {
            full += `\nTOOL: ${tc.function.name || ''} ${tc.function.arguments || ''}`;
          }
        }
      }
    }
    return full;
  }
}

class AnthropicProvider {
  constructor(apiKey) {
    this.client = new Anthropic({ apiKey });
  }
  async chat(messages, system, model, tools, onChunk) {
    const resp = await this.client.messages.create({
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system,
      messages: messages.filter(m => m.role !== 'system'),
      tools: tools ? tools.map(t => ({ name: t.function.name, description: t.function.description, input_schema: t.function.parameters })) : undefined
    });
    let text = '';
    for (const block of resp.content) {
      if (block.type === 'text') { text += block.text; if (onChunk) onChunk(block.text); }
      if (block.type === 'tool_use') text += `\nTOOL: ${block.name} ${JSON.stringify(block.input)}`;
    }
    return text;
  }
}

function createProvider(name, apiKey) {
  const cfg = PROVIDERS[name] || PROVIDERS.openai;
  if (name === 'anthropic') return new AnthropicProvider(apiKey);
  return new OpenAICompatible(name, apiKey, cfg.baseURL);
}

function listProviders() {
  return Object.entries(PROVIDERS).map(([id, p]) => ({ id, name: p.name, models: p.models }));
}

module.exports = { createProvider, listProviders, PROVIDERS };
