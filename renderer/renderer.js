// VELO renderer v3.1 - UI logic with error handling
(function() {
'use strict';

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// State
let notes = [], tasks = [];

// Toast
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// Ensure window.velo exists
if (!window.velo) {
  document.body.innerHTML = '<div style="color:red;padding:40px;text-align:center;"><h2>VELO Preload Failed</h2><p>window.velo is undefined. Preload script may have failed.</p></div>';
  throw new Error('preload not loaded');
}

// ===== Theme =====
function applyTheme(t) { document.body.dataset.theme = t || 'dark'; }

// ===== Navigation =====
$$('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $$('.view').forEach(v => v.classList.remove('active'));
    const target = $('#view-' + btn.dataset.view);
    if (target) target.classList.add('active');
  });
});

// ===== CHAT =====
const chatBody = $('#chatBody');
function addMsg(text, who, tag) {
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  d.textContent = text;
  if (tag) {
    const t = document.createElement('div');
    t.className = 'local-tag';
    t.textContent = tag;
    d.appendChild(t);
  }
  chatBody.appendChild(d);
  chatBody.scrollTop = chatBody.scrollHeight;
}

async function sendChat() {
  const inp = $('#chatInput');
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';
  inp.style.height = 'auto';
  const w = chatBody.querySelector('.welcome');
  if (w) w.remove();

  addMsg(msg, 'user');
  const typing = document.createElement('div');
  typing.className = 'msg bot typing';
  typing.textContent = '...';
  chatBody.appendChild(typing);

  try {
    const res = await window.velo.ai.chat(msg, []);
    typing.remove();
    if (res.ok) {
      addMsg(res.response, 'bot', res.local ? 'LOCAL MODE — add free Groq key in Settings' : null);
    } else {
      addMsg('Error: ' + res.response, 'bot');
    }
    // Auto-learn
    if (/remember|yaad rakh/i.test(msg)) {
      const fact = msg.replace(/remember that\b|remember\b|yaad rakh(na)?\b/gi, '').trim().substring(0, 300);
      if (fact) { await window.velo.memory.add(fact); toast('Memory saved!'); }
    }
  } catch (e) {
    typing.remove();
    addMsg('Error: ' + e.message, 'bot');
  }
}

$('#sendBtn').addEventListener('click', sendChat);
$('#chatInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
});
$('#chatInput').addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Mic button
let recognition = null;
$('#micBtn').addEventListener('click', () => {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    toast('Voice not supported in this environment');
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!recognition) {
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      $('#chatInput').value = text;
      toast('Heard: ' + text);
    };
    recognition.onerror = (e) => toast('Voice error: ' + e.error);
    recognition.onend = () => { $('#micBtn').style.background = ''; };
  }
  try {
    recognition.start();
    $('#micBtn').style.background = 'var(--danger)';
    toast('Listening...');
  } catch (_) { toast('Voice already active'); }
});

// Quick chips
$$('.chip').forEach(c => {
  c.addEventListener('click', () => {
    $('#chatInput').value = c.dataset.ask;
    sendChat();
  });
});

// ===== NOTES =====
async function loadNotes() {
  try { notes = await window.velo.notes.get() || []; } catch (_) { notes = []; }
  renderNotes();
}
function renderNotes() {
  const grid = $('#notesGrid');
  if (!grid) return;
  grid.innerHTML = notes.length === 0
    ? '<div class="welcome"><p>No notes yet. Create one!</p></div>'
    : notes.map((n, i) => `<div class="note-card" data-idx="${i}">
      <button class="note-del" data-del="${i}" title="Delete">×</button>
      <h4>${esc(n.title || 'Untitled')}</h4>
      <p>${esc(n.body || '').substring(0, 200)}</p>
    </div>`).join('');

  $$('.note-del').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    notes.splice(parseInt(b.dataset.del), 1);
    window.velo.notes.save(notes);
    renderNotes();
    toast('Note deleted');
  }));
  $$('.note-card').forEach(c => c.addEventListener('click', () => {
    const n = notes[parseInt(c.dataset.idx)];
    openNoteEditor(n, parseInt(c.dataset.idx));
  }));
}

