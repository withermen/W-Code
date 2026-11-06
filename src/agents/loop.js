const fs = require('fs');
const path = require('path');

const SYSTEM = fs.readFileSync(path.join(__dirname, '../../prompts/system.md'), 'utf8');

function parseToolCalls(text) {
  const calls = [];
  const regex = /TOOL:\s*(\w+)\s*(\{[\s\S]*?\})/g;
  let m;
  while ((m = regex.exec(text))) {
    try {
      calls.push({ name: m[1], args: JSON.parse(m[2]) });
    } catch {}
  }
  return calls;
}

async function runAgentLoop(provider, messages, model, tools) {
  let history = [...messages];
  let iterations = 0;
  const maxIterations = 8;

  while (iterations < maxIterations) {
    iterations++;
    const content = await provider.chat(history, SYSTEM, model);
    const toolCalls = parseToolCalls(content);

    if (toolCalls.length === 0) {
      return { content, history };
    }

    let toolResults = '';
    for (const call of toolCalls) {
      if (tools[call.name]) {
        try {
          const result = await tools[call.name](call.args);
          toolResults += `\n[Tool ${call.name}]\n${result}\n`;
        } catch (e) {
          toolResults += `\n[Tool ${call.name} error] ${e.message}\n`;
        }
      } else {
        toolResults += `\n[Unknown tool ${call.name}]\n`;
      }
    }

    history.push({ role: 'assistant', content });
    history.push({ role: 'user', content: `Tool results:${toolResults}\nContinue.` });
  }

  return { content: 'Max iterations reached.', history };
}

module.exports = { runAgentLoop, SYSTEM };
