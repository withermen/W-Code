let messages = [];
let currentSession = 'default';
let apiKeys = JSON.parse(localStorage.getItem('wcode-keys') || '{}');

const messagesEl = document.getElementById('messages');
const promptEl = document.getElementById('prompt');
const providerEl = document.getElementById('provider');
const modelEl = document.getElementById('model');
const sessionEl = document.getElementById('session');
const filesEl = document.getElementById('files');
const frame = document.getElementById('frame');
const statusEl = document.getElementById('status');
const settingsEl = document.getElementById('settings');
const apiKeyInput = document.getElementById('api-key');

async function loadProviders() {
  const res = await fetch('/api/providers');
  const providers = await res.json();
  providerEl.innerHTML = providers.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  updateModels();
}
function updateModels() {
  fetch('/api/providers').then(r => r.json()).then(providers => {
    const p = providers.find(x => x.id === providerEl.value);
    modelEl.innerHTML = (p?.models || []).map(m => `<option value="${m}">${m}</option>`).join('');
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
  const res = await fetch(`/api/workspace?session=${currentSession}`);
  const data = await res.json();
  filesEl.innerHTML = (data.files || []).map(f => `<div onclick="openFile('${f}')">${f}</div>`).join('') || '(empty)';
}
function openFile(f) {
  frame.src = `/preview/${f}?session=${currentSession}&t=${Date.now()}`;
  document.getElementById('preview-url').textContent = f;
}

async function loadSessions() {
  const res = await fetch('/api/sessions');
  const list = await res.json();
  sessionEl.innerHTML = '<option value="default">Default</option>' + list.map(s => `<option value="${s}">${s}</option>`).join('');
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
      messages,
      provider: providerEl.value,
      model: modelEl.value,
      apiKey: apiKeys[providerEl.value] || '',
      session: currentSession
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
        if (d.chunk) { full += d.chunk; assistantDiv.textContent = full; }
        if (d.done) {
          messages.push({ role: 'assistant', content: d.content });
          setStatus(`Done (${d.iterations} iterations)`);
          loadFiles();
          setTimeout(() => frame.src = `/preview/?session=${currentSession}&t=${Date.now()}`, 300);
        }
        if (d.error) { assistantDiv.textContent = 'Error: ' + d.error; setStatus('Error'); }
      } catch {}
    }
  }
}

document.getElementById('send').onclick = send;
document.getElementById('refresh').onclick = () => { frame.src = `/preview/?session=${currentSession}&t=${Date.now()}`; loadFiles(); };
document.getElementById('clear').onclick = () => { messages = []; messagesEl.innerHTML = ''; setStatus(''); };
document.getElementById('new-session').onclick = async () => {
  const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const data = await res.json();
  currentSession = data.id;
  await loadSessions();
  sessionEl.value = currentSession;
  messages = []; messagesEl.innerHTML = '';
  loadFiles();
  frame.src = `/preview/?session=${currentSession}`;
};
document.getElementById('settings-btn').onclick = () => {
  settingsEl.style.display = settingsEl.style.display === 'none' ? 'block' : 'none';
  apiKeyInput.value = apiKeys[providerEl.value] || '';
};
document.getElementById('save-key').onclick = () => {
  apiKeys[providerEl.value] = apiKeyInput.value;
  localStorage.setItem('wcode-keys', JSON.stringify(apiKeys));
  settingsEl.style.display = 'none';
  setStatus('API key saved');
};
sessionEl.onchange = () => { currentSession = sessionEl.value; messages = []; messagesEl.innerHTML = ''; loadFiles(); frame.src = `/preview/?session=${currentSession}`; };
promptEl.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

loadProviders();
loadSessions();
loadFiles();
