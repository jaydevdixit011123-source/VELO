/* VELO v2 - renderer logic (Indian voice + mic fix) */
const $ = (id) => document.getElementById(id);
const V = window.velo;
let currentDir = null;
let ttsOn = true;

/* ===== INDIAN FEMALE VOICE SETUP ===== */
let indianVoice = null;
function findIndianVoice() {
  const voices = speechSynthesis.getVoices();
  const keywords = ['indian', 'hindi', 'heera', 'hemant', 'leela', 'veena', 'deepa'];
  for (const kw of keywords) {
    const match = voices.find(v => v.name.toLowerCase().includes(kw));
    if (match) { indianVoice = match; console.log('Found Indian voice:', match.name); return; }
  }
  const female = voices.find(v => v.name.toLowerCase().includes('female'));
  if (female) indianVoice = female;
}
speechSynthesis.onvoiceschanged = findIndianVoice;
findIndianVoice();

/* ===== TTS with Indian accent ===== */
async function speakIndian(text) {
  try {
    const url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=hi&q=' + encodeURIComponent(text.slice(0, 200));
    const ctx = new AudioContext();
    const resp = await fetch(url);
    const buffer = await resp.arrayBuffer();
    const decoded = await ctx.decodeAudioData(buffer);
    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.connect(ctx.destination);
    source.start();
  } catch (e1) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = indianVoice ? indianVoice.lang : 'en-IN';
      u.rate = 0.95;
      u.pitch = 1.15;
      if (indianVoice) u.voice = indianVoice;
      speechSynthesis.speak(u);
    } catch (e2) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-IN';
      speechSynthesis.speak(u);
    }
  }
}

function speak(text) { if (ttsOn && text) speakIndian(text); }

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2600);
}

/* ===== NAVIGATION ===== */
document.querySelectorAll('.nav-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
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
      speak(res.response);
    } else {
      addMsg('err', res.response);
      if (res.needsKey) toast('Settings me Groq API key daalo (free!)');
    }
  } catch (e) {
    typing.remove();
    addMsg('err', 'Error: ' + e.message);
  }
}
$('send-btn').addEventListener('click', function() { sendChat($('chat-input').value); });
$('chat-input').addEventListener('keydown', function(e) { if (e.key === 'Enter') sendChat($('chat-input').value); });

/* ===== VOICE CONTROL (MIC AUTO-RESTART FIX) ===== */
const voiceFab = $('voice-fab');
const voiceStatus = $('voice-status');
let listening = false;
let recognition = null;

function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.continuous = true;
  r.interimResults = true;
  r.lang = 'en-IN';
  r.maxAlternatives = 1;

  r.onresult = function(e) {
    let finalText = '';
    let interimText = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      else interimText += e.results[i][0].transcript;
    }
    if (finalText.trim()) {
      if (voiceStatus) voiceStatus.textContent = 'Suna: ' + finalText;
      if (detectWakeWord(finalText)) {
        const cmd = finalText.replace(/hey velo|hello velo|ok velo|velo/gi, '').trim();
        if (cmd) sendChat(cmd);
        else toast('Haan bolo, main sun rahi hoon!');
      } else {
        sendChat(finalText);
      }
    } else if (interimText && voiceStatus) {
      voiceStatus.textContent = '...' + interimText;
    }
  };

  r.onerror = function(e) {
    console.log('Speech error:', e.error);
    if (voiceStatus) voiceStatus.textContent = 'Mic: ' + e.error;
    if (listening && e.error !== 'not-allowed' && e.error !== 'service-not-allowed') {
      setTimeout(function() {
        try { r.start(); } catch(_) {}
      }, 800);
    }
    if (e.error === 'no-speech' && listening) {
      if (voiceStatus) voiceStatus.textContent = 'Sun rahi hoon...';
      setTimeout(function() {
        try { r.start(); } catch(_) {}
      }, 400);
    }
  };

  r.onend = function() {
    if (listening) {
      setTimeout(function() {
        try { r.start(); if (voiceStatus) voiceStatus.textContent = 'Sun rahi hoon...'; } catch(e) {}
      }, 250);
    }
  };

  r.onaudiostart = function() { if (voiceStatus) voiceStatus.textContent = 'Mic ON, bolo...'; };
  r.onsoundstart = function() { if (voiceStatus) voiceStatus.textContent = 'Awaz aa rahi hai...'; };

  return r;
}