let editingIdx = -1;
function openNoteEditor(note, idx) {
  editingIdx = idx;
  const editor = $('#noteEditor');
  editor.style.display = 'grid';
  $('#noteEditorTitle').textContent = note && note.title ? 'Edit Note' : 'New Note';
  $('#noteTitle').value = note ? (note.title || '') : '';
  $('#noteBody').value = note ? (note.body || '') : '';
}
$('#addNoteBtn').addEventListener('click', () => openNoteEditor(null, -1));
$('#cancelNoteBtn').addEventListener('click', () => { $('#noteEditor').style.display = 'none'; });
$('#saveNoteBtn').addEventListener('click', async () => {
  const nt = { title: $('#noteTitle').value.trim(), body: $('#noteBody').value.trim() };
  if (!nt.title && !nt.body) { toast('Note is empty'); return; }
  if (editingIdx >= 0 && editingIdx < notes.length) {
    notes[editingIdx] = nt;
  } else {
    notes.push(nt);
  }
  await window.velo.notes.save(notes);
  $('#noteEditor').style.display = 'none';
  renderNotes();
  toast('Note saved!');
});

// ===== TASKS =====
async function loadTasks() {
  try { tasks = await window.velo.tasks.get() || []; } catch (_) { tasks = []; }
  renderTasks();
}
function renderTasks() {
  const el = $('#taskList');
  if (!el) return;
  el.innerHTML = tasks.length === 0
    ? '<div class="welcome"><p>No tasks yet.</p></div>'
    : tasks.map((t, i) => `<div class="task-item${t.done ? ' done' : ''}">
      <input type="checkbox" data-tidx="${i}" ${t.done ? 'checked' : ''}>
      <span>${esc(t.text)}</span>
      <button class="task-del" data-tdel="${i}">×</button>
    </div>`).join('');

  $$('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', async function() {
    tasks[parseInt(this.dataset.tidx)].done = this.checked;
    await window.velo.tasks.save(tasks);
    renderTasks();
  }));
  $$('.task-del').forEach(b => b.addEventListener('click', async function() {
    tasks.splice(parseInt(this.dataset.tdel), 1);
    await window.velo.tasks.save(tasks);
    renderTasks();
    toast('Task removed');
  }));
}
$('#addTaskBtn').addEventListener('click', async () => {
  const txt = $('#taskText').value.trim();
  if (!txt) return;
  tasks.push({ text: txt, done: false });
  await window.velo.tasks.save(tasks);
  $('#taskText').value = '';
  renderTasks();
  toast('Task added!');
});
$('#taskText').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('#addTaskBtn').click();
});

// ===== MEMORY =====
async function loadMemory() {
  try {
    const m = await window.velo.memory.get() || [];
    const el = $('#memList');
    if (!el) return;
    if (m.length === 0) {
      el.innerHTML = '<div class="welcome"><p>No memories yet. Chat with VELO to build them!</p></div>';
      return;
    }
    el.innerHTML = m.slice().reverse().map(m => {
      const d = new Date(m.time || m.ts || 0);
      const ds = isNaN(d.getTime()) ? '' : d.toLocaleDateString();
      return `<div class="mem-item"><span>${esc(m.text)}</span><span class="mem-time">${ds}</span></div>`;
    }).join('');
  } catch (_) { $('#memList').innerHTML = '<div class="welcome"><p>Memory unavailable.</p></div>'; }
}
$('#clearMemBtn').addEventListener('click', async () => {
  if (confirm('Clear all memories?')) {
    await window.velo.memory.clear();
    loadMemory();
    toast('Memory cleared');
  }
});

