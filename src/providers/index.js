const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

class Provider {
  constructor(name, apiKey, baseURL) {
    this.name = name;
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async chat(messages, system, model) {
    throw new Error('Not implemented');
  }
}

class OpenAICompatible extends Provider {
  async chat(messages, system, model) {
    const client = new OpenAI({ apiKey: this.apiKey, baseURL: this.baseURL });
    const resp = await client.chat.completions.create({
      model: model || 'gpt-4o',
      messages: [{ role: 'system', content: system }, ...messages],
      temperature: 0.2,
      max_tokens: 4096
    });
    return resp.choices[0].message.content;
  }
}

class AnthropicProvider extends Provider {
  async chat(messages, system, model) {
    const client = new Anthropic({ apiKey: this.apiKey });
    const resp = await client.messages.create({
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system,
      messages: messages.filter(m => m.role !== 'system')
    });
    return resp.content[0].text;
  }
}

function createProvider(name, apiKey) {
  const configs = {
    openai: { cls: OpenAICompatible, baseURL: undefined },
    groq: { cls: OpenAICompatible, baseURL: 'https://api.groq.com/openai/v1' },
    openrouter: { cls: OpenAICompatible, baseURL: 'https://openrouter.ai/api/v1' },
    ollama: { cls: OpenAICompatible, baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1' },
    xai: { cls: OpenAICompatible, baseURL: 'https://api.x.ai/v1' },
    grok: { cls: OpenAICompatible, baseURL: 'https://api.x.ai/v1' },
    anthropic: { cls: AnthropicProvider }
  };
  const cfg = configs[name] || configs.openai;
  return new cfg.cls(name, apiKey || process.env[`${name.toUpperCase()}_API_KEY`], cfg.baseURL);
}

module.exports = { createProvider, Provider };
