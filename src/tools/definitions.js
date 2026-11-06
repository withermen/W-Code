const { tools } = require('../tools');

const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file in the workspace',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Relative path to the file' } },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write or overwrite a file in the workspace',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string', description: 'Full file content' }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: 'Replace a string in a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          old_string: { type: 'string' },
          new_string: { type: 'string' }
        },
        required: ['path', 'old_string', 'new_string']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_dir',
      description: 'List files and directories',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', default: '.' } }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search',
      description: 'Search for text in the codebase',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          path: { type: 'string', default: '.' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Run a shell command in the workspace (PHP, Node, Python, SQL, etc.)',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string' } },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'tree',
      description: 'Show directory tree',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', default: '.' },
          depth: { type: 'number', default: 3 }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'apply_design_skill',
      description: 'Apply a design skill to avoid AI slop and improve the current design',
      parameters: {
        type: 'object',
        properties: {
          skill: { type: 'string', description: 'Skill name or category (color, typography, layout, components, motion, copy)' },
          target: { type: 'string', description: 'File or description of what to improve' }
        },
        required: ['skill']
      }
    }
  }
];

async function executeTool(name, args) {
  if (name === 'apply_design_skill') {
    return `Design skill "${args.skill}" noted. Apply the principles from the AI Things skill set: avoid purple gradients, Inter-only, three identical cards, generic buzzwords. Make the design intentional and specific. Target: ${args.target || 'current project'}`;
  }
  if (typeof tools[name] === 'function') {
    return await tools[name](args);
  }
  return `Unknown tool: ${name}`;
}

module.exports = { toolDefinitions, executeTool };
