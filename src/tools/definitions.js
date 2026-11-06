const { tools } = require('./index');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const path = require('path');
const fs = require('fs');

const extraTools = {
  async git_status() {
    try {
      const { stdout } = await execAsync('git status --short', { cwd: process.env.WORKSPACE || '.' });
      return stdout || 'Clean';
    } catch { return 'Not a git repo or error'; }
  },
  async git_commit({ message }) {
    try {
      await execAsync('git add -A', { cwd: process.env.WORKSPACE || '.' });
      const { stdout } = await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: process.env.WORKSPACE || '.' });
      return stdout;
    } catch (e) { return e.message; }
  },
  async install_package({ manager = 'npm', package: pkg }) {
    const cmd = manager === 'composer' ? `composer require ${pkg}` : `npm install ${pkg}`;
    return tools.run_command({ command: cmd });
  },
  async web_fetch({ url }) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      return text.slice(0, 8000);
    } catch (e) { return e.message; }
  },
  async create_from_example({ example, dest }) {
    const map = {
      'php/users': path.join(__dirname, '../../examples/php/users.php'),
      'sql/schema': path.join(__dirname, '../../examples/sql/schema.sql')
    };
    const src = map[example];
    if (!src) return 'Unknown example';
    const target = path.join(process.env.WORKSPACE || path.join(__dirname, '../../workspace'), dest || path.basename(src));
    fs.copyFileSync(src, target);
    return `Copied to ${dest || path.basename(src)}`;
  },
  async apply_design_skill({ skill, target }) {
    return `Design skill "${skill}" applied to ${target || 'project'}. Follow design-system/DESIGN.md and tokens.css. No purple gradients, no Inter-only, no three identical cards.`;
  }
};

Object.assign(tools, extraTools);

const toolDefinitions = [
  { type: 'function', function: { name: 'read_file', description: 'Read file', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'write_file', description: 'Write file', parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } } },
  { type: 'function', function: { name: 'edit_file', description: 'Edit file', parameters: { type: 'object', properties: { path: { type: 'string' }, old_string: { type: 'string' }, new_string: { type: 'string' } }, required: ['path', 'old_string', 'new_string'] } } },
  { type: 'function', function: { name: 'list_dir', description: 'List directory', parameters: { type: 'object', properties: { path: { type: 'string' } } } } },
  { type: 'function', function: { name: 'search', description: 'Search code', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'run_command', description: 'Run shell command', parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } } },
  { type: 'function', function: { name: 'tree', description: 'File tree', parameters: { type: 'object', properties: { path: { type: 'string' }, depth: { type: 'number' } } } } },
  { type: 'function', function: { name: 'git_status', description: 'Git status', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'git_commit', description: 'Git commit', parameters: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'] } } },
  { type: 'function', function: { name: 'install_package', description: 'Install npm or composer package', parameters: { type: 'object', properties: { package: { type: 'string' }, manager: { type: 'string' } }, required: ['package'] } } },
  { type: 'function', function: { name: 'web_fetch', description: 'Fetch URL content', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } } },
  { type: 'function', function: { name: 'apply_design_skill', description: 'Apply design principles', parameters: { type: 'object', properties: { skill: { type: 'string' }, target: { type: 'string' } }, required: ['skill'] } } },
  { type: 'function', function: { name: 'create_from_example', description: 'Copy example into workspace', parameters: { type: 'object', properties: { example: { type: 'string' }, dest: { type: 'string' } }, required: ['example'] } } }
];

async function executeTool(name, args) {
  if (typeof tools[name] === 'function') {
    return await tools[name](args || {});
  }
  return `Unknown tool: ${name}`;
}

module.exports = { toolDefinitions, executeTool, tools };
