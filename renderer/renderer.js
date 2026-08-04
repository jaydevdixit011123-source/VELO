// VELO renderer - UI logic
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const state = { notes: [], tasks: [], editingNote: null, aiKey: false };

// Theme
function applyTheme(t){ document.body.dataset.theme = t || 'dark'; }

// Navigation
$$('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $$('.view').forEach(v => v.classList.remove('active'));
    $('#view-' + btn.dataset.view).classList.add('active');
  });
});

// Chat
let chatBody = $('#chatBody');
function addMsg(text, who, tag, isHtml) {
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  if (isHtml) d.innerHTML = text; else d.textContent = text;
  chatBody.appendChild(d);
  if (tag) { const t = document.createElement('div'); t.className = 'msg local-tag'; t.textContent = tag; d.appendChild(t); }
  chatBody.scrollTop = chatBody.scrollHeight;
}
async function sendChat() {
  const inp = $('#chatInput');
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';
  const w = chatBody.querySelector('.welcome'); if (w) w.remove();
  addMsg(msg, 'user');
  const typing = document.createElement('div'); typing.className='msg bot typing'; typing.textContent='VELO is thinking...'; chatBody.appendChild(typing);
  const res = await window.velo.ai.chat(msg, []);
  typing.remove();
  if (res.ok){
    addMsg(res.response, 'bot', res.local ? 'LOCAL MODE - add a free Groq key for full AI' : null);
  } else {
    addMsg('Error: ' + res.response, 'bot');
  }
  if (/remember|yaad rakh|remember that/i.test(msg)) {
    const fact = msg.replace(/remember that|remember|yaad rakh(na)?/gi,'').trim();
    if (fact) { await window.velo.memory.add(fact); showToast('Memory saved: ' + fact.substring(0, 40)); }
  }
}
$('#sendBtn').addEventListener('click', sendChat);
$('#chatInput').addEventListener('keypress', e => { if (e.key === 'Enter') sendChat(); });

// Quick Actions & Suggestions
document.addEventListener('click', e => {
  const chip = e.target.closest('[data-ask]');
  if (chip) {
    $('#chatInput').value = chip.dataset.ask;
    $('.nav-item[data-view=chat]').click();
    sendChat();
  }
});

// Notes
async function loadNotes() {
  state.notes = await window.velo.notes.get() || [];
  renderNotes();
}
function renderNotes() {
  const g = $('#notesGrid');
  if (state.notes.length === 0) { g.innerHTML = '<div class="empty">No notes yet. Click "+ New Note" to create one.</div>'; return; }
  g.innerHTML = state.notes.map((n, i) => {
    const date = n.date ? new Date(n.date).toLocaleDateString() : '';
    return `<div class="note-card" data-id="${i}">
      <h3>${escapeHtml(n.title || 'Note')}</h3>
      <p>${escapeHtml(n.body || '')}</p>
      <div class="note-date"><span>${date}</span><span class="note-del" data-del="${i}">Delete</span></div>
    </div>`;
  }).join('');
  // Delete handlers
  g.querySelectorAll('.note-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const i = parseInt(btn.dataset.del);
      state.notes.splice(i, 1);
      window.velo.notes.save(state.notes);
      renderNotes();
    });
  });
  // Edit handlers
  g.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', () => {
      const i = parseInt(card.dataset.id);
      state.editingNote = i;
      $('#noteTitle').value = state.notes[i].title || '';
      $('#noteBody').value = state.notes[i].body || '';
      $('#noteEditor').style.display = 'grid';
    });
  });
}
$('#addNoteBtn').addEventListener('click', () => {
  state.editingNote = null;
  $('#noteTitle').value = '';
  $('#noteBody').value = '';
  $('#noteEditor').style.display = 'grid';
});
$('#cancelNoteBtn').addEventListener('click', () => {
  state.editingNote = null;
  $('#noteEditor').style.display = 'none';
});
$('#saveNoteBtn').addEventListener('click', async () => {
  const t = $('#noteTitle').value.trim() || 'Note';
  const b = $('#noteBody').value.trim();
  const obj = { title: t, body: b, date: Date.now() };
  if (state.editingNote !== null && state.editingNote >= 0) {
    obj.date = state.notes[state.editingNote].date || Date.now();
    state.notes[state.editingNote] = obj;
  } else {
    state.notes.unshift(obj);
  }
  await window.velo.notes.save(state.notes);
  state.editingNote = null;
  $('#noteEditor').style.display = 'none';
  renderNotes();
  showToast('Note saved!');
});

