const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

class OpenAICompatible {
  constructor(name, apiKey, baseURL) {
    this.name = name;
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async chat(messages, system, model, tools) {
    const resp = await this.client.chat.completions.create({
      model: model || 'gpt-4o',
      messages: [{ role: 'system', content: system }, ...messages],
      tools: tools || undefined,
      tool_choice: tools ? 'auto' : undefined,
      temperature: 0.2,
      max_tokens: 4096
    });
    const msg = resp.choices[0].message;
    // If native tool calls exist, format them as text for the loop
    if (msg.tool_calls && msg.tool_calls.length) {
      let text = msg.content || '';
      for (const tc of msg.tool_calls) {
        text += `\nTOOL: ${tc.function.name} ${tc.function.arguments}`;
      }
      return text;
    }
    return msg.content || '';
  }
}

class AnthropicProvider {
  constructor(name, apiKey) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(messages, system, model) {
    const resp = await this.client.messages.create({
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system,
      messages: messages.filter(m => m.role !== 'system')
    });
    return resp.content[0].text;
  }
}

function createProvider(name, apiKey) {
  const key = apiKey || process.env[`${name.toUpperCase()}_API_KEY`] || process.env.OPENAI_API_KEY;
  const configs = {
    openai: { cls: OpenAICompatible },
    groq: { cls: OpenAICompatible, baseURL: 'https://api.groq.com/openai/v1' },
    openrouter: { cls: OpenAICompatible, baseURL: 'https://openrouter.ai/api/v1' },
    ollama: { cls: OpenAICompatible, baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1' },
    xai: { cls: OpenAICompatible, baseURL: 'https://api.x.ai/v1' },
    anthropic: { cls: AnthropicProvider }
  };
  const cfg = configs[name] || configs.openai;
  return new cfg.cls(name, key, cfg.baseURL);
}

module.exports = { createProvider };
