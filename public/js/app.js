const messages = [];
const messagesEl = document.getElementById('messages');
const promptEl = document.getElementById('prompt');
const providerEl = document.getElementById('provider');
const frame = document.getElementById('frame');

function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.textContent = content;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function send() {
  const text = promptEl.value.trim();
  if (!text) return;
  promptEl.value = '';
  messages.push({ role: 'user', content: text });
  addMessage('user', text);

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
    return;
  }
  messages.push({ role: 'assistant', content: data.content });
  addMessage('assistant', data.content);
  setTimeout(refreshPreview, 400);
}

function refreshPreview() {
  frame.src = '/preview/?' + Date.now();
}

function clearChat() {
  messages.length = 0;
  messagesEl.innerHTML = '';
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

// Initial preview
refreshPreview();
