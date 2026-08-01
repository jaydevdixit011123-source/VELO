/* VELO v2 - renderer logic */
const $ = (id) => document.getElementById(id);
const V = window.velo;
let currentDir = null;
let ttsOn = true;

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

/* ===== NAVIGATION ===== */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    $('view-' + btn.dataset.view).classList.add('active');
  });
});

/* ===== CHAT ===== */
const messagesEl = $('messages');
let history = [];
function addMsg(role, text, extra) {
  const d = document.createElement('div');
  d.className = 'msg ' + role + (extra ? ' ' + extra : '');
  d.textContent = text;
  messagesEl.appendChild(d);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return d;
}
async function sendChat(text) {
  text = text.trim();
  if (!text) return;
  addMsg('user', text);
  history.push({ role: 'user', content: text });
  $('chat-input').value = '';
  const typing = addMsg('bot', 'VELO soch raha hai...', 'typing');
  try {
    const res = await V.ai.chat(text, history.slice(-20));
    typing.remove();
    if (res.ok) {
      addMsg('bot', res.response);
      history.push({ role: 'assistant', content: res.response });
      if (ttsOn) speak(res.response);
    } else {
      addMsg('err', res.response);
      if (res.needsKey) toast('Settings me API key daalo');
    }
  } catch (e) {
    typing.remove();
    addMsg('err', 'Error: ' + e.message);
  }
}
$('send-btn').addEventListener('click', () => sendChat($('chat-input').value));
$('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(e.target.value); });

/* ===== VOICE (Web Speech API - free, Hindi+English) ===== */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, listening = false, wakeMode = false;
function setListening(on) {
  listening = on;
  $('mic-btn').classList.toggle('listening', on);
  $('voice-orb')?.classList.toggle('listening', on);
  $('voice-state').textContent = on ? 'Sun raha hoon...' : 'Bolna shuru karo';
  if (on) $('voice-state').textContent = 'Sun raha hoon...';
}
function startRec(continuous, wake) {
  if (!SR) { toast('Is app me voice support nahi hai'); return; }
  wakeMode = !!wake;
  if (rec) { try { rec.stop(); } catch (e) {} }
  rec = new SR();
  rec.lang = 'hi-IN';
  rec.continuous = !!continuous;
  rec.interimResults = false;
  rec.onresult = (ev) => {
    const text = Array.from(ev.results).map(r => r[0].transcript).join(' ').trim();
    if (wakeMode) {
      const low = text.toLowerCase();
      if (low.includes('hey velo') || low.includes('ok velo') || low.includes('hello velo')) {
        const q = text.replace(/hey velo|ok velo|hello velo/gi, '').trim();
        $('voice-transcript').textContent = 'Suna: ' + text;
        if (q) { setListening(false); switchToChat(q); }
        else toast('Bolo, kya karna hai?');
      }
    } else {
      $('voice-transcript').textContent = 'Suna: ' + text;
      if (text) { setListening(false); switchToChat(text); }
    }
  };
  rec.onerror = () => { setListening(false); toast('Voice error - dobara try karo'); };
  rec.onend = () => { if (wakeMode && listening) { try { rec.start(); } catch (e) {} } };
  try { rec.start(); setListening(true); } catch (e) { toast('Mic access nahi mila'); }
}
function switchToChat(text) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'chat'));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-chat'));
  $('chat-input').value = text;
  sendChat(text);
}
$('mic-btn').addEventListener('click', () => {
  if (listening) { rec && rec.stop(); setListening(false); }
  else startRec(false, false);
});
$('voice-start').addEventListener('click', () => { $('voice-transcript').textContent = ''; startRec(false, false); });
$('voice-stop').addEventListener('click', () => { rec && rec.stop(); setListening(false); });
$('voice-fab').addEventListener('click', () => {
  if (listening) { rec && rec.stop(); setListening(false); return; }
  startRec(true, true);
  toast('"Hey Velo" bolo...');
});

/* ===== TEXT TO SPEECH ===== */
function speak(text) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*#`]/g, ''));
    u.lang = 'hi-IN';
    u.rate = 1;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