// ===== PC =====
$$('.pc-card').forEach(c => {
  c.addEventListener('click', () => {
    const action = c.dataset.pc;
    if (action === 'shutdown' || action === 'restart') {
      const cap = action.charAt(0).toUpperCase() + action.slice(1);
      if (!confirm(`${cap} your PC?`)) return;
    }
    if (action.startsWith('open ')) {
      window.velo.pc.open(action.replace('open ', ''));
      toast('Opening ' + action.replace('open ', '') + '...');
    } else {
      window.velo.pc.action(action);
      toast(action.charAt(0).toUpperCase() + action.slice(1) + '...');
    }
  });
});

$('#runCmdBtn').addEventListener('click', async () => {
  const cmd = $('#pcCmd').value.trim();
  if (!cmd) return;
  const out = $('#pcOutput');
  out.textContent = 'Running...';
  try {
    const result = await window.velo.pc.run(cmd);
    out.textContent = result;
  } catch (e) {
    out.textContent = 'Error: ' + e.message;
  }
});
$('#pcCmd').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('#runCmdBtn').click();
});

async function loadSysInfo() {
  try {
    const info = await window.velo.pc.info();
    if (info && !info.error) {
      $('#sysInfo').textContent = `System: ${info.platform} ${info.arch} | CPU cores: ${info.cpus} | RAM: ${info.ram} | Host: ${info.hostname} | v${info.version}`;
    } else {
      $('#sysInfo').textContent = 'System info unavailable';
    }
  } catch (_) { $('#sysInfo').textContent = 'System info unavailable'; }
}

// ===== SETTINGS =====
async function loadSettings() {
  try {
    const cfg = await window.velo.config.get();
    if (cfg) {
      $('#setGroqKey').value = cfg.groqKey || '';
      $('#setModel').value = cfg.model || 'llama-3.3-70b-versatile';
      $('#setLang').value = cfg.language || 'hinglish';
      $('#setTheme').value = cfg.theme || 'dark';
      $('#setWake').value = cfg.wakeWord || 'hey velo';
      applyTheme(cfg.theme);
      updateStatus(cfg.groqKey);
    }
  } catch (_) { /* ignore */ }
}

function updateStatus(hasKey) {
  const dot = $('#aiStatusDot');
  const txt = $('#aiStatusText');
  const sub = $('#aiStatusSub');
  const badge = $('#chatMode');
  if (hasKey) {
    dot.style.background = 'var(--green)';
    txt.textContent = 'Groq Active';
    sub.textContent = 'Full AI chat ready';
    if (badge) { badge.textContent = 'AI ONLINE'; badge.style.color = 'var(--green)'; }
  } else {
    dot.style.background = '#888';
    txt.textContent = 'Local Mode';
    sub.textContent = 'Free — no key needed';
    if (badge) { badge.textContent = 'OFFLINE'; badge.style.color = 'var(--muted)'; }
  }
}

$('#saveKeyBtn').addEventListener('click', async () => {
  const key = $('#setGroqKey').value.trim();
  if (!key) return toast('Enter a Groq API key');
  try {
    await window.velo.ai.setKey(key);
    await window.velo.config.set({ groqKey: key });
    updateStatus(key);
    toast('Key saved! AI chat ready.');
  } catch (e) { toast('Error: ' + e.message); }
});

$('#saveSettingsBtn').addEventListener('click', async () => {
  const cfg = {
    model: $('#setModel').value,
    language: $('#setLang').value,
    theme: $('#setTheme').value,
    wakeWord: $('#setWake').value
  };
  try {
    const updated = await window.velo.config.set(cfg);
    applyTheme(updated.theme);
    toast('Settings saved!');
  } catch (e) { toast('Error: ' + e.message); }
});

$('#setTheme').addEventListener('change', () => applyTheme($('#setTheme').value));

// ===== Helpers =====
function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s || '');
  return d.innerHTML;
}

// ===== Init =====
(async function init() {
  console.log('[VELO] Initializing...');
  try {
    await loadSettings();
    await loadNotes();
    await loadTasks();
    await loadMemory();
    loadSysInfo();
    console.log('[VELO] Ready!');
  } catch (e) {
    console.error('[VELO] Init error:', e);
  }
})();

})();
