const chalk = require('chalk');

const levels = { debug: 0, info: 1, warn: 2, error: 3 };
const current = levels[process.env.LOG_LEVEL || 'info'];

function log(level, msg, meta) {
  if (levels[level] < current) return;
  const color = { debug: chalk.gray, info: chalk.blue, warn: chalk.yellow, error: chalk.red }[level];
  const time = new Date().toISOString().slice(11, 19);
  console.log(color(`[${time}] [${level.toUpperCase()}] ${msg}`), meta ? meta : '');
}

module.exports = {
  debug: (m, meta) => log('debug', m, meta),
  info: (m, meta) => log('info', m, meta),
  warn: (m, meta) => log('warn', m, meta),
  error: (m, meta) => log('error', m, meta)
};
