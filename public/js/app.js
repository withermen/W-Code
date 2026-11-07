let messages = [];
let currentSession = 'default';
let settings = JSON.parse(localStorage.getItem('wcode-settings') || '{"keys":{},"theme":"dark"}');
let selectedRepo = null;

const $ = id => document.getElementById(id);
const messagesEl = $('messages'), promptEl = $('prompt'), providerEl = $('provider'), modelEl = $('model');
const sessionEl = $('session'), filesEl = $('files'), frame = $('frame'), statusEl = $('status');

function applyTheme() { document.body.className = settings.theme === 'light' ? 'light' : ''; }
applyTheme();

async function loadProviders() {
  const providers = await (await fetch('/api/providers')).json();
  providerEl.innerHTML = providers.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  updateModels();
}
function updateModels() {
  fetch('/api/providers').then(r => r.json()).then(ps => {
    const p = ps.find(x => x.id === providerEl.value);
    modelEl.innerHTML = (p?.models || []).map(m => `<option>${m}</option>`).join('');
  });
}
providerEl.onchange = updateModels;

function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.textContent = content;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}
function setStatus(t) { statusEl.textContent = t; }

async function loadFiles() {
  const data = await (await fetch(`/api/workspace?session=${currentSession}`)).json();
  function render(nodes, depth = 0) {
    return (nodes || []).map(n => {
      if (n.type === 'dir') return `<div style="padding-left:${depth*12}px">📁 ${n.name.split('/').pop()} ${render(n.children || [], depth+1)}</div>`;
      return `<div style="padding-left:${depth*12}px;cursor:pointer" onclick="selectFile('${n.name}')">${n.name.split('/').pop()}</div>`;
    }).join('');
  }
  filesEl.innerHTML = render(data.tree) || '(empty)';
}
function selectFile(f) {
  $('target-file').value = f;
  frame.src = `/preview/${f}?session=${currentSession}&t=${Date.now()}`;
  $('preview-url').textContent = f;
  setStatus(`Target: ${f}`);
}

async function loadGit() {
  try {
    const s = await (await fetch(`/api/git/status?session=${currentSession}`)).json();
    $('git-branch').textContent = `Branch: ${s.branch || '?'}`;
    $('git-status').textContent = s.status || (s.clean ? 'Clean' : '');
  } catch {}
}

async function loadSessions() {
  const list = await (await fetch('/api/sessions')).json();
  sessionEl.innerHTML = '<option value="default">Default</option>' + list.map(s => `<option value="${s}">${s}</option>`).join('');
}

// GitHub
$('github-btn').onclick = () => $('github-panel').style.display = $('github-panel').style.display === 'none' ? 'block' : 'none';
$('gh-connect').onclick = async () => {
  const token = $('gh-token').value.trim();
  if (!token) return;
  await fetch('/api/github/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
  try {
    const user = await (await fetch('/api/github/user')).json();
    $('gh-user').textContent = `Connected as ${user.login}`;
    const repos = await (await fetch('/api/github/repos')).json();
    $('gh-repos').innerHTML = '<option>Select repo...</option>' + repos.map(r => `<option value="${r.full_name}">${r.full_name}</option>`).join('');
    setStatus('GitHub connected');
  } catch (e) { $('gh-user').textContent = 'Connection failed'; }
};
$('gh-select').onclick = async () => {
  const full = $('gh-repos').value;
  if (!full || full === 'Select repo...') return;
  await fetch('/api/github/select', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: full }) });
  selectedRepo = full;
  $('gh-selected').textContent = `Selected: ${full}`;
  setStatus(`Repo: ${full}`);
};
$('push-target').onclick = async () => {
  const file = $('target-file').value.trim();
  if (!file || !selectedRepo) { setStatus('Select repo and target file'); return; }
  const content = await (await fetch(`/preview/${file}?session=${currentSession}`)).text();
  const res = await fetch('/api/github/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: file, content, message: `Update ${file} via W-Code` })
  });
  const data = await res.json();
  setStatus(data.ok ? `Pushed ${file}` : data.error);
};

async function send() {
  const text = promptEl.value.trim();
  if (!text) return;
  promptEl.value = '';
  messages.push({ role: 'user', content: text });
  addMessage('user', text);
  setStatus('Thinking...');
  const assistantDiv = addMessage('assistant', '');
  let full = '';
  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, provider: providerEl.value, model: modelEl.value, apiKey: settings.keys[providerEl.value] || '', session: currentSession })
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value);
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const d = JSON.parse(line.slice(6));
        if (d.chunk) { full += d.chunk; assistantDiv.textContent = full; }
        if (d.done) { messages.push({ role: 'assistant', content: d.content }); setStatus(`Done`); loadFiles(); loadGit(); setTimeout(() => frame.src = `/preview/?session=${currentSession}&t=${Date.now()}`, 300); }
        if (d.error) assistantDiv.textContent = 'Error: ' + d.error;
      } catch {}
    }
  }
}

$('send').onclick = send;
$('refresh').onclick = () => { frame.src = `/preview/?session=${currentSession}&t=${Date.now()}`; loadFiles(); loadGit(); };
$('clear').onclick = () => { messages = []; messagesEl.innerHTML = ''; setStatus(''); };
$('new-session').onclick = async () => {
  const data = await (await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
  currentSession = data.id; await loadSessions(); sessionEl.value = currentSession;
  messages = []; messagesEl.innerHTML = ''; loadFiles();
  frame.src = `/preview/?session=${currentSession}`;
};
$('git-btn').onclick = () => { $('git-panel').style.display = $('git-panel').style.display === 'none' ? 'block' : 'none'; loadGit(); };
$('git-commit').onclick = async () => {
  const msg = $('commit-msg').value.trim();
  if (!msg) return;
  await fetch('/api/git/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, session: currentSession }) });
  $('commit-msg').value = ''; loadGit();
};
$('git-diff').onclick = async () => {
  const data = await (await fetch(`/api/git/diff?session=${currentSession}`)).json();
  $('git-output').textContent = data.output || '';
};
$('settings-btn').onclick = () => { $('settings-panel').style.display = $('settings-panel').style.display === 'none' ? 'block' : 'none'; $('api-key').value = settings.keys[providerEl.value] || ''; };
$('save-settings').onclick = () => {
  settings.keys[providerEl.value] = $('api-key').value;
  settings.theme = $('theme').value;
  localStorage.setItem('wcode-settings', JSON.stringify(settings));
  applyTheme(); $('settings-panel').style.display = 'none';
};
$('device').onchange = () => {
  const v = $('device').value;
  frame.style.width = v === 'mobile' ? '375px' : v === 'tablet' ? '768px' : '100%';
  frame.style.margin = v === 'desktop' ? '0' : '0 auto';
};
sessionEl.onchange = () => { currentSession = sessionEl.value; messages = []; messagesEl.innerHTML = ''; loadFiles(); frame.src = `/preview/?session=${currentSession}`; };
promptEl.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

loadProviders(); loadSessions(); loadFiles();