/* ===== FILES ===== */
async function loadFiles(dir) {
  if (dir) currentDir = dir;
  const d = currentDir;
  $('files-path').textContent = d || 'Loading...';
  const res = await V.file.list(d);
  const el = $('files-list');
  el.innerHTML = '';
  if (res.error) { el.innerHTML = '<div class="list-item"><span class="name">' + res.error + '</span></div>'; return; }
  if (currentDir) {
    const up = document.createElement('div');
    up.className = 'list-item';
    up.innerHTML = '<span class="name" style="color:#a78bfa;">.. (up)</span>';
    up.addEventListener('click', () => {
      const parent = currentDir.split(/[\\/]/).slice(0, -1).join('\\');
      loadFiles(parent);
    });
    el.appendChild(up);
  }
  const sorted = res.sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name));
  sorted.forEach(f => {
    const item = document.createElement('div');
    item.className = 'list-item';
    const icon = f.isDir ? '\ud83d\udcc1' : '\ud83d\uddc4';
    item.innerHTML = '<span class="name">' + icon + ' ' + f.name + '</span>' +
      '<button class="btn-sm" data-act="open">Open</button>' +
      '<button class="btn-sm" data-act="rename">Rename</button>' +
      '<button class="btn-sm danger" data-act="del">Delete</button>';
    item.querySelector('[data-act=open]').addEventListener('click', async () => {
      if (f.isDir) loadFiles(f.path);
      else { const r = await V.file.open(f.path); if (r.ok) toast('Khol diya'); }
    });
    item.querySelector('[data-act=rename]').addEventListener('click', async () => {
      const nn = prompt('Naya naam:', f.name);
      if (nn && nn !== f.name) { const r = await V.file.rename(f.path, nn); r.ok ? toast('Renamed') : toast(r.error); loadFiles(); }
    });
    item.querySelector('[data-act=del]').addEventListener('click', async () => {
      const r = await V.file.delete(f.path);
      if (r.ok) { toast('Delete ho gaya'); loadFiles(); }
    });
    el.appendChild(item);
  });
}
$('files-home').addEventListener('click', () => { currentDir = null; loadFiles(); });
$('files-choose').addEventListener('click', async () => { const d = await V.file.choosedir(); if (d) loadFiles(d); });
$('files-search-btn').addEventListener('click', async () => {
  const q = $('files-search').value.trim();
  if (!q) return toast('Search text daalo');
  const res = await V.file.search(q, currentDir);
  const el = $('files-list');
  el.innerHTML = '<div class="list-item"><span class="sub">Results: ' + (res.length || 0) + '</span></div>';
  (res || []).forEach(f => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = '<span class="name">' + (f.isDir ? '\ud83d\udcc1 ' : '\ud83d\uddc4 ') + f.name + '</span><span class="sub">' + f.path + '</span>';
    el.appendChild(item);
  });
});

/* ===== NOTES ===== */
async function loadNotes() {
  const list = await V.notes.list();
  const el = $('notes-list');
  el.innerHTML = '';
  if (!list.length) { el.innerHTML = '<div class="list-item"><span class="sub">Koi note nahi. Upar add karo.</span></div>'; return; }
  list.forEach(n => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.style.flexDirection = 'column';
    item.style.alignItems = 'flex-start';
    item.innerHTML = '<strong>' + n.title + '</strong><span class="sub">' + (n.body || '') + '</span>';
    const del = document.createElement('button');
    del.className = 'btn-sm danger';
    del.textContent = 'Delete';
    del.addEventListener('click', async () => { await V.notes.delete(n.id); loadNotes(); });
    item.appendChild(del);
    el.appendChild(item);
  });
}
$('note-add').addEventListener('click', async () => {
  const t = $('note-title').value.trim(), b = $('note-body').value.trim();
  if (!t && !b) return toast('Kuch to likho');
  await V.notes.add(t, b);
  $('note-title').value = ''; $('note-body').value = '';
  loadNotes();
});

/* ===== PC CONTROL ===== */
$('pc-open').addEventListener('click', async () => {
  const a = $('pc-app').value.trim();
  if (!a) return toast('App ka naam likho');
  const r = await V.pc.openapp(a);
  r.ok ? toast(a + ' khol raha hoon...') : toast(r.error);
});
$('vol-up').addEventListener('click', () => V.pc.volume('up'));
$('vol-down').addEventListener('click', () => V.pc.volume('down'));
$('vol-mute').addEventListener('click', () => V.pc.volume('mute'));
$('pc-shot').addEventListener('click', async () => {
  const r = await V.pc.screenshot();
  if (r.ok) { $('shot-path').textContent = 'Saved: ' + r.path; toast('Screenshot saved'); }
  else toast(r.error);
});
$('pc-shutdown').addEventListener('click', async () => {
  if (!confirm('Shutdown in 30 seconds? Cancel karne ke liye Cancel Shutdown dabao.')) return;
  await V.pc.shutdown(30);
  toast('Shutdown scheduled - 30s');
});
$('pc-cancel').addEventListener('click', async () => { await V.pc.cancelshutdown(); toast('Shutdown cancel'); });

/* ===== GITHUB ===== */
async function gitRun(args) {
  const dir = $('git-dir').value.trim();
  if (!dir) return toast('Repo folder ka path daalo');
  $('git-output').textContent = 'Running: git ' + args.join(' ') + '...';
  const r = await V.git.exec(dir, args);
  $('git-output').textContent = r.ok ? (r.output || '(no output)') : r.error;
}
$('git-choose').addEventListener('click', async () => { const d = await V.file.choosedir(); if (d) $('git-dir').value = d; });
$('git-status').addEventListener('click', () => gitRun(['status']));
$('git-add').addEventListener('click', () => gitRun(['add', '.']));
$('git-commit').addEventListener('click', async () => {
  const m = prompt('Commit message:');
  if (m) gitRun(['commit', '-m', '"' + m + '"']);
});
$('git-push').addEventListener('click', () => gitRun(['push']));
$('git-pull').addEventListener('click', () => gitRun(['pull']));
$('git-log').addEventListener('click', () => gitRun(['log', '--oneline', '-10']));

