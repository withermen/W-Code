# W-Code Architecture

## Agent Loop
1. User message arrives
2. Provider (OpenAI/Anthropic/etc.) is called with system prompt + history
3. If the response contains TOOL: blocks, they are executed
4. Results are fed back and the loop continues (max 8 iterations)
5. Final response is returned to the UI
6. Preview iframe refreshes

## Tools
All tools are sandboxed to the `workspace/` directory.

## Design Awareness
The system prompt explicitly forbids common AI slop patterns.

## Extending
- Add new providers in `src/providers/index.js`
- Add new tools in `src/tools/index.js`
- Modify behavior in `prompts/system.md`