// Tasks
async function loadTasks() {
  state.tasks = await window.velo.tasks.get() || [];
  renderTasks();
}
function renderTasks() {
  const l = $('#taskList');
  if (state.tasks.length === 0) { l.innerHTML = '<div class="empty">No tasks. Add one above.</div>'; return; }
  l.innerHTML = state.tasks.map((t, i) => {
    return `<div class="task-item ${t.done ? 'done' : ''}" data-id="${i}">
      <div class="task-chk"></div>
      <span>${escapeHtml(t.text)}</span>
      <span class="task-del" data-del="${i}">x</span>
    </div>`;
  }).join('');
  // Click to toggle
  l.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.classList.contains('task-del')) return;
      const i = parseInt(item.dataset.id);
      state.tasks[i].done = !state.tasks[i].done;
      window.velo.tasks.save(state.tasks);
      renderTasks();
    });
  });
  // Delete
  l.querySelectorAll('.task-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const i = parseInt(btn.dataset.del);
      state.tasks.splice(i, 1);
      window.velo.tasks.save(state.tasks);
      renderTasks();
    });
  });
}
$('#addTaskBtn').addEventListener('click', async () => {
  const t = $('#taskText').value.trim();
  if (!t) return;
  state.tasks.push({ text: t, done: false, date: Date.now() });
  await window.velo.tasks.save(state.tasks);
  $('#taskText').value = '';
  renderTasks();
});
$('#taskText').addEventListener('keypress', e => { if (e.key === 'Enter') $('#addTaskBtn').click(); });

// Memory
async function loadMemory() {
  const m = await window.velo.memory.get() || [];
  const l = $('#memList');
  if (m.length === 0) { l.innerHTML = '<div class="empty">No memories yet. Memories are auto-learned from your chats.</div>'; return; }
  l.innerHTML = m.slice(-30).reverse().map(mm => {
    const ts = mm.ts ? new Date(mm.ts).toLocaleString() : '';
    return `<div class="mem-item"><strong>${escapeHtml(mm.text)}</strong></div>`;
  }).join('');
}
$('#clearMemBtn').addEventListener('click', async () => {
  await window.velo.memory.clear();
  loadMemory();
  showToast('Memory cleared!');
});

// PC
document.addEventListener('click', e => {
  const card = e.target.closest('[data-pc]');
  if (card) {
    const a = card.dataset.pc;
    if (['shutdown','restart','sleep','lock'].includes(a)) {
      if (!confirm(`Are you sure you want to ${a}?`)) return;
      window.velo.pc.action(a);
    } else if (['volup','voldown'].includes(a)) {
      window.velo.pc.action(a); showToast('Volume changed!');
    } else if (['terminal'].includes(a)) {
      $('#pcCmd').value = 'cmd'; $('#pcCmd').focus();
    } else {
      window.velo.pc.open(a);
      showToast(`Opening ${a}...`);
    }
  }
});
$('#runCmdBtn').addEventListener('click', async () => {
  const c = $('#pcCmd').value.trim();
  if (!c) return;
  const out = await window.velo.pc.run(c);
  $('#pcOutput').textContent = out || 'Command ended';
});
$('#pcCmd').addEventListener('keypress', e => { if (e.key === 'Enter') $('#runCmdBtn').click(); });
async function loadSysinfo() {
  const i = await window.velo.pc.info();
  if (i) {
    $('#sysInfo').innerHTML = Object.entries(i).map(([k,v]) => `<span>${k}: ${v}</span>`).join('');
  }
}

// Load Settings
async function loadSettings() {
  const s = await window.velo.config.get();
  if (s) {
    $('#setGroqKey').value = s.groqKey || '';
    $('#setLang').value = s.language || 'hinglish';
    $('#setModel').value = s.model || 'llama-3.3-70b-versatile';
    $('#setTheme').value = s.theme || 'dark';
    $('#setWake').value = s.wakeWord || 'hey velo';
    applyTheme(s.theme);
    state.aiKey = !!(s.groqKey && s.groqKey.length > 8);
    if (state.aiKey) {
      $('#aiStatusDot').style.background = '#2bd98a';
      $('#aiStatusText').textContent = 'Groq Active';
      $('#aiStatusSub').textContent = s.model || '';
      $('#chatMode').textContent = 'GROQ';
      $('#chatMode').style.background = '#2bd98a';
    }
  }
}
$('#saveSettingsBtn').addEventListener('click', async () => {
  const patch = {
    groqKey: $('#setGroqKey').value.trim(),
    language: $('#setLang').value,
    model: $('#setModel').value,
    theme: $('#setTheme').value,
    wakeWord: $('#setWake').value.trim() || 'hey velo'
  };
  await window.velo.config.set(patch);
  applyTheme(patch.theme);
  state.aiKey = !!(patch.groqKey && patch.groqKey.length > 8);
  if (state.aiKey) {
    $('#aiStatusDot').style.background = '#2bd98a';
    $('#aiStatusText').textContent = 'Groq Active';
    $('#aiStatusSub').textContent = patch.model || '';
    $('#chatMode').textContent = 'GROQ';
    $('#chatMode').style.background = '#2bd98a';
  }
  showToast('Settings saved!');
});

// Toast
function showToast(msg){
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// Html escape
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ---------- init ----------
(async function init(){
  await loadSettings();
  await loadNotes();
  await loadTasks();
  await loadMemory();
  loadSysinfo();
})();