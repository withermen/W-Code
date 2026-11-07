const colors = {
  debug: (s) => `\x1b[90m${s}\x1b[0m`,
  info: (s) => `\x1b[34m${s}\x1b[0m`,
  warn: (s) => `\x1b[33m${s}\x1b[0m`,
  error: (s) => `\x1b[31m${s}\x1b[0m`
};

const levels = { debug: 0, info: 1, warn: 2, error: 3 };
const current = levels[process.env.LOG_LEVEL || 'info'];

function log(level, msg, meta) {
  if (levels[level] < current) return;
  const color = colors[level] || ((s) => s);
  const time = new Date().toISOString().slice(11, 19);
  const line = color(`[${time}] [${level.toUpperCase()}] ${msg}`);
  console.log(line, meta || '');
}

module.exports = {
  debug: (m, meta) => log('debug', m, meta),
  info: (m, meta) => log('info', m, meta),
  warn: (m, meta) => log('warn', m, meta),
  error: (m, meta) => log('error', m, meta)
};
