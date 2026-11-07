const fs = require('fs');
const path = require('path');

const TEMPLATES = {
  'php-sqlite': {
    name: 'PHP + SQLite',
    files: {
      'index.php': `<?php
$db = new SQLite3('app.db');
$db->exec('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, title TEXT)');
?>
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>PHP App</title>
<link rel="stylesheet" href="/design-system/tokens.css">
<style>body{background:var(--bg);color:var(--text);font-family:var(--font-sans);padding:2rem}</style>
</head><body><h1>PHP + SQLite</h1><p>Ready.</p></body></html>`,
      'app.db': ''
    }
  },
  'node-api': {
    name: 'Node API',
    files: {
      'package.json': JSON.stringify({ name: 'api', version: '1.0.0', main: 'server.js', dependencies: { express: '^4.21.0' } }, null, 2),
      'server.js': `const express = require('express');
const app = express();
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.listen(3001, () => console.log('API on 3001'));`
    }
  },
  'static-site': {
    name: 'Static Site',
    files: {
      'index.html': `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Site</title>
<link rel="stylesheet" href="style.css"></head>
<body><h1>Static Site</h1><p>Start here.</p></body></html>`,
      'style.css': `body { font-family: system-ui; margin: 2rem; background: #0f0f0f; color: #eee; }`
    }
  },
  'react': {
    name: 'React (Vite)',
    files: {
      'package.json': JSON.stringify({ name: 'react-app', version: '1.0.0', scripts: { dev: 'vite' }, dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' }, devDependencies: { vite: '^5.4.0', '@vitejs/plugin-react': '^4.3.0' } }, null, 2),
      'index.html': `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>React</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>`,
      'src/main.jsx': `import React from 'react'; import { createRoot } from 'react-dom/client'; import App from './App'; createRoot(document.getElementById('root')).render(<App />);`,
      'src/App.jsx': `export default function App() { return <h1>React App</h1>; }`
    }
  }
};

function applyTemplate(workspace, templateId) {
  const tpl = TEMPLATES[templateId];
  if (!tpl) throw new Error('Unknown template');
  for (const [file, content] of Object.entries(tpl.files)) {
    const full = path.join(workspace, file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return Object.keys(tpl.files);
}

module.exports = { TEMPLATES, applyTemplate };
