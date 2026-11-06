const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../config');
const logger = require('../logger');
const { toolDefinitions, executeTool } = require('../tools/definitions');

const SYSTEM = fs.readFileSync(path.join(__dirname, '../../prompts/system.md'), 'utf8');
const config = loadConfig();

function extractToolCalls(text) {
  const calls = [];
  const regex = /TOOL:\s*(\w+)\s*(\{[\s\S]*?\})/g;
  let m;
  while ((m = regex.exec(text))) {
    try { calls.push({ name: m[1], args: JSON.parse(m[2]) }); } catch {}
  }
  return calls;
}

async function runAgentLoop(provider, messages, model, onChunk) {
  let history = [...messages];
  let iterations = 0;

  while (iterations < config.maxIterations) {
    iterations++;
    logger.info(`Iteration ${iterations}`);

    const content = await provider.chat(history, SYSTEM, model, toolDefinitions, onChunk);
    const toolCalls = extractToolCalls(content);

    if (toolCalls.length === 0) {
      return { content, iterations, history };
    }

    let results = '';
    for (const call of toolCalls) {
      logger.info(`Tool: ${call.name}`);
      try {
        const result = await executeTool(call.name, call.args);
        results += `\n### ${call.name}\n${String(result).slice(0, 5000)}\n`;
        if (onChunk) onChunk(`\n[Tool ${call.name} done]\n`);
      } catch (e) {
        results += `\n### ${call.name} error: ${e.message}\n`;
      }
    }

    history.push({ role: 'assistant', content });
    history.push({ role: 'user', content: `Tool results:${results}\nContinue or finish.` });
  }
  return { content: 'Max iterations reached.', iterations, history };
}

module.exports = { runAgentLoop };
