let messages = [];
let currentSession = 'default';
let settings = JSON.parse(localStorage.getItem('wcode-settings') || '{"keys":{},"temperature":0.2,"maxTokens":4096,"theme":"dark"}');

const $ = id => document.getElementById(id);
const messagesEl = $('messages'), promptEl = $('prompt'), providerEl = $('provider'), modelEl = $('model');
const sessionEl = $('session'), filesEl = $('files'), frame = $('frame'), statusEl = $('status');

function applyTheme() {
  document.body.className = settings.theme === 'light' ? 'light' : '';
}
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

function addMessage(role, content, isTool = false) {
  const div = document.createElement('div');
  div.className = 'msg ' + role + (isTool ? ' tool' : '');
  div.textContent = content;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}
function setStatus(t) { statusEl.textContent = t; }

async function loadFiles() {
  const data = await (await fetch(`/api/workspace?session=${currentSession}`)).json();
  function render(nodes, depth = 0) {
    return nodes.map(n => {
      if (n.type === 'dir') return `<div style="padding-left:${depth*12}px">📁 ${n.name.split('/').pop()} ${render(n.children || [], depth+1)}</div>`;
      return `<div style="padding-left:${depth*12}px;cursor:pointer" onclick="openFile('${n.name}')">${n.name.split('/').pop()}</div>`;
    }).join('');
  }
  filesEl.innerHTML = render(data.tree || []) || '(empty)';
}
function openFile(f) {
  frame.src = `/preview/${f}?session=${currentSession}&t=${Date.now()}`;
  $('preview-url').textContent = f;
  promptEl.value += `\n[File: ${f}]\n`;
}

async function loadSessions() {
  const list = await (await fetch('/api/sessions')).json();
  sessionEl.innerHTML = '<option value="default">Default</option>' + list.map(s => `<option value="${s}">${s}</option>`).join('');
}

async function loadTemplates() {
  const tpls = await (await fetch('/api/templates')).json();
  $('template-list').innerHTML = tpls.map(t => `<button onclick="applyTpl('${t.id}')">${t.name}</button>`).join(' ');
}
async function applyTpl(id) {
  await fetch('/api/templates/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template: id, session: currentSession }) });
  loadFiles();
  setStatus('Template applied');
}

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
    body: JSON.stringify({
      messages, provider: providerEl.value, model: modelEl.value,
      apiKey: settings.keys[providerEl.value] || '', session: currentSession,
      temperature: settings.temperature
    })
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
        if (d.chunk) {
          full += d.chunk;
          assistantDiv.textContent = full;
          if (d.chunk.includes('[Tool')) assistantDiv.classList.add('tool');
        }
        if (d.done) {
          messages.push({ role: 'assistant', content: d.content });
          setStatus(`Done (${d.iterations})`);
          loadFiles();
          setTimeout(() => frame.src = `/preview/?session=${currentSession}&t=${Date.now()}`, 300);
        }
        if (d.error) { assistantDiv.textContent = 'Error: ' + d.error; setStatus('Error'); }
      } catch {}
    }
  }
}

$('send').onclick = send;
$('refresh').onclick = () => { frame.src = `/preview/?session=${currentSession}&t=${Date.now()}`; loadFiles(); };
$('clear').onclick = () => { messages = []; messagesEl.innerHTML = ''; setStatus(''); };
$('new-session').onclick = async () => {
  const data = await (await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
  currentSession = data.id;
  await loadSessions(); sessionEl.value = currentSession;
  messages = []; messagesEl.innerHTML = ''; loadFiles();
  frame.src = `/preview/?session=${currentSession}`;
};
$('settings-btn').onclick = () => { $('settings-panel').style.display = $('settings-panel').style.display === 'none' ? 'block' : 'none'; $('api-key').value = settings.keys[providerEl.value] || ''; };
$('save-settings').onclick = () => {
  settings.keys[providerEl.value] = $('api-key').value;
  settings.temperature = parseFloat($('temperature').value);
  settings.maxTokens = parseInt($('max-tokens').value);
  settings.theme = $('theme').value;
  localStorage.setItem('wcode-settings', JSON.stringify(settings));
  applyTheme();
  $('settings-panel').style.display = 'none';
  setStatus('Settings saved');
};
$('export-settings').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' }));
  a.download = 'wcode-settings.json'; a.click();
};
$('import-settings').onclick = () => $('import-file').click();
$('import-file').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { settings = JSON.parse(r.result); localStorage.setItem('wcode-settings', JSON.stringify(settings)); applyTheme(); setStatus('Imported'); };
  r.readAsText(f);
};
$('templates-btn').onclick = () => { $('templates-panel').style.display = $('templates-panel').style.display === 'none' ? 'block' : 'none'; loadTemplates(); };
$('device').onchange = () => {
  const v = $('device').value;
  frame.style.width = v === 'mobile' ? '375px' : v === 'tablet' ? '768px' : '100%';
  frame.style.margin = v === 'desktop' ? '0' : '0 auto';
};
sessionEl.onchange = () => { currentSession = sessionEl.value; messages = []; messagesEl.innerHTML = ''; loadFiles(); frame.src = `/preview/?session=${currentSession}`; };
promptEl.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

loadProviders(); loadSessions(); loadFiles();
