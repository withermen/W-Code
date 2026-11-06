# W-Code

**Free open-source alternative to Claude Code.**

Left side: chat with your AI coding agent.  
Right side: live browser preview of the design / app the AI is building.

Supports all major API providers (OpenAI, Anthropic, Google, Groq, OpenRouter, local models via Ollama, etc.).  
Combines OpenCode-style tools + OpenDesign-style live preview and design system awareness.

## Features

- Multi-provider (bring your own key)
- Full agent tools: read/write files, run shell, search, web fetch
- Live preview pane (right side) that updates as the AI builds
- PHP, SQL, Node, Python, and more
- System prompt inspired by OpenCode (slightly modified)
- Design-aware (can follow design systems / avoid AI slop)
- Apache 2.0

## Quick Start

```bash
git clone https://github.com/withermen/W-Code
cd W-Code
npm install
cp .env.example .env
# Add your API keys
npm start
```

Open http://localhost:3000

## Providers Supported

- OpenAI (GPT-4o, o1, etc.)
- Anthropic (Claude)
- Google Gemini
- Groq
- OpenRouter
- Ollama (local)
- Any OpenAI-compatible endpoint

## License

Apache License 2.0
