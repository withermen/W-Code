const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const WORKSPACE = process.env.WORKSPACE || path.join(__dirname, '../../workspace');

function safePath(p) {
  const full = path.resolve(WORKSPACE, p || '.');
  if (!full.startsWith(path.resolve(WORKSPACE))) throw new Error('Path outside workspace');
  return full;
}

const tools = {
  async read_file({ path: filePath }) {
    const full = safePath(filePath);
    if (!fs.existsSync(full)) return 'File not found';
    return fs.readFileSync(full, 'utf8');
  },

  async write_file({ path: filePath, content }) {
    const full = safePath(filePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    return `Successfully wrote ${filePath} (${content.length} bytes)`;
  },

  async edit_file({ path: filePath, old_string, new_string }) {
    const full = safePath(filePath);
    if (!fs.existsSync(full)) return 'File not found';
    let content = fs.readFileSync(full, 'utf8');
    if (!content.includes(old_string)) return 'old_string not found';
    content = content.replace(old_string, new_string);
    fs.writeFileSync(full, content);
    return `Edited ${filePath}`;
  },

  async list_dir({ path: dir = '.' }) {
    const full = safePath(dir);
    const items = fs.readdirSync(full, { withFileTypes: true });
    return items.map(i => (i.isDirectory() ? '[dir] ' : '     ') + i.name).join('\n');
  },

  async search({ query, path: dir = '.' }) {
    try {
      const { stdout } = await execAsync(
        `grep -rni --include="*.php" --include="*.js" --include="*.html" --include="*.css" --include="*.sql" --include="*.py" --include="*.md" "${query}" . | head -40`,
        { cwd: safePath(dir) }
      );
      return stdout || 'No matches';
    } catch {
      return 'No matches';
    }
  },

  async run_command({ command }) {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: WORKSPACE,
        timeout: 45000,
        maxBuffer: 1024 * 1024
      });
      return (stdout || '') + (stderr ? '\n[stderr]\n' + stderr : '');
    } catch (e) {
      return `Command failed: ${e.message}\n${e.stdout || ''}\n${e.stderr || ''}`;
    }
  }
};

module.exports = { tools, WORKSPACE };