function toggleVoice() {
  if (!recognition) recognition = initRecognition();
  if (!recognition) { toast('Speech API not supported'); return; }

  if (listening) {
    listening = false;
    try { recognition.stop(); } catch(e) {}
    voiceFab.classList.remove('listening');
    voiceFab.style.background = '#7c3aed';
    if (voiceStatus) voiceStatus.textContent = 'Voice band';
    toast('Mic band');
  } else {
    listening = true;
    try { recognition.start(); } catch(e) {}
    voiceFab.classList.add('listening');
    voiceFab.style.background = '#ef4444';
    if (voiceStatus) voiceStatus.textContent = 'Sun rahi hoon...';
    toast('Mic ON! Bolo kuch bhi...');
  }
}

voiceFab.addEventListener('click', toggleVoice);

function detectWakeWord(text) {
  const lower = text.toLowerCase();
  return lower.includes('hey velo') || lower.includes('hello velo') || lower.includes('ok velo');
}

/* ===== FILES ===== */
const fileList = $('file-list');
$('file-path').addEventListener('keydown', async function(e) {
  if (e.key === 'Enter') { currentDir = e.target.value.trim(); loadFiles(); }
});
$('file-search').addEventListener('input', async function() {
  const q = $('file-search').value.trim();
  if (!q) { loadFiles(); return; }
  fileList.innerHTML = '';
  const r = await V.file.search(q, currentDir);
  if (Array.isArray(r)) r.forEach(function(f) { renderFile(f); });
  else toast(r.error || 'Error');
});
async function loadFiles() {
  const r = await V.file.list(currentDir);
  fileList.innerHTML = '';
  if (Array.isArray(r)) r.forEach(function(f) { renderFile(f); });
  else toast(r.error || 'error');
}
function renderFile(f) {
  const div = document.createElement('div');
  div.className = 'file-item';
  div.innerHTML = '<span class="file-name">' + f.name + '</span><span class="file-type">' + (f.isDir ? 'folder' : 'file') + '</span>';
  div.addEventListener('click', function() {
    if (f.isDir) { currentDir = f.path; $('file-path').value = f.path; loadFiles(); }
  });
  fileList.appendChild(div);
}
loadFiles();

/* ===== NOTES ===== */
$('note-save').addEventListener('click', function() {
  const n = $('note-title').value.trim() || 'Untitled';
  const c = $('note-content').value.trim();
  if (!c) return;
  localStorage.setItem('velo_note_' + n, JSON.stringify({ title: n, content: c, date: new Date().toISOString() }));
  toast('Note saved!');
  loadNotes();
});
function loadNotes() {
  const list = $('notes-list');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith('velo_note_')) continue;
    try {
      const n = JSON.parse(localStorage.getItem(k));
      const div = document.createElement('div');
      div.className = 'note-item';
      div.innerHTML = '<strong>' + n.title + '</strong><small>' + new Date(n.date).toLocaleDateString() + '</small>';
      div.addEventListener('click', function() { $('note-title').value = n.title; $('note-content').value = n.content; });
      list.appendChild(div);
    } catch (e) {}
  }
}
loadNotes();

/* ===== PC CONTROL ===== */
if ($('app-input')) {
  $('app-input').addEventListener('keydown', async function(e) {
    if (e.key === 'Enter') { await V.pc.openapp(e.target.value.trim()); toast('Opening...'); e.target.value = ''; }
  });
}
if ($('screenshot-btn')) {
  $('screenshot-btn').addEventListener('click', async function() { await V.pc.screenshot(); toast('Screenshot done'); });
}
if ($('volume-slider')) {
  $('volume-slider').addEventListener('input', async function(e) { await V.pc.volume(e.target.value); });
}

/* ===== GITHUB ===== */
if ($('git-dir')) {
  $('git-dir').addEventListener('keydown', async function(e) {
    if (e.key === 'Enter') {
      $('git-output').textContent = 'Running...';
      const r = await V.git.exec(e.target.value.trim(), ['status']);
      $('git-output').textContent = typeof r === 'string' ? r : JSON.stringify(r);
    }
  });
}
if ($('git-commit')) {
  $('git-commit').addEventListener('click', async function() {
    const dir = $('git-dir').value.trim();
    const msg = $('git-msg').value.trim();
    if (!dir || !msg) return toast('Directory and message required');
    $('git-output').textContent = 'Committing...';
    await V.git.exec(dir, ['add', '.']);
    const r2 = await V.git.exec(dir, ['commit', '-m', msg]);
    $('git-output').textContent += '\n' + r2;
    toast('Committed!');
  });
}
if ($('git-push')) {
  $('git-push').addEventListener('click', async function() {
    const dir = $('git-dir').value.trim();
    if (!dir) return;
    $('git-output').textContent = 'Pushing...';
    const r = await V.git.exec(dir, ['push']);
    $('git-output').textContent += '\n' + r;
    toast('Pushed!');
  });
}

