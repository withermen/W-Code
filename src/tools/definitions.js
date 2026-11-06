const { tools } = require('./index');

const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read a file from the workspace',
      parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write a file to the workspace',
      parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: 'Edit a file by replacing a string',
      parameters: { type: 'object', properties: { path: { type: 'string' }, old_string: { type: 'string' }, new_string: { type: 'string' } }, required: ['path', 'old_string', 'new_string'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_dir',
      description: 'List directory contents',
      parameters: { type: 'object', properties: { path: { type: 'string' } } }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search',
      description: 'Search codebase for text',
      parameters: { type: 'object', properties: { query: { type: 'string' }, path: { type: 'string' } }, required: ['query'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Run a shell command (supports PHP, Node, Python, SQL clients, etc.)',
      parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'tree',
      description: 'Show file tree',
      parameters: { type: 'object', properties: { path: { type: 'string' }, depth: { type: 'number' } } }
    }
  },
  {
    type: 'function',
    function: {
      name: 'apply_design_skill',
      description: 'Apply design system principles to avoid AI slop',
      parameters: { type: 'object', properties: { skill: { type: 'string' }, target: { type: 'string' } }, required: ['skill'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_from_example',
      description: 'Copy a PHP or SQL example into the workspace',
      parameters: { type: 'object', properties: { example: { type: 'string', description: 'php/users or sql/schema' }, dest: { type: 'string' } }, required: ['example'] }
    }
  }
];

async function executeTool(name, args) {
  if (name === 'apply_design_skill') {
    return `Applied design skill "${args.skill}". Follow design-system/DESIGN.md and tokens.css. Avoid purple gradients, Inter-only, three identical cards, and generic buzzwords.`;
  }
  if (name === 'create_from_example') {
    const fs = require('fs');
    const path = require('path');
    const map = {
      'php/users': path.join(__dirname, '../../examples/php/users.php'),
      'sql/schema': path.join(__dirname, '../../examples/sql/schema.sql')
    };
    const src = map[args.example];
    if (!src || !fs.existsSync(src)) return 'Example not found';
    const dest = path.join(process.env.WORKSPACE || path.join(__dirname, '../../workspace'), args.dest || path.basename(src));
    fs.copyFileSync(src, dest);
    return `Copied example to ${args.dest || path.basename(src)}`;
  }
  if (typeof tools[name] === 'function') {
    return await tools[name](args);
  }
  return `Unknown tool: ${name}`;
}

module.exports = { toolDefinitions, executeTool };
