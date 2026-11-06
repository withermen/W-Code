const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../wcode.config.json');

const defaults = {
  maxIterations: 10,
  commandTimeout: 60000,
  maxFileSize: 5 * 1024 * 1024,
  allowedExtensions: ['.js', '.ts', '.php', '.html', '.css', '.sql', '.py', '.md', '.json', '.vue', '.svelte'],
  previewRefreshDelay: 300,
  defaultProvider: 'openai',
  defaultModel: null
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return { ...defaults, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
    }
  } catch (e) {
    console.warn('Config load failed, using defaults:', e.message);
  }
  return defaults;
}

module.exports = { loadConfig, defaults };
