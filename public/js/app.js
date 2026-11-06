let messages = [];
let currentSession = 'default';
const messagesEl = document.getElementById('messages');
const promptEl = document.getElementById('prompt');
const providerEl = document.getElementById('provider');
const sessionEl = document.getElementById('session');
const filesEl = document.getElementById('files');
const frame = document.getElementById('frame');
const statusEl = document.createElement('div');
statusEl.style.cssText = 'font-size:0.75rem;color:#666;padding:0.3rem 1rem;';
document.getElementById('chat').insertBefore(statusEl, document.getElementById('composer'));

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
  filesEl.innerHTML = data.files.map(f => `<div style="cursor:pointer" onclick="openFile('${f}')">${f}</div>`).join('') || '(empty)';
}
function openFile(f) {
  frame.src = `/preview/${f}?session=${currentSession}&t=${Date.now()}`;
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
    body: JSON.stringify({ messages, provider: providerEl.value, session: currentSession })
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
        if (d.done) { messages.push({ role: 'assistant', content: d.content }); setStatus(`Done (${d.iterations})`); loadFiles(); setTimeout(() => frame.src = `/preview/?session=${currentSession}&t=${Date.now()}`, 300); }
        if (d.error) { assistantDiv.textContent = 'Error: ' + d.error; }
      } catch {}
    }
  }
}

document.getElementById('send').onclick = send;
document.getElementById('refresh').onclick = () => { frame.src = `/preview/?session=${currentSession}&t=${Date.now()}`; loadFiles(); };
document.getElementById('clear').onclick = () => { messages = []; messagesEl.innerHTML = ''; };
document.getElementById('new-session').onclick = async () => {
  const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Project' }) });
  const data = await res.json();
  currentSession = data.id;
  await loadSessions();
  sessionEl.value = currentSession;
  messages = []; messagesEl.innerHTML = '';
  loadFiles();
  frame.src = `/preview/?session=${currentSession}`;
};
sessionEl.onchange = () => { currentSession = sessionEl.value; messages = []; messagesEl.innerHTML = ''; loadFiles(); frame.src = `/preview/?session=${currentSession}`; };
promptEl.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

loadSessions();
loadFiles();
