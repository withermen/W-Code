const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../config');
const logger = require('../logger');
const { toolDefinitions, executeTool } = require('../tools/definitions');

const SYSTEM = fs.readFileSync(path.join(__dirname, '../../prompts/system.md'), 'utf8');
const config = loadConfig();

async function runAgentLoop(provider, messages, model, onChunk) {
  let history = [...messages];
  let iterations = 0;

  while (iterations < config.maxIterations) {
    iterations++;
    logger.info(`Agent iteration ${iterations}`);

    // For providers that support tools natively
    const content = await provider.chat(history, SYSTEM, model, toolDefinitions);

    if (onChunk) onChunk(content);

    // Check for tool calls in the response (OpenAI-style or text fallback)
    const toolCalls = extractToolCalls(content);

    if (toolCalls.length === 0) {
      return { content, iterations, history };
    }

    let resultsText = '';
    for (const call of toolCalls) {
      logger.info(`Tool call: ${call.name}`);
      try {
        const result = await executeTool(call.name, call.args);
        resultsText += `\n### ${call.name}\n${String(result).slice(0, 6000)}\n`;
        if (onChunk) onChunk(`\n[Tool ${call.name} executed]\n`);
      } catch (err) {
        resultsText += `\n### ${call.name} ERROR\n${err.message}\n`;
      }
    }

    history.push({ role: 'assistant', content });
    history.push({
      role: 'user',
      content: `Tool results:${resultsText}\n\nContinue. Use more tools if needed or provide the final answer.`
    });
  }

  return { content: 'Max iterations reached.', iterations, history };
}

function extractToolCalls(content) {
  const calls = [];
  // Text format fallback
  const regex = /TOOL:\s*(\w+)\s*(\{[\s\S]*?\})/g;
  let m;
  while ((m = regex.exec(content))) {
    try { calls.push({ name: m[1], args: JSON.parse(m[2]) }); } catch {}
  }
  return calls;
}

module.exports = { runAgentLoop, SYSTEM };
