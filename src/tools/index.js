const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { loadConfig } = require('../config');
const logger = require('../logger');

const config = loadConfig();
const WORKSPACE = process.env.WORKSPACE || path.join(__dirname, '../../workspace');

function safePath(p) {
  const full = path.resolve(WORKSPACE, p || '.');
  if (!full.startsWith(path.resolve(WORKSPACE))) {
    throw new Error('Access denied: path outside workspace');
  }
  return full;
}

const tools = {
  async read_file({ path: filePath }) {
    const full = safePath(filePath);
    if (!fs.existsSync(full)) return 'Error: File not found';
    const stat = fs.statSync(full);
    if (stat.size > config.maxFileSize) return 'Error: File too large';
    return fs.readFileSync(full, 'utf8');
  },

  async write_file({ path: filePath, content }) {
    const full = safePath(filePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    logger.info(`Wrote file: ${filePath}`);
    return `Wrote ${filePath} (${Buffer.byteLength(content)} bytes)`;
  },

  async edit_file({ path: filePath, old_string, new_string }) {
    const full = safePath(filePath);
    if (!fs.existsSync(full)) return 'Error: File not found';
    let content = fs.readFileSync(full, 'utf8');
    if (!content.includes(old_string)) return 'Error: old_string not found in file';
    content = content.replace(old_string, new_string);
    fs.writeFileSync(full, content);
    return `Edited ${filePath}`;
  },

  async list_dir({ path: dir = '.' }) {
    const full = safePath(dir);
    const items = fs.readdirSync(full, { withFileTypes: true });
    return items
      .map(i => `${i.isDirectory() ? 'DIR ' : 'FILE'} ${i.name}`)
      .join('\n') || '(empty)';
  },

  async search({ query, path: dir = '.' }) {
    try {
      const { stdout } = await execAsync(
        `grep -rni --include="*.php" --include="*.js" --include="*.html" --include="*.css" --include="*.sql" --include="*.py" --include="*.md" --include="*.json" "${query.replace(/"/g, '\\"')}" . | head -50`,
        { cwd: safePath(dir), timeout: 10000 }
      );
      return stdout.trim() || 'No matches found';
    } catch {
      return 'No matches found';
    }
  },

  async run_command({ command }) {
    logger.info(`Running command: ${command}`);
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: WORKSPACE,
        timeout: config.commandTimeout,
        maxBuffer: 2 * 1024 * 1024
      });
      return (stdout || '') + (stderr ? `\n[stderr]\n${stderr}` : '');
    } catch (e) {
      return `Command failed (exit ${e.code || 1}):\n${e.stdout || ''}\n${e.stderr || ''}`;
    }
  },

  async create_php_server({ port = 8080 }) {
    return tools.run_command({ command: `php -S 0.0.0.0:${port} > /tmp/php-server.log 2>&1 & echo $!` });
  },

  async tree({ path: dir = '.', depth = 3 }) {
    try {
      const { stdout } = await execAsync(`find ${dir} -maxdepth ${depth} -type f | head -100`, { cwd: WORKSPACE });
      return stdout || '(empty)';
    } catch {
      return 'Could not generate tree';
    }
  }
};

module.exports = { tools, WORKSPACE };
