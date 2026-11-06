const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

class OpenAICompatible {
  constructor(name, apiKey, baseURL) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.name = name;
  }

  async chat(messages, system, model, tools, onChunk) {
    const stream = await this.client.chat.completions.create({
      model: model || 'gpt-4o',
      messages: [{ role: 'system', content: system }, ...messages],
      tools: tools || undefined,
      tool_choice: tools ? 'auto' : undefined,
      temperature: 0.2,
      stream: true
    });

    let full = '';
    let toolCalls = [];
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        full += delta.content;
        if (onChunk) onChunk(delta.content);
      }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!toolCalls[tc.index]) toolCalls[tc.index] = { name: '', arguments: '' };
          if (tc.function?.name) toolCalls[tc.index].name += tc.function.name;
          if (tc.function?.arguments) toolCalls[tc.index].arguments += tc.function.arguments;
        }
      }
    }
    if (toolCalls.length) {
      for (const tc of toolCalls) {
        if (tc.name) full += `\nTOOL: ${tc.name} ${tc.arguments}`;
      }
    }
    return full;
  }
}

class AnthropicProvider {
  constructor(name, apiKey) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(messages, system, model, tools, onChunk) {
    const resp = await this.client.messages.create({
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system,
      messages: messages.filter(m => m.role !== 'system'),
      tools: tools ? tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters
      })) : undefined
    });

    let text = '';
    for (const block of resp.content) {
      if (block.type === 'text') {
        text += block.text;
        if (onChunk) onChunk(block.text);
      }
      if (block.type === 'tool_use') {
        text += `\nTOOL: ${block.name} ${JSON.stringify(block.input)}`;
      }
    }
    return text;
  }
}

function createProvider(name, apiKey) {
  const key = apiKey || process.env[`${name.toUpperCase()}_API_KEY`] || process.env.OPENAI_API_KEY;
  const map = {
    openai: OpenAICompatible,
    groq: class extends OpenAICompatible { constructor(n, k) { super(n, k, 'https://api.groq.com/openai/v1'); } },
    openrouter: class extends OpenAICompatible { constructor(n, k) { super(n, k, 'https://openrouter.ai/api/v1'); } },
    ollama: class extends OpenAICompatible { constructor(n, k) { super(n, k, process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1'); } },
    xai: class extends OpenAICompatible { constructor(n, k) { super(n, k, 'https://api.x.ai/v1'); } },
    anthropic: AnthropicProvider
  };
  const Cls = map[name] || OpenAICompatible;
  return new Cls(name, key);
}

module.exports = { createProvider };
