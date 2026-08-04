// VELO renderer - UI logic
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const state = { notes: [], tasks: [], editingNote: null };

// ---------- Theme ----------
function applyTheme(t){ document.body.dataset.theme = t || 'dark'; }

// ---------- Navigation ----------
$$('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $$('.view').forEach(v => v.classList.remove('active'));
    $('#view-' + btn.dataset.view).classList.add('active');
  });
});

// ---------- Chat ----------
const chatBody = $('#chatBody');
function addMsg(text, who, tag) {
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  d.textContent = text;
  chatBody.appendChild(d);
  if (tag) { const t = document.createElement('div'); t.className = 'msg local-tag'; t.textContent = tag; d.appendChild(t); }
  chatBody.scrollTop = chatBody.scrollHeight;
}
async function sendChat() {
  const inp = $('#chatInput');
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';
  // hide welcome
  const w = chatBody.querySelector('.welcome'); if (w) w.remove();
  addMsg(msg, 'user');
  const typing = document.createElement('div'); typing.className='msg bot typing'; typing.textContent='VELO is thinking...'; chatBody.appendChild(typing);
  const res = await window.velo.ai.chat(msg, []);
  typing.remove();
  if (res.ok){ addMsg(res.response, 'bot', res.local ? 'LOCAL MODE · add a free Groq key for full AI' : null); }
  else { addMsg('⚠️ ' + res.response, 'bot'); }
  // auto-learn useful things
  if (/remember|yaad rakh|remember that/i.test(msg)) {
    const fact = msg.replace(/remember that|remember|yaad rakh(na)?/gi,'').trim();
    if (fact) { await window.velo.memory.add(fact); }
  }
}
$('#sendBtn').addEventListener('click', sendChat);
$('#chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });
$$('.chip').forEach(c => c.addEventListener('click', () => {
  $('#chatInput').value = c.dataset.ask; sendChat();
}));
$('#micBtn').addEventListener('click', () => $('#chatInput').placeholder = 'Voice is available in the full build — type for now');

// ---------- Notes ----------
async function loadNotes(){
  state.notes = await window.velo.notes.get();
  const grid = $('#notesGrid');
  grid.innerHTML = '';
  if (!state.notes.length){ grid.innerHTML = '<p class="muted">No notes yet. Click "+ New Note" to create one.</p>'; return; }
  state.notes.forEach((n,i) => {
    const c = document.createElement('div'); c.className = 'note-card';
    c.innerHTML = `<h4>${escapeHtml(n.title||'Untitled')}</h4><p>${escapeHtml(n.body||'')}</p><button class="note-del" data-i="${i}">🗑</button>`;
    c.addEventListener('click', (e) => { if(e.target.classList.contains('note-del')) return; openEditor(i); });
    grid.appendChild(c);
  });
  $$('.note-del').forEach(b => b.addEventListener('click', async (e) => {
    e.stopPropagation();
    state.notes.splice(+b.dataset.i,1); await window.velo.notes.save(state.notes); loadNotes();
  }));
}
function openEditor(i){
  state.editingNote = i;
  const n = state.notes[i] || {title:'',body:''};
  $('#noteTitle').value = n.title; $('#noteBody').value = n.body;
  $('#noteEditor').classList.remove('hidden');
}
$('#addNoteBtn').addEventListener('click', () => { state.editingNote = null; $('#noteTitle').value=''; $('#noteBody').value=''; $('#noteEditor').classList.remove('hidden'); });
$('#saveNoteBtn').addEventListener('click', async () => {
  const title = $('#noteTitle').value.trim(), body = $('#noteBody').value.trim();
  if (!title && !body) return;
  if (state.editingNote !== null) state.notes[state.editingNote] = {title, body};
  else state.notes.push({title, body});
  await window.velo.notes.save(state.notes);
  $('#noteEditor').classList.add('hidden'); loadNotes();
});
$('#cancelNoteBtn').addEventListener('click', () => $('#noteEditor').classList.add('hidden'));

// ---------- Tasks ----------
async function loadTasks(){
  state.tasks = await window.velo.tasks.get();
  const ul = $('#taskList'); ul.innerHTML='';
  if (!state.tasks.length){ ul.innerHTML = '<p class="muted">No tasks yet. Add a reminder above.</p>'; return; }
  state.tasks.forEach((t,i) => {
    const li = document.createElement('li'); li.className='task-item' + (t.done?' done':'');
    li.innerHTML = `<span class="tick">${t.done?'✓':''}</span><span class="t-text">${escapeHtml(t.text)}</span><button class="t-del" data-i="${i}">✕</button>`;
    li.querySelector('.tick').addEventListener('click', async () => { state.tasks[i].done = !state.tasks[i].done; await window.velo.tasks.save(state.tasks); loadTasks(); });
    li.querySelector('.t-del').addEventListener('click', async () => { state.tasks.splice(i,1); await window.velo.tasks.save(state.tasks); loadTasks(); });
    ul.appendChild(li);
  });
}
$('#addTaskBtn').addEventListener('click', async () => {
  const t = $('#taskText').value.trim(); if(!t) return;
  state.tasks.push({text:t, done:false}); await window.velo.tasks.save(state.tasks); $('#taskText').value=''; loadTasks();
});
$('#taskText').addEventListener('keydown', e => { if(e.key==='Enter') $('#addTaskBtn').click(); });

// ---------- Memory ----------
async function loadMemory(){
  const mem = await window.velo.memory.get();
  const ul = $('#memList'); ul.innerHTML='';
  if(!mem.length){ ul.innerHTML = '<p class="muted">Nothing remembered yet.</p>'; return; }
  mem.slice().reverse().forEach(m => { const li=document.createElement('li'); li.className='mem-item'; li.textContent=m.text; ul.appendChild(li); });
}
$('#clearMemBtn').addEventListener('click', async () => { await window.velo.memory.clear(); loadMemory(); });

// ---------- PC ----------
$$('.pc-card').forEach(c => c.addEventListener('click', async () => {
  const type = c.dataset.pc, val = c.dataset.val;
  if(type==='open') await window.velo.pc.open(val);
  else if(type==='action') await window.velo.pc.action(val);
  else if(type==='run') { const r=await window.velo.pc.run(val); $('#pcOutput').textContent='$ '+val+'\n'+r; }
}));
$('#runCmdBtn').addEventListener('click', async () => {
  const cmd = $('#pcCmd').value.trim(); if(!cmd) return;
  const r = await window.velo.pc.run(cmd);
  $('#pcOutput').textContent = '> '+cmd+'\n'+(r||''); $('#pcCmd').value='';
});
async function loadSysInfo(){
  const info = await window.velo.pc.info();
  $('#sysInfo').innerHTML = Object.entries(info).map(([k,v])=>`<div class="si"><b>${k}</b>${v}</div>`).join('');
}

// ---------- Settings ----------
async function loadSettings(){
  const cfg = await window.velo.config.get();
  $('#setGroqKey').value = cfg.groqKey || '';
  $('#setModel').value = cfg.model || 'llama-3.3-70b-versatile';
  $('#setLang').value = cfg.language || 'hinglish';
  $('#setTheme').value = cfg.theme || 'dark';
  $('#setWake').value = cfg.wakeWord || 'hey velo';
  applyTheme(cfg.theme);
  updateStatus(cfg);
}
function updateStatus(cfg){
  $('#aiStatusText').textContent = cfg.groqKey ? 'Online AI' : 'Local Mode';
  $('#aiStatusSub').textContent = cfg.groqKey ? 'Groq connected·free' : 'Free, no key needed';
  $('#aiStatusDot').classList.toggle('offline', !cfg.groqKey);
  $('#chatMode').textContent = cfg.groqKey ? 'ONLINE' : 'OFFLINE';
  $('#chatMode').classList.toggle('online', !!cfg.groqKey);
}
$('#saveKeyBtn').addEventListener('click', async () => {
  await window.velo.config.set({ groqKey: $('#setGroqKey').value.trim() });
  loadSettings(); toast('Groq key saved ✓');
});
$('#saveSettingsBtn').addEventListener('click', async () => {
  await window.velo.config.set({ model: $('#setModel').value, language: $('#setLang').value, theme: $('#setTheme').value, wakeWord: $('#setWake').value });
  loadSettings(); toast('Settings saved ✓');
});
$('#setTheme').addEventListener('change', () => applyTheme($('#setTheme').value));

// ---------- toast ----------
function toast(msg){
  let t = $('#toast'); if(!t){ t=document.createElement('div'); t.id='toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2200);
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ---------- init ----------
(async function init(){
  await loadSettings();
  await loadNotes();
  await loadTasks();
  await loadMemory();
  loadSysInfo();
})();
