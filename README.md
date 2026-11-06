# W-Code

**Free open-source alternative to Claude Code.**

Left: chat with the AI agent.  
Right: live browser preview of what the AI is building.

Supports all major providers. Combines OpenCode-style tools with OpenDesign-style live preview and design awareness.

## Features

- Multi-provider (OpenAI, Anthropic, Groq, OpenRouter, Ollama, xAI/Grok, any OpenAI-compatible)
- File tools: read, write, list, search
- Shell command execution
- Live preview pane (right side)
- PHP, SQL, Node, Python, HTML/CSS/JS support
- System prompt inspired by OpenCode
- Avoids AI slop by default
- Apache 2.0

## Quick Start

```bash
git clone https://github.com/withermen/W-Code
cd W-Code
npm install
cp .env.example .env
# Add at least one API key
npm start
```

Open http://localhost:3000

## Providers

| Provider   | Env Variable          | Notes                  |
|------------|-----------------------|------------------------|
| OpenAI     | OPENAI_API_KEY        | Default                |
| Anthropic  | ANTHROPIC_API_KEY     | Claude                 |
| Groq       | GROQ_API_KEY          | Fast Llama             |
| OpenRouter | OPENROUTER_API_KEY    | Many models            |
| Ollama     | OLLAMA_BASE_URL       | Local                  |
| xAI / Grok | XAI_API_KEY           | Optional               |

## How Tools Work

The agent can output:

```
TOOL: write_file {"path": "index.php", "content": "<?php echo 'hello'; ?>"}
TOOL: run_command {"command": "php -S 0.0.0.0:8080"}
```

Results appear in the chat and the preview updates.

## License

Apache License 2.0
