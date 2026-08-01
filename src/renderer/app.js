// Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
    if (btn.dataset.view === 'files') loadFiles();
    if (btn.dataset.view === 'notes') loadNotes();
    if (btn.dataset.view === 'memory') loadMemory();
  });
});

const velo = window.velo;

// ===== CHAT =====
const messages = document.getElementById('messages');
const chatInput = document.getElementById('chat-input');
let history = [];

function addMsg(text, type) {
  const d = document.createElement('div');
  d.className = 'msg ' + type;
  d.textContent = text;
  messages.appendChild(d);
  messages.scrollTop = messages.scrollHeight;
}

async function updateStatus() {
  const s = await velo.ai.status();
  const el = document.getElementById('chat-status');
  el.textContent = s.hasKey ? 'AI ready' : 'Add API key in Settings';
  el.className = 'status-badge ' + (s.hasKey ? 'ok' : 'bad');
}

async function send() {
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = '';
  addMsg(text, 'user');
  history.push({ role: 'user', content: text });
  // check for local commands
  const res = await velo.ai.chat(text, history);
  if (res.ok) {
    addMsg(res.response, 'bot');
    history.push({ role: 'model', content: res.response });
  } else {
    addMsg(res.response, 'error');
    if (res.needsKey) history.pop();
  }
}

document.getElementById('send-btn').addEventListener('click', send);
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
updateStatus();

// ===== FILES =====
let currentDir = '';
const fileList = document.getElementById('file-list');

async function loadFiles(dir) {
  if (dir) { currentDir = dir; document.getElementById('file-current').textContent = dir; }
  const res = await velo.file.list(currentDir || undefined);
  if (res.error) { fileList.innerHTML = '<li>' + res.error + '</li>'; return; }
  fileList.innerHTML = '';
  if (currentDir) {
    const up = document.createElement('li');
    up.textContent = '⬆️ ..';
    up.className = 'dir';
    up.onclick = () => loadFiles(currentDir.split(/[\\\/]/).slice(0,-1).join('\\') || '');
    fileList.appendChild(up);
  }
  res.forEach(f => {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = f.name;
    name.className = f.isDir ? 'dir' : 'file';
    name.title = f.path;
    if (f.isDir) name.onclick = () => loadFiles(f.path);
    const actions = document.createElement('span');
    actions.className = 'file-actions';
    actions.innerHTML = '<button data-act="del">🗑</button>';
    li.appendChild(name); li.appendChild(actions);
    actions.querySelector('button').onclick = async () => {
      const r = await velo.file.delete(f.path);
      loadFiles();
    };
    fileList.appendChild(li);
  });
}
document.getElementById('pick-dir').addEventListener('click', async () => {
  const d = await velo.file.choosedir();
  if (d) loadFiles(d);
});
document.getElementById('file-search').addEventListener('input', async (e) => {
  const q = e.target.value.trim();
  if (!q) { loadFiles(); return; }
  const res = await velo.file.search(q, currentDir || undefined);
  fileList.innerHTML = '';
  res.slice(0,50).forEach(f => {
    const li = document.createElement('li');
    li.textContent = f.path;
    li.className = f.isDir ? 'dir' : 'file';
    fileList.appendChild(li);
  });
});

// ===== NOTES =====
async function loadNotes() {
  const list = await velo.notes.list();
  const el = document.getElementById('note-list');
  el.innerHTML = '';
  list.forEach(n => { const li = document.createElement('li'); li.textContent = '📄 ' + n; el.appendChild(li); });
}
document.getElementById('note-save').addEventListener('click', async () => {
  const title = document.getElementById('note-title').value;
  const content = document.getElementById('note-content').value;
  await velo.notes.save(title, content);
  loadNotes();
  alert('Note saved!');
});

// ===== PC =====
document.getElementById('pc-open').addEventListener('click', async () => {
  const app = document.getElementById('pc-app').value;
  await velo.pc.openapp(app);
});
document.getElementById('pc-shot').addEventListener('click', async () => {
  const r = await velo.pc.screenshot();
  document.getElementById('pc-result').textContent = r.ok ? 'Screenshot saved: ' + r.file : r.error;
});
document.getElementById('pc-shutdown').addEventListener('click', async () => {
  await velo.pc.shutdown();
});

// ===== GIT =====
document.getElementById('git-browse').addEventListener('click', async () => {
  const d = await velo.file.choosedir();
  if (d) document.getElementById('git-dir').value = d;
});
document.getElementById('git-run').addEventListener('click', async () => {
  const dir = document.getElementById('git-dir').value;
  const cmd = document.getElementById('git-cmd').value;
  const args = cmd.split(' ');
  const r = await velo.git.exec(dir, args);
  document.getElementById('git-output').textContent = r.output;
});

// ===== MEMORY =====
async function loadMemory() {
  const mem = await velo.memory.get();
  const el = document.getElementById('mem-list');
  el.innerHTML = '';
  mem.forEach(m => {
    const li = document.createElement('li');
    li.innerHTML = '<span>' + m.key + '</span>: ' + m.value;
    const del = document.createElement('button');
    del.className = 'btn';
    del.textContent = '❌';
    del.style.marginLeft = '8px';
    del.onclick = async () => { await velo.memory.delete(m.id); loadMemory(); };
    li.appendChild(del);
    el.appendChild(li);
  });
}
document.getElementById('mem-add').addEventListener('click', async () => {
  const k = document.getElementById('mem-key').value;
  const v = document.getElementById('mem-val').value;
  if (k && v) { const r = await velo.memory.add(k, v); await velo.memory.approve(r.id); loadMemory(); }
});

// ===== SETTINGS =====
document.getElementById('save-key').addEventListener('click', async () => {
  const key = document.getElementById('api-key').value.trim();
  if (!key) return;
  await velo.ai.setKey(key);
  document.getElementById('key-status').textContent = 'Key saved! Restart VELO or just start chatting.';
  updateStatus();
});
