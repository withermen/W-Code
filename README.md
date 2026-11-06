# W-Code

**High-quality free open-source alternative to Claude Code.**

Left panel: full agent chat with multi-provider support.  
Right panel: live browser preview that updates as the agent builds.

Built with modular architecture, real tool system, and design awareness (inspired by OpenCode + OpenDesign).

## Architecture

```
src/
├── server/          # Express + WebSocket server
├── providers/       # OpenAI, Anthropic, Groq, OpenRouter, Ollama, xAI
├── tools/           # File, shell, search, web tools
├── agents/          # Agent loop + system prompt handling
├── utils/           # Helpers
└── preview/         # Live preview manager
public/              # Frontend (chat + preview)
prompts/             # System prompts
workspace/           # Working directory for generated files
```

## Quick Start

```bash
git clone https://github.com/withermen/W-Code
cd W-Code
npm install
cp .env.example .env
# Add API keys
npm start
```

Open http://localhost:3000

## Supported Providers

- OpenAI
- Anthropic (Claude)
- Groq
- OpenRouter
- Ollama (local)
- xAI / Grok
- Any OpenAI-compatible endpoint

## Tools

- `read_file` / `write_file` / `edit_file`
- `list_dir` / `search`
- `run_command` (PHP, SQL, Node, Python, etc.)
- `web_fetch`

The agent can call tools by emitting structured blocks. Results stream back into chat and the preview updates automatically.

## License

Apache License 2.0