/* ===== BROWSER ===== */
if ($('browser-url')) {
  $('browser-url').addEventListener('keydown', async function(e) {
    if (e.key === 'Enter') {
      let url = e.target.value.trim();
      if (!url) return;
      if (!url.includes('://')) url = 'https://' + url;
      await V.browser.open(url);
      toast('Opening ' + url);
    }
  });
}
if ($('browser-search')) {
  $('browser-search').addEventListener('keydown', async function(e) {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      if (!q) return;
      await V.browser.search(q);
      toast('Searching...');
    }
  });
}

/* ===== REMINDERS ===== */
async function loadReminders() {
  const list = $('reminders-list');
  if (!list) return;
  list.innerHTML = '';
  const r = await V.reminders.list();
  if (!Array.isArray(r)) return;
  r.forEach(function(rem) {
    const div = document.createElement('div');
    div.className = 'reminder-item' + (rem.done ? ' done' : '');
    div.innerHTML = '<span>' + (rem.done ? '[x]' : '[ ]') + ' ' + rem.title + '</span><small>' + (rem.time || '') + '</small>';
    div.addEventListener('click', async function() { await V.reminders.toggle(rem.id); loadReminders(); });
    list.appendChild(div);
  });
}
if ($('reminder-add')) {
  $('reminder-add').addEventListener('click', async function() {
    const t = $('reminder-title').value.trim();
    if (!t) return;
    await V.reminders.add(t, '', '');
    $('reminder-title').value = '';
    loadReminders();
    toast('Reminder added');
  });
}
loadReminders();

/* ===== CALENDAR ===== */
async function loadCalendar() {
  const list = $('calendar-list');
  if (!list) return;
  list.innerHTML = '';
  const r = await V.calendar.list();
  if (!Array.isArray(r)) return;
  r.forEach(function(ev) {
    const div = document.createElement('div');
    div.className = 'calendar-item';
    div.innerHTML = '<strong>' + ev.title + '</strong><small>' + (ev.date || '') + '</small>';
    list.appendChild(div);
  });
}
if ($('calendar-add')) {
  $('calendar-add').addEventListener('click', async function() {
    const t = $('calendar-title').value.trim();
    const d = $('calendar-date').value;
    if (!t) return;
    await V.calendar.add(t, d, '');
    $('calendar-title').value = '';
    loadCalendar();
    toast('Event added');
  });
}
loadCalendar();

/* ===== MEMORY ===== */
async function loadMemory() {
  const list = $('memory-list');
  if (!list) return;
  list.innerHTML = '';
  const r = await V.memory.get();
  if (!Array.isArray(r)) return;
  r.forEach(function(m) {
    const div = document.createElement('div');
    div.className = 'memory-item';
    div.innerHTML = '<strong>' + m.key + '</strong><span>' + m.value + '</span>';
    list.appendChild(div);
  });
}
loadMemory();

/* ===== SETTINGS (GROQ, not Gemini!) ===== */
if ($('settings-save')) {
  $('settings-save').addEventListener('click', async function() {
    const key = $('api-key').value.trim();
    if (!key) return toast('Pehle Groq API key daalo!');
    await V.ai.setKey(key);
    toast('Groq API key saved!');
    checkAIStatus();
  });
}

async function checkAIStatus() {
  const st = await V.ai.status();
  const badge = $('chat-status');
  if (badge) {
    badge.textContent = st.hasKey ? 'AI ready (Groq)' : 'Need Groq API key';
    badge.className = 'status-badge ' + (st.hasKey ? 'ok' : 'warn');
  }
}
checkAIStatus();

/* ===== TTS TOGGLE ===== */
if ($('tts-toggle')) {
  $('tts-toggle').addEventListener('click', function() {
    ttsOn = !ttsOn;
    $('tts-toggle').textContent = ttsOn ? 'Voice ON' : 'Voice OFF';
    $('tts-toggle').className = ttsOn ? '' : 'muted';
    toast(ttsOn ? 'Indian voice ON' : 'Voice OFF');
  });
}

console.log('VELO v2.1 ready - Indian girl voice + mic auto-restart fix!');
