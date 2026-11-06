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
  return div;
}

function setStatus(text) { statusEl.textContent = text; }

async function send() {
  const text = promptEl.value.trim();
  if (!text) return;
  promptEl.value = '';
  messages.push({ role: 'user', content: text });
  addMessage('user', text);
  setStatus('Thinking...');

  const assistantDiv = addMessage('assistant', '');
  let fullContent = '';

  try {
    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, provider: providerEl.value })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.chunk) {
            fullContent += data.chunk;
            assistantDiv.textContent = fullContent;
            messagesEl.scrollTop = messagesEl.scrollHeight;
          }
          if (data.done) {
            messages.push({ role: 'assistant', content: data.content });
            setStatus(`Done (${data.iterations} iterations)`);
            setTimeout(refreshPreview, 300);
          }
          if (data.error) {
            assistantDiv.textContent = 'Error: ' + data.error;
            setStatus('Error');
          }
        } catch {}
      }
    }
  } catch (err) {
    assistantDiv.textContent = 'Network error: ' + err.message;
    setStatus('Failed');
  }
}

function refreshPreview() {
  frame.src = '/preview/?' + Date.now();
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
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});

refreshPreview();
