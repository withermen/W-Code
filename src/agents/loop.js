const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../config');
const logger = require('../logger');

const SYSTEM = fs.readFileSync(path.join(__dirname, '../../prompts/system.md'), 'utf8');
const config = loadConfig();

function parseToolCalls(text) {
  const calls = [];
  const regex = /TOOL:\s*(\w+)\s*(\{[\s\S]*?\})/g;
  let match;
  while ((match = regex.exec(text))) {
    try {
      calls.push({ name: match[1], args: JSON.parse(match[2]) });
    } catch (e) {
      logger.warn('Failed to parse tool call', { raw: match[0] });
    }
  }
  return calls;
}

async function runAgentLoop(provider, messages, model, tools) {
  let history = [...messages];
  let iterations = 0;

  while (iterations < config.maxIterations) {
    iterations++;
    logger.info(`Agent iteration ${iterations}`);

    const content = await provider.chat(history, SYSTEM, model);
    const toolCalls = parseToolCalls(content);

    if (toolCalls.length === 0) {
      return { content, iterations, history };
    }

    let results = '';
    for (const call of toolCalls) {
      logger.info(`Executing tool: ${call.name}`);
      if (typeof tools[call.name] === 'function') {
        try {
          const result = await tools[call.name](call.args);
          results += `\n### ${call.name}\n${String(result).slice(0, 8000)}\n`;
        } catch (err) {
          results += `\n### ${call.name} ERROR\n${err.message}\n`;
        }
      } else {
        results += `\n### Unknown tool: ${call.name}\n`;
      }
    }

    history.push({ role: 'assistant', content });
    history.push({
      role: 'user',
      content: `Tool results:${results}\n\nContinue working on the original request. Call more tools if needed, or give the final answer.`
    });
  }

  return { content: 'Reached maximum iterations. Please continue or refine the request.', iterations, history };
}

module.exports = { runAgentLoop, SYSTEM, parseToolCalls };
