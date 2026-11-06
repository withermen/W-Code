const messages = [];
const messagesEl = document.getElementById('messages');
const promptEl = document.getElementById('prompt');
const providerEl = document.getElementById('provider');
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
}

function setStatus(text) {
  statusEl.textContent = text;
}

async function send() {
  const text = promptEl.value.trim();
  if (!text) return;
  promptEl.value = '';
  messages.push({ role: 'user', content: text });
  addMessage('user', text);
  setStatus('Thinking...');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        provider: providerEl.value
      })
    });
    const data = await res.json();
    if (data.error) {
      addMessage('assistant', 'Error: ' + data.error);
      setStatus('Error');
      return;
    }
    messages.push({ role: 'assistant', content: data.content });
    addMessage('assistant', data.content);
    setStatus(`Done (${data.iterations || 1} iterations)`);
    setTimeout(refreshPreview, 300);
  } catch (err) {
    addMessage('assistant', 'Network error: ' + err.message);
    setStatus('Failed');
  }
}

function refreshPreview() {
  frame.src = '/preview/?' + Date.now();
  setStatus('Preview refreshed');
}

function clearChat() {
  messages.length = 0;
  messagesEl.innerHTML = '';
  setStatus('');
}

document.getElementById('send').onclick = send;
document.getElementById('refresh').onclick = refreshPreview;
document.getElementById('clear').onclick = clearChat;
promptEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

refreshPreview();