/* ===== BROWSER ===== */
$('browser-open').addEventListener('click', async () => {
  const u = $('browser-url').value.trim();
  if (!u) return toast('URL daalo');
  await V.browser.open(u);
});
$('browser-search').addEventListener('click', async () => {
  const q = $('browser-q').value.trim();
  if (!q) return toast('Search daalo');
  await V.browser.search(q);
});

/* ===== REMINDERS ===== */
async function loadReminders() {
  const list = await V.reminders.list();
  const el = $('reminders-list');
  el.innerHTML = '';
  if (!list.length) { el.innerHTML = '<div class="list-item"><span class="sub">Koi reminder nahi.</span></div>'; return; }
  list.forEach(r => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = '<input type="checkbox" ' + (r.done ? 'checked' : '') + '>' +
      '<span class="name" style="' + (r.done ? 'text-decoration:line-through;color:#64748b;' : '') + '">' + r.title + '</span>' +
      '<span class="sub">' + (r.when || '') + '</span>' +
      '<button class="btn-sm danger">Delete</button>';
    item.querySelector('input').addEventListener('change', async () => { await V.reminders.toggle(r.id); loadReminders(); });
    item.querySelector('button').addEventListener('click', async () => { await V.reminders.delete(r.id); loadReminders(); });
    el.appendChild(item);
  });
}
$('rem-add').addEventListener('click', async () => {
  const t = $('rem-title').value.trim(), w = $('rem-when').value;
  if (!t) return toast('Kya yaad rakhna hai?');
  await V.reminders.add(t, w);
  $('rem-title').value = '';
  loadReminders();
});

/* ===== CALENDAR ===== */
async function loadCalendar() {
  const list = await V.calendar.list();
  const el = $('calendar-list');
  el.innerHTML = '';
  if (!list.length) { el.innerHTML = '<div class="list-item"><span class="sub">Koi event nahi.</span></div>'; return; }
  list.forEach(c => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = '<span class="name">' + c.title + '</span><span class="sub">' + (c.date || '') + '</span><button class="btn-sm danger">Delete</button>';
    item.querySelector('button').addEventListener('click', async () => { await V.calendar.delete(c.id); loadCalendar(); });
    el.appendChild(item);
  });
}
$('cal-add').addEventListener('click', async () => {
  const t = $('cal-title').value.trim(), d = $('cal-date').value;
  if (!t) return toast('Event ka naam likho');
  await V.calendar.add(t, d);
  $('cal-title').value = '';
  loadCalendar();
});

/* ===== MEMORY ===== */
async function loadMemory() {
  const list = await V.memory.list();
  const el = $('memory-list');
  el.innerHTML = '';
  if (!list.length) { el.innerHTML = '<div class="list-item"><span class="sub">Memory khali hai.</span></div>'; return; }
  list.forEach(m => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = '<strong>' + m.key + ':</strong><span class="name">' + m.value + '</span><button class="btn-sm danger">Delete</button>';
    item.querySelector('button').addEventListener('click', async () => { await V.memory.delete(m.id); loadMemory(); });
    el.appendChild(item);
  });
}
$('mem-add').addEventListener('click', async () => {
  const k = $('mem-key').value.trim(), v = $('mem-value').value.trim();
  if (!k || !v) return toast('Key aur value dono daalo');
  await V.memory.add(k, v);
  $('mem-key').value = ''; $('mem-value').value = '';
  loadMemory();
});

/* ===== SETTINGS ===== */
async function loadStatus() {
  const s = await V.ai.status();
  $('chat-status').textContent = s.hasKey ? 'AI ready' : 'API key chahiye';
  $('chat-status').className = 'status-badge ' + (s.hasKey ? 'ok' : 'bad');
  $('settings-status').textContent = s.hasKey ? 'AI ready' : 'No key';
  $('settings-status').className = 'status-badge ' + (s.hasKey ? 'ok' : 'bad');
  $('key-status').textContent = s.hasKey ? 'Key set hai. Chat karo!' : 'Key set nahi hai. FREE key lo aur save karo.';
}
$('groq-link').addEventListener('click', (e) => { e.preventDefault(); V.browser.open('https://console.groq.com/keys'); });
$('save-key').addEventListener('click', async () => {
  const k = $('api-key').value.trim();
  if (!k) return toast('Key paste karo');
  await V.ai.setKey(k);
  $('api-key').value = '';
  toast('Key saved! Ab chat karo');
  loadStatus();
});

/* ===== INIT ===== */
(async function init() {
  loadStatus();
  loadFiles();
  loadNotes();
  loadReminders();
  loadCalendar();
  loadMemory();
  addMsg('bot', 'Namaste! Main VELO hoon. Kuch bhi puchho ya bolo "Hey Velo". Sab FREE hai. \u2764');
})();