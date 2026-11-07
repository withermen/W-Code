const { tools } = require('./index');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const path = require('path');
const fs = require('fs');

const extra = {
  async delete_file({ path: filePath }) {
    const full = path.resolve(process.env.WORKSPACE || '.', filePath);
    if (!full.startsWith(path.resolve(process.env.WORKSPACE || '.'))) throw new Error('Outside workspace');
    fs.unlinkSync(full);
    return `Deleted ${filePath}`;
  },
  async rename_file({ from, to }) {
    const ws = path.resolve(process.env.WORKSPACE || '.');
    const src = path.resolve(ws, from);
    const dest = path.resolve(ws, to);
    if (!src.startsWith(ws) || !dest.startsWith(ws)) throw new Error('Outside workspace');
    fs.renameSync(src, dest);
    return `Renamed ${from} → ${to}`;
  },
  async database_query({ query, db = 'app.db' }) {
    const full = path.resolve(process.env.WORKSPACE || '.', db);
    try {
      const { stdout } = await execAsync(`sqlite3 "${full}" "${query.replace(/"/g, '\\"')}"`);
      return stdout || '(no output)';
    } catch (e) { return e.message; }
  },
  async format_code({ path: filePath }) {
    const full = path.resolve(process.env.WORKSPACE || '.', filePath);
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.ts')) {
      return tools.run_command({ command: `npx prettier --write "${filePath}"` });
    }
    if (filePath.endsWith('.php')) {
      return tools.run_command({ command: `php-cs-fixer fix "${filePath}" || echo "php-cs-fixer not available"` });
    }
    return 'No formatter for this file type';
  },
  async git_diff() {
    try {
      const { stdout } = await execAsync('git diff', { cwd: process.env.WORKSPACE || '.' });
      return stdout || 'No changes';
    } catch { return 'Not a git repo'; }
  },
  async git_branch() {
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: process.env.WORKSPACE || '.' });
      return stdout.trim();
    } catch { return 'unknown'; }
  }
};

Object.assign(tools, extra);

const toolDefinitions = [
  { type: 'function', function: { name: 'read_file', description: 'Read file', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'write_file', description: 'Write file', parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } } },
  { type: 'function', function: { name: 'edit_file', description: 'Edit file', parameters: { type: 'object', properties: { path: { type: 'string' }, old_string: { type: 'string' }, new_string: { type: 'string' } }, required: ['path', 'old_string', 'new_string'] } } },
  { type: 'function', function: { name: 'delete_file', description: 'Delete file', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'rename_file', description: 'Rename file', parameters: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } }, required: ['from', 'to'] } } },
  { type: 'function', function: { name: 'list_dir', description: 'List directory', parameters: { type: 'object', properties: { path: { type: 'string' } } } } },
  { type: 'function', function: { name: 'search', description: 'Search code', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'run_command', description: 'Run shell command', parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } } },
  { type: 'function', function: { name: 'tree', description: 'File tree', parameters: { type: 'object', properties: { path: { type: 'string' }, depth: { type: 'number' } } } } },
  { type: 'function', function: { name: 'git_status', description: 'Git status', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'git_diff', description: 'Git diff', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'git_commit', description: 'Git commit', parameters: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'] } } },
  { type: 'function', function: { name: 'install_package', description: 'Install package', parameters: { type: 'object', properties: { package: { type: 'string' }, manager: { type: 'string' } }, required: ['package'] } } },
  { type: 'function', function: { name: 'web_fetch', description: 'Fetch URL', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } } },
  { type: 'function', function: { name: 'database_query', description: 'Run SQLite query', parameters: { type: 'object', properties: { query: { type: 'string' }, db: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'format_code', description: 'Format file', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'apply_design_skill', description: 'Apply design principles', parameters: { type: 'object', properties: { skill: { type: 'string' }, target: { type: 'string' } }, required: ['skill'] } } },
  { type: 'function', function: { name: 'create_from_example', description: 'Copy example', parameters: { type: 'object', properties: { example: { type: 'string' }, dest: { type: 'string' } }, required: ['example'] } } }
];

async function executeTool(name, args) {
  if (typeof tools[name] === 'function') return await tools[name](args || {});
  return `Unknown tool: ${name}`;
}

module.exports = { toolDefinitions, executeTool, tools };
