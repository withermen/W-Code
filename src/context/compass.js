const fs = require('fs');
const path = require('path');

const MAX_TOKENS = 200000;
const SUMMARIZE_AT = 170000;

function estimateTokens(messages) {
  const text = messages.map(m => m.content || '').join(' ');
  return Math.ceil(text.length / 4); // rough estimate
}

async function maybeSummarize(provider, messages, system) {
  const tokens = estimateTokens(messages);
  if (tokens < SUMMARIZE_AT) return messages;

  const summaryPrompt = `Summarize the following conversation concisely but preserve all important technical details, decisions, file changes, and current state. Keep it under 2000 tokens.\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}`;

  const summary = await provider.chat(
    [{ role: 'user', content: summaryPrompt }],
    'You are a precise summarizer. Output only the summary.',
    null,
    null,
    null
  );

  return [
    { role: 'system', content: system },
    { role: 'user', content: `[Previous conversation summary]\n${summary}\n\nContinue from here.` }
  ];
}

module.exports = { estimateTokens, maybeSummarize, MAX_TOKENS, SUMMARIZE_AT };
